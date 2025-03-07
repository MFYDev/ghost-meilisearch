import { Handler } from '@netlify/functions';

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
    
    // For Node.js, we can use the crypto module
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
  private ghostKey: string;
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
    this.ghostKey = config.ghost.key;
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
    const url = new URL(`${this.ghostUrl}/ghost/api/content/posts/${postId}/`);
    
    // Add query parameters
    url.searchParams.append('key', this.ghostKey);
    url.searchParams.append('include', 'tags,authors');
    url.searchParams.append('cache', cacheBuster.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Version': this.ghostVersion
      }
    });
    
    if (!response.ok) {
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
    
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      html: post.html,
      excerpt: post.excerpt || '',
      url: post.url,
      feature_image: post.feature_image,
      published_at: publishedAt,
      updated_at: updatedAt,
      tags,
      authors
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

    // Load configuration
    const requiredVars = ['GHOST_URL', 'GHOST_KEY', 'MEILISEARCH_HOST', 'MEILISEARCH_API_KEY'];
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
        key: process.env.GHOST_KEY || '',
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
        
        if (status === 'published' && visibility === 'public') {
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
              message: `Post ${postId} removed from index (not published/public)` 
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