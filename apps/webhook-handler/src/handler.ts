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
    const current = post.current;
    const previous = post.previous;

    // Post is published and public
    if (current && current.status === 'published' && current.visibility === 'public') {
      // If it was previously not published or not public, it's a publication
      if (!previous || previous.status !== 'published' || previous.visibility !== 'public') {
        return 'post.published';
      }
      // Otherwise it's an update
      return 'post.updated';
    }

    // Post was published but is now unpublished
    if (previous && previous.status === 'published' && previous.visibility === 'public' &&
        current && (current.status !== 'published' || current.visibility !== 'public')) {
      return 'post.unpublished';
    }

    // Default to updated
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
    if (webhookEventType === 'post.published' || 
        (webhookEventType === 'post.updated' && isPublishedAndPublic(payload.post?.current))) {
      
      // Index the post
      await withTimeout(
        manager.indexPost(postId),
        OPERATION_TIMEOUT,
        `Indexing post ${postId}`
      );
      
    } else if (webhookEventType === 'post.deleted' || 
               webhookEventType === 'post.unpublished' ||
               (payload.post?.previous?.id && (!payload.post?.current || Object.keys(payload.post.current).length === 0)) ||
               (payload.post?.current && !isPublishedAndPublic(payload.post.current))) {
      
      // Delete the post from the index
      await withTimeout(
        manager.deletePost(postId),
        OPERATION_TIMEOUT,
        `Deleting post ${postId}`
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        postId,
        action: webhookEventType
      })
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