import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Set the runtime to edge for better performance
export const runtime = 'edge';

// Interface for webhook payload
interface WebhookPayload {
  id?: string;
  post?: {
    id?: string;
    current?: {
      id?: string;
      status?: string;
      visibility?: string;
      [key: string]: unknown;
    };
    previous?: {
      id?: string;
      status?: string;
      visibility?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Extract post ID from the payload, handling different event types
function extractPostId(payload: WebhookPayload): string | undefined {
  return payload.post?.current?.id || payload.post?.previous?.id || payload.post?.id || payload.id;
}

// Determine the event type from the payload structure
function determineEventType(payload: WebhookPayload): string {
  // Check for deletion (empty current, previous has data)
  if (payload.post?.previous?.id && (!payload.post.current || Object.keys(payload.post.current).length === 0)) {
    return 'post.deleted';
  }
  
  // Check for standard deletion
  if (payload.post?.id && !payload.post.current) {
    return 'post.deleted';
  }
  
  // Handle normal post events
  if (payload.post?.current) {
    const { post } = payload;
    
    // If we have a current post, it's either an add or update
    if (!post.previous || Object.keys(post.previous).length === 0) {
      return 'post.added';
    }
    
    // If we have both current and previous, it's an update
    return 'post.updated';
  }
  
  // Default fallback
  return 'unknown';
}

// Verify webhook signature
async function verifyWebhookSignature(signature: string, body: string, secret: string): Promise<boolean> {
  try {
    // Ghost signature format is "sha256=hash, t=timestamp"
    const [signaturePart, timestampPart] = signature.split(', ');
    if (!signaturePart || !timestampPart) {
      console.error('Invalid signature format');
      return false;
    }

    const [, providedSignature] = signaturePart.split('=');
    const [, timestamp] = timestampPart.split('=');
    
    if (!providedSignature || !timestamp) {
      console.error('Could not extract signature or timestamp');
      return false;
    }

    // Create message by combining stringified body and timestamp
    const message = `${body}${timestamp}`;
    
    // Use the Web Crypto API
    const encoder = new TextEncoder();
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Create a digest of the message using the secret
    const signedData = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(message)
    );
    
    // Convert the digest to a hex string
    const computedSignature = Array.from(new Uint8Array(signedData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('Provided signature:', providedSignature);
    console.log('Computed signature:', computedSignature);
    
    return providedSignature === computedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Check if a post is published and public
function isPublishedAndPublic(postData: { status?: string; visibility?: string } | undefined): boolean {
  return postData?.status === 'published' && postData?.visibility === 'public';
}

// GhostMeilisearchManager for Next.js API routes
class GhostMeilisearchManager {
  private ghostUrl: string;
  private ghostKey: string;
  private ghostVersion: string;
  private meilisearchHost: string;
  private meilisearchApiKey: string;
  private indexName: string;

  constructor(config: {
    ghost: { url: string; key: string; version: string };
    meilisearch: { host: string; apiKey: string; timeout: number };
    index: { name: string; primaryKey: string; fields: any[] };
  }) {
    this.ghostUrl = config.ghost.url;
    this.ghostKey = config.ghost.key; // This will now be the Admin API Key
    this.ghostVersion = config.ghost.version;
    this.meilisearchHost = config.meilisearch.host;
    this.meilisearchApiKey = config.meilisearch.apiKey;
    this.indexName = config.index.name;
  }

  /**
   * Fetch a post from Ghost API
   */
  private async fetchPost(postId: string): Promise<any> {
    const cacheBuster = Date.now();
    // Use Admin API endpoint
    const url = new URL(`${this.ghostUrl}/ghost/api/admin/posts/${postId}/`);
    
    // Add query parameters (Admin API uses different params, 'formats' needed for plaintext/html)
    url.searchParams.append('include', 'tags,authors');
    url.searchParams.append('formats', 'html,plaintext'); // Request formats needed for excerpt/plaintext
    url.searchParams.append('cache', cacheBuster.toString()); // Cache buster might not be needed/respected by Admin API but harmless

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Version': this.ghostVersion,
        // Use Authorization header for Admin API Key
        'Authorization': `Ghost ${this.ghostKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
    }
    
    // Admin API returns the post directly in the 'posts' array
    const data = await response.json() as { posts: any[] };
    if (!data.posts || !Array.isArray(data.posts) || data.posts.length === 0) {
      throw new Error(`No post found with ID: ${postId}`);
    }
    return data.posts[0];
  }

  /**
   * Transform a Ghost post to the format expected by Meilisearch
   */
  private transformPost(post: any): any {
    if (!post) {
      throw new Error('Post data is missing or invalid');
    }

    // Extract tags and authors
    const tags = post.tags?.map((tag: any) => tag.name) || [];
    const authors = post.authors?.map((author: any) => author.name) || [];
    
    // Convert dates to timestamps
    const publishedAt = post.published_at ? new Date(post.published_at).getTime() : null;
    const updatedAt = post.updated_at ? new Date(post.updated_at).getTime() : null;
    
    // Generate plaintext from HTML
    let plaintext = '';
    if (post.html) {
      try {
        // Load HTML into cheerio
        const $ = cheerio.load(post.html);
        
        // Remove script and style tags with their content
        $('script, style').remove();
        
        // Extract alt text from images and add it to the text
        $('img').each((_, el) => {
          const alt = $(el).attr('alt');
          if (alt) {
            $(el).replaceWith(` ${alt} `);
          } else {
            $(el).remove();
          }
        });
        
        // Handle special block elements for better formatting
        // Add line breaks for block elements to preserve structure
        $('p, div, h1, h2, h3, h4, h5, h6, br, hr, blockquote').each((_, el) => {
          $(el).append('\n');
        });
        
        // Special handling for list items
        $('li').each((_, el) => {
          $(el).prepend('• ');
          $(el).append('\n');
        });
        
        // Handle tables - add spacing and structure
        $('tr').each((_, el) => {
          $(el).append('\n');
        });
        
        // Handle links - keep their text
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          // If the link has text and it's not just the URL, preserve it
          if (text && href !== text) {
            $(el).replaceWith(` ${text} `);
          }
        });
        
        // Get the text content of the body
        // Cheerio's text() method automatically handles most HTML entities
        plaintext = $('body').text();
        
        // Normalize whitespace
        plaintext = plaintext.replace(/\s+/g, ' ').trim();
      } catch (error) {
        // Fallback to simple regex if cheerio parsing fails
        console.error('HTML parsing error:', error);
        
        plaintext = post.html
          // Remove script and style tags with their content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          // Replace link text with its content, preserving spaces
          .replace(/<a[^>]*>([^<]*)<\/a>/gi, ' $1 ')
          // Replace inline elements with their content, preserving spaces
          .replace(/<(strong|b|em|i|mark|span)[^>]*>([^<]*)<\/(strong|b|em|i|mark|span)>/gi, ' $2 ')
          // Replace all remaining HTML tags with spaces to preserve word boundaries
          .replace(/<[^>]*>/g, ' ')
          // Clean up entities and decode HTML entities
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Normalize whitespace
          .replace(/\s+/g, ' ').trim();
      }
    }
    
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      html: post.html,
      plaintext: plaintext,
      excerpt: post.excerpt || '',
      url: post.url,
      feature_image: post.feature_image,
      published_at: publishedAt,
      updated_at: updatedAt,
      tags,
      authors,
      visibility: post.visibility || 'public' // Add visibility, default to public if missing
    };
  }

  /**
   * Index a post in Meilisearch
   */
  async indexPost(postId: string): Promise<void> {
    try {
      // Add a small delay to ensure Ghost API returns the latest content
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch the post from Ghost
      const post = await this.fetchPost(postId);
      
      // Transform the post
      const document = this.transformPost(post);
      
      // Add the document to Meilisearch
      const url = new URL(`${this.meilisearchHost}/indexes/${this.indexName}/documents`);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.meilisearchApiKey}`
        },
        body: JSON.stringify([document])
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(`Meilisearch error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error indexing post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a post from Meilisearch
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const url = new URL(`${this.meilisearchHost}/indexes/${this.indexName}/documents/${postId}`);
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.meilisearchApiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(`Meilisearch error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error deleting post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// POST handler for the webhook
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Make sure we have a request body
  const body = await request.text();
  if (!body) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
  }

  // Verify webhook signature if a secret is provided
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get('x-ghost-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    if (!(await verifyWebhookSignature(signature, body, webhookSecret))) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
  }

  try {
    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body) as WebhookPayload;
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON payload', 
        details: parseError instanceof Error ? parseError.message : 'Unknown error' 
      }, { status: 400 });
    }

    // Extract post ID and determine event type
    const postId = extractPostId(payload);
    if (!postId) {
      return NextResponse.json({ error: 'Could not extract post ID from payload' }, { status: 400 });
    }

    const eventType = determineEventType(payload);
    console.log(`Event type: ${eventType}, Post ID: ${postId}`);

    // Check required environment variables - Require Admin API Key now
    const requiredVars = ['GHOST_URL', 'GHOST_ADMIN_API_KEY', 'MEILISEARCH_HOST', 'MEILISEARCH_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json({ 
        error: 'Missing configuration', 
        details: `Missing required environment variables: ${missingVars.join(', ')}` 
      }, { status: 500 });
    }

    // Create configuration from environment variables
    const config = {
      ghost: {
        url: process.env.GHOST_URL || '',
        key: process.env.GHOST_ADMIN_API_KEY || '', // Use Admin API Key
        version: process.env.GHOST_VERSION || 'v5.0'
      },
      meilisearch: {
        host: process.env.MEILISEARCH_HOST || '',
        apiKey: process.env.MEILISEARCH_API_KEY || '',
        timeout: 5000
      },
      index: {
        name: process.env.MEILISEARCH_INDEX_NAME || 'ghost_posts',
        primaryKey: 'id',
        fields: [] // Add empty fields array to satisfy type requirements
      }
    };

    // Initialize the manager
    const manager = new GhostMeilisearchManager(config);

    // Process the event based on its type
    if (eventType === 'post.deleted') {
      // Handle post deletion
      await withTimeout(
        manager.deletePost(postId),
        30000,
        'Delete post'
      );
      return NextResponse.json({ success: true, message: `Post ${postId} deleted from index` });
    } else if (['post.added', 'post.updated'].includes(eventType)) {
      // Simplified post event handling
      if (payload.post?.current) {
        const { id, status, visibility, title } = payload.post.current;
        console.log(`📄 Processing post: "${title || 'Untitled'}" (${id || postId})`);
        
        if (status === 'published') { // Index all published posts, regardless of visibility
          console.log('📝 Indexing published post');
          await withTimeout(
            manager.indexPost(postId),
            30000,
            'Index post'
          );
          console.log('✨ Post indexed successfully');
          return NextResponse.json({ 
            success: true, 
            message: `Post ${postId} indexed successfully` 
          });
        } else {
          console.log('🗑️ Removing unpublished/private post');
          await withTimeout(
            manager.deletePost(postId),
            30000,
            'Delete post'
          );
          console.log('✨ Post removed successfully');
          return NextResponse.json({ 
            success: true, 
            message: `Post ${postId} removed from index (not published)`
          });
        }
      } else {
        return NextResponse.json({ 
          warning: `Post data missing in payload`, 
          message: 'No action taken' 
        });
      }
    } else {
      // Unknown event type
      return NextResponse.json({ 
        warning: `Unknown event type: ${eventType}`, 
        message: 'No action taken' 
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Error processing webhook', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 