import { Handler } from '@netlify/functions';
import { loadConfig, validateConfig } from '@fanyangmeng/ghost-meilisearch-config';
import { GhostMeilisearchManager } from '@fanyangmeng/ghost-meilisearch-core';
import crypto from 'crypto';

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

// Load configuration from environment variables
function getConfigFromEnv() {
  const config = {
    ghost: {
      url: process.env.GHOST_URL,
      key: process.env.GHOST_KEY,
      version: process.env.GHOST_VERSION || 'v5.0'
    },
    meilisearch: {
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_API_KEY,
      timeout: parseInt(process.env.MEILISEARCH_TIMEOUT || '5000', 10)
    },
    index: {
      name: process.env.MEILISEARCH_INDEX_NAME || 'ghost_posts',
      primaryKey: 'id'
    }
  };

  return validateConfig(config);
}

// Verify webhook signature
function verifyWebhookSignature(signature: string, body: string, secret: string): boolean {
  try {
    // Ghost signature format is "sha256=hash, t=timestamp"
    const [signaturePart, timestampPart] = signature.split(', ');
    const [, providedSignature] = signaturePart.split('=');
    const [, timestamp] = timestampPart.split('=');

    // Create message by combining stringified body and timestamp
    const message = `${body}${timestamp}`;
    
    // Create HMAC using the secret and message
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const computedSignature = hmac.digest('hex');
    
    return providedSignature === computedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Add timeout to a promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Check if a post is published and public
function isPublishedAndPublic(postData: { status?: string; visibility?: string } | undefined): boolean {
  return !!postData && postData.status === 'published' && postData.visibility === 'public';
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

    // Get configuration and initialize manager
    const config = getConfigFromEnv();
    const manager = new GhostMeilisearchManager(config);

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
              message: `Post ${postId} removed from index (not published or not public)` 
            })
          };
        }
      } else {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            warning: `Post data missing in payload`, 
            message: 'No action taken' 
          })
        };
      }
    } else {
      // Unknown event type
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          warning: `Unknown event type: ${webhookEventType}`, 
          message: 'No action taken' 
        })
      };
    }
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