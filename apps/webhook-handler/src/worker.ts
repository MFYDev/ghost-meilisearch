// Environment variables interface for the Cloudflare Worker
// Import cheerio for HTML to plaintext conversion
import * as cheerio from 'cheerio';
import * as jose from 'jose'; // Import jose for JWT generation

interface Env {
  /**
   * Secret key for verifying webhook signatures
   */
  WEBHOOK_SECRET?: string;

  /**
   * Ghost blog URL
   */
  GHOST_URL?: string;

  /**
   * Ghost Admin API key
   */
  GHOST_ADMIN_API_KEY?: string; // Changed from GHOST_KEY

  /**
   * Ghost API version
   */
  GHOST_VERSION?: string;

  /**
   * Meilisearch host URL
   */
  MEILISEARCH_HOST?: string;

  /**
   * Meilisearch API key
   */
  MEILISEARCH_API_KEY?: string;

  /**
   * Meilisearch index name
   */
  MEILISEARCH_INDEX_NAME?: string;

  /**
   * JSON string containing the Ghost Meilisearch configuration (legacy)
   */
  GHOST_MEILISEARCH_CONFIG?: string;
}

// Reuse the same interfaces and helper functions from handler.ts
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

    // For Cloudflare Workers, we need to use the Web Crypto API
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

// Helper function to generate Ghost Admin API JWT using jose (Edge compatible)
async function generateAdminToken(apiKey: string): Promise<string> {
  const [id, secret] = apiKey.split(':');
  if (!id || !secret) {
    throw new Error('Invalid Ghost Admin API Key format');
  }

  // Convert hex secret to Uint8Array for Web Crypto API
  const secretBytes = new Uint8Array(secret.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const alg = 'HS256';

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg, kid: id })
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('/admin/')
    .sign(secretBytes);

  return jwt;
}

// CloudflareGhostMeilisearchManager - A simplified version of GhostMeilisearchManager that uses fetch API
class CloudflareGhostMeilisearchManager {
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

    // Generate the JWT
    const token = await generateAdminToken(this.ghostKey);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Version': this.ghostVersion,
        // Use Authorization header with the generated JWT
        'Authorization': `Ghost ${token}`
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
   * Helper function to extract and clean text from HTML content using Cheerio.
   * Applies basic cleaning and structural formatting.
   */
  private extractAndCleanText(htmlContent: string | null | undefined): string {
    if (!htmlContent) {
      return '';
    }

    try {
      const $ = cheerio.load(htmlContent);

      // Remove script and style tags
      $('script, style').remove();

      // Handle images - replace with alt text or remove
      $('img').each((_, el) => {
        const alt = $(el).attr('alt');
        if (alt) {
          $(el).replaceWith(` ${alt} `);
        } else {
          $(el).remove();
        }
      });

      // Handle links - keep text content
       $('a').each((_, el) => {
         const href = $(el).attr('href');
         const text = $(el).text().trim();
         // If the link has text and it's not just the URL, preserve it
         if (text && href !== text) {
           $(el).replaceWith(` ${text} `);
         }
         // If link text is same as href or empty, cheerio's text() will handle it.
       });

      // Add structural newlines for block elements
      $('p, div, h1, h2, h3, h4, h5, h6, br, hr, blockquote').each((_, el) => {
        $(el).append('\n');
      });
      $('li').each((_, el) => {
        $(el).prepend('• ');
        $(el).append('\n');
      });
      $('tr').each((_, el) => {
        $(el).append('\n');
      });

      // Get text and normalize whitespace
      let text = $('body').text(); // Use body context if available, else root
      text = text.replace(/\s+/g, ' ').trim();
      return text;

    } catch (error) {
      console.error('Cheerio parsing error during text extraction:', error);
      // Fallback to basic regex cleaning if Cheerio fails
      return htmlContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<a[^>]*>([^<]*)<\/a>/gi, ' $1 ')
        .replace(/<(strong|b|em|i|mark|span)[^>]*>([^<]*)<\/(strong|b|em|i|mark|span)>/gi, ' $2 ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/\s+/g, ' ').trim();
    }
  }

  /**
   * Transform a Ghost post to the format expected by Meilisearch
   */
  private transformPost(post: any): any {
    if (!post) {
      throw new Error('Post data is missing or invalid');
    }

    let plaintext_public: string | null = null;
    let plaintext_private: string | null = null;
    const visibility = post.visibility || 'public'; // Default to public
    const dividerSelector = '<!--members-only-->';

    if (post.html) {
      if (visibility === 'public') {
        // Public post: Extract all content as public
        plaintext_public = this.extractAndCleanText(post.html);
        plaintext_private = null;
      } else {
        // Non-public post: Check for divider
        try {
          // Check if the HTML contains the comment divider
          if (post.html.includes(dividerSelector)) {
            // Divider found: Split content
            const parts = post.html.split(dividerSelector);
            
            // Extract text from parts
            plaintext_public = this.extractAndCleanText(parts[0]);
            plaintext_private = this.extractAndCleanText(parts[1]);
          } else {
            // No divider found: Index all as private
            plaintext_public = null;
            plaintext_private = this.extractAndCleanText(post.html);
          }
        } catch (error) {
           console.error(`Error processing HTML for post ${post.id}:`, error);
           // Fallback: Treat as non-public without divider
           plaintext_public = null;
           plaintext_private = this.extractAndCleanText(post.html); // Use helper for fallback too
        }
      }
    } else {
      // Handle case where post.html is empty or null
      // Use existing plaintext if available, otherwise nulls
      const existingPlaintext = (post as any).plaintext || '';
      if (visibility === 'public') {
          plaintext_public = existingPlaintext || null;
          plaintext_private = null;
      } else {
          plaintext_public = null;
          plaintext_private = existingPlaintext || null;
      }
    }

    // Extract tags and authors
    const tags = post.tags?.map((tag: any) => tag.name) || [];
    const authors = post.authors?.map((author: any) => author.name) || [];

    // Convert dates to timestamps
    const publishedAt = post.published_at ? new Date(post.published_at).getTime() : null;
    const updatedAt = post.updated_at ? new Date(post.updated_at).getTime() : null;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      html: post.html,
      plaintext_public: plaintext_public, // Use new field
      plaintext_private: plaintext_private, // Use new field
      excerpt: post.excerpt || '',
      url: post.url,
      feature_image: post.feature_image,
      published_at: publishedAt,
      updated_at: updatedAt,
      tags,
      authors,
      visibility: visibility // Use the determined visibility
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

// Cloudflare Worker handler
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Make sure we have a request body
    const body = await request.text();
    if (!body) {
      return new Response(JSON.stringify({ error: 'Missing request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify webhook signature if a secret is provided
    const webhookSecret = env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-ghost-signature');
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing webhook signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!(await verifyWebhookSignature(signature, body, webhookSecret))) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    try {
      // Parse payload
      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body) as WebhookPayload;
      } catch (parseError) {
        return new Response(JSON.stringify({
          error: 'Invalid JSON payload',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Extract post ID and determine event type
      const postId = extractPostId(payload);
      if (!postId) {
        return new Response(JSON.stringify({ error: 'Could not extract post ID from payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const eventType = determineEventType(payload);
      console.log(`Event type: ${eventType}, Post ID: ${postId}`);

      // Check required environment variables - Require Admin API Key now
      const requiredVars = ['GHOST_URL', 'GHOST_ADMIN_API_KEY', 'MEILISEARCH_HOST', 'MEILISEARCH_API_KEY'];
      const missingVars = requiredVars.filter(varName => {
        switch(varName) {
          case 'GHOST_URL': return !env.GHOST_URL;
          case 'GHOST_ADMIN_API_KEY': return !env.GHOST_ADMIN_API_KEY; // Check for Admin Key
          case 'MEILISEARCH_HOST': return !env.MEILISEARCH_HOST;
          case 'MEILISEARCH_API_KEY': return !env.MEILISEARCH_API_KEY;
          default: return true;
        }
      });

      if (missingVars.length > 0) {
        return new Response(JSON.stringify({
          error: 'Missing configuration',
          details: `Missing required environment variables: ${missingVars.join(', ')}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create configuration from environment variables
      const config = {
        ghost: {
          url: env.GHOST_URL || '',
          key: env.GHOST_ADMIN_API_KEY || '', // Use Admin API Key
          version: env.GHOST_VERSION || 'v5.0'
        },
        meilisearch: {
          host: env.MEILISEARCH_HOST || '',
          apiKey: env.MEILISEARCH_API_KEY || '',
          timeout: 5000
        },
        index: {
          name: env.MEILISEARCH_INDEX_NAME || 'ghost_posts',
          primaryKey: 'id',
          fields: [] // Add empty fields array to satisfy type requirements
        }
      };

      // Initialize the manager
      const manager = new CloudflareGhostMeilisearchManager(config);

      // Set operation timeout (slightly less than typical worker limits)
      const OPERATION_TIMEOUT = 25000; // e.g., 25 seconds

      // Handle different event types
      if (eventType === 'post.deleted') {
        // Delete the post from the index
        await withTimeout(
          manager.deletePost(postId),
          OPERATION_TIMEOUT,
          `Deleting post ${postId}`
        );

        return new Response(JSON.stringify({ success: true, message: `Post ${postId} deleted from index` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (['post.added', 'post.updated'].includes(eventType)) {
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

            return new Response(JSON.stringify({ success: true, message: `Post ${postId} indexed successfully` }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            console.log('🗑️ Removing unpublished/private post');
            await withTimeout(
              manager.deletePost(postId),
              OPERATION_TIMEOUT,
              `Deleting post ${postId}`
            );
            console.log('✨ Post removed successfully');

            return new Response(JSON.stringify({ success: true, message: `Post ${postId} removed from index (not published)` }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } else {
          return new Response(JSON.stringify({
            warning: `Post data missing in payload`,
            payload: payload // Include payload for debugging
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Ignore other event types
        return new Response(JSON.stringify({ success: true, message: `Event type ${eventType} ignored` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
