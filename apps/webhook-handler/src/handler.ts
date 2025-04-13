import { Handler } from '@netlify/functions';
import * as cheerio from 'cheerio';
import * as jwt from 'jsonwebtoken'; // Import jsonwebtoken
import * as crypto from 'crypto'; // Import crypto for signature verification

// Webhook payload interface with essential fields
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
function verifyWebhookSignature(signature: string, body: string, secret: string): boolean {
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
    
    // Use the crypto module (already imported)
    const hmac = require('crypto').createHmac('sha256', secret);
    hmac.update(message);
    const computedSignature = hmac.digest('hex');
    
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

// NetlifyGhostMeilisearchManager - A simplified version that uses fetch API
class NetlifyGhostMeilisearchManager {
  private ghostUrl: string;
  private ghostAdminApiKey: string; // Store the full Admin API Key
  private ghostVersion: string;
  private meilisearchHost: string;
  private meilisearchApiKey: string;
  private indexName: string;

  constructor(config: {
    ghost: { url: string; key: string; version: string };
    meilisearch: { host: string; apiKey: string; timeout: number };
    index: { name: string; primaryKey: string };
  }) {
    this.ghostUrl = config.ghost.url;
    this.ghostAdminApiKey = config.ghost.key; // Store the Admin API Key
    this.ghostVersion = config.ghost.version;
    this.meilisearchHost = config.meilisearch.host;
    this.meilisearchApiKey = config.meilisearch.apiKey;
    this.indexName = config.index.name;
  }

  /**
   * Generate Ghost Admin API JWT
   */
  private generateJwt(): string {
    const [id, secret] = this.ghostAdminApiKey.split(':');
    if (!id || !secret) {
      throw new Error('Invalid GHOST_ADMIN_API_KEY format. Expected id:secret');
    }
    try {
      const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: `/admin/`
      });
      return token;
    } catch (err) {
      console.error("JWT Generation Error:", err);
      throw new Error('Failed to generate Admin API JWT');
    }
  }

  /**
   * Fetch a post from Ghost Admin API using JWT
   */
  private async fetchPost(postId: string): Promise<any> {
    const url = new URL(`${this.ghostUrl}/ghost/api/admin/posts/${postId}/`);
    
    // Add query parameters
    url.searchParams.append('include', 'tags,authors');
    url.searchParams.append('formats', 'html,plaintext');

    // Generate JWT for authorization
    const token = this.generateJwt();

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Version': this.ghostVersion,
        'Authorization': `Ghost ${token}` // Use JWT here
      }
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Ghost API Error:", errorBody);
      throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
    }
    
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

// Netlify function handler
export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Make sure we have a request body
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body' })
    };
  }

  // Verify webhook signature if a secret is provided
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = event.headers['x-ghost-signature'];
    if (!signature) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing webhook signature' })
      };
    }

    if (!verifyWebhookSignature(signature, event.body, webhookSecret)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid webhook signature' })
      };
    }
  }

  try {
    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(event.body) as WebhookPayload;
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid JSON payload', 
          details: parseError instanceof Error ? parseError.message : 'Unknown error' 
        })
      };
    }
    
    // Determine the event type and extract post ID
    const webhookEventType = determineEventType(payload);
    const postId = extractPostId(payload);

    // Check if we have a valid post ID
    if (!postId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payload structure: no post ID found' })
      };
    }

    // Load configuration - Require Admin API Key now
    const requiredVars = ['GHOST_URL', 'GHOST_ADMIN_API_KEY', 'MEILISEARCH_HOST', 'MEILISEARCH_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
    if (missingVars.length > 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Missing configuration', 
          details: `Missing required environment variables: ${missingVars.join(', ')}` 
        })
      };
    }

    // Create configuration
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
        primaryKey: 'id'
      }
    };

    // Initialize the manager
    const manager = new NetlifyGhostMeilisearchManager(config);

    // Set operation timeout (slightly less than Netlify's 10s timeout)
    const OPERATION_TIMEOUT = 8000;

    // Handle different event types
    if (webhookEventType === 'post.deleted') {
      // Delete the post from the index
      await withTimeout(
        manager.deletePost(postId),
        OPERATION_TIMEOUT,
        `Deleting post ${postId}`
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `Post ${postId} deleted from index` })
      };
    } else if (['post.added', 'post.updated'].includes(webhookEventType)) {
      // Simplified post event handling
      if (payload.post?.current) {
        const { id, status, visibility, title } = payload.post.current;
        console.log(`📄 Processing post: "${title || 'Untitled'}" (${id || postId})`);
        
        if (status === 'published') { // Index all published posts, regardless of visibility
          console.log('📝 Indexing published post');
          await withTimeout(
            manager.indexPost(postId),
            OPERATION_TIMEOUT,
            `Indexing post ${postId}`
          );
          console.log('✨ Post indexed successfully');
          
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: `Post ${postId} indexed successfully` })
          };
        } else {
          console.log('🗑️ Removing unpublished/private post');
          await withTimeout(
            manager.deletePost(postId),
            OPERATION_TIMEOUT,
            `Deleting post ${postId}`
          );
          console.log('✨ Post removed successfully');
          
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              success: true, 
              message: `Post ${postId} removed from index (not published)`
            })
          };
        }
      }
    }

    // Handle unknown event types
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Unknown or unsupported event type: ${webhookEventType}` })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};