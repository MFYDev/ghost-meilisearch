import { Handler } from '@netlify/functions';
import { loadConfig, validateConfig } from '@fanyangmeng/ghost-meilisearch-config';
import { GhostMeilisearchManager } from '@fanyangmeng/ghost-meilisearch-core';
import crypto from 'crypto';

// Webhook payload interface - extended to be more flexible
interface WebhookPayload {
  id?: string;
  post?: {
    id?: string;
    current?: {
      id?: string;
      status?: string;
      visibility?: string;
      title?: string;
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
function extractPostId(payload: any): string | undefined {
  // For deletion events where previous exists but current is empty or missing the id
  if (payload.post?.previous?.id && Object.keys(payload.post?.current || {}).length === 0) {
    console.log('Detected deletion event (empty current, id in previous)');
    return payload.post.previous.id;
  }
  
  // For standard post events
  if (payload.post?.current?.id) {
    return payload.post.current.id;
  }
  
  // For deletion events where previous exists but current might be missing the id
  if (payload.post?.previous?.id) {
    console.log('Detected potential deletion/update event (id in previous)');
    return payload.post.previous.id;
  }
  
  // For deletion events
  if (payload.post?.id) {
    return payload.post.id;
  }
  
  // For post.deleted events where the structure might be different
  if (payload.id) {
    return payload.id;
  }
  
  // Log a warning that we couldn't find an ID
  console.log('Could not find any ID in the payload structure');
  return undefined;
}

// Determine the event type from the payload
function determineEventType(payload: any): string {
  // Special case for deletion: current is empty and previous has content
  if (payload.post?.previous?.id && 
      Object.keys(payload.post?.current || {}).length === 0) {
    console.log('Detected deletion pattern: empty current, previous with data');
    return 'post.deleted';
  }
  
  // Check if this is a deletion event
  if (payload.post?.id && !payload.post.current) {
    return 'post.deleted';
  }
  
  // Handle normal post events
  if (payload.post?.current) {
    const { post } = payload;
    const current = post.current;
    const previous = post.previous;

    // If there's no previous state, it's a new publication
    if (!previous) {
      if (current.status === 'published' && current.visibility === 'public') {
        return 'post.published';
      }
      return 'post.created';
    }

    // If the post was published or visibility changed
    if (current.status === 'published' && current.visibility === 'public') {
      // If it was previously not published or not public, it's a publication
      if (previous.status !== 'published' || previous.visibility !== 'public') {
        return 'post.published';
      }
      // Otherwise it's an update
      return 'post.updated';
    }

    // If it was previously published and public but no longer is
    if (previous.status === 'published' && previous.visibility === 'public' &&
        (current.status !== 'published' || current.visibility !== 'public')) {
      return 'post.unpublished';
    }

    // Default to updated
    return 'post.updated';
  }
  
  // If we can't determine the event type but there's an ID, assume it's a deletion
  if (payload.id) {
    return 'post.deleted';
  }
  
  // Default fallback
  return 'unknown';
}

// Load configuration from environment variables
function getConfigFromEnv() {
  console.log('Loading configuration from environment variables...');
  
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
    console.log('Verifying webhook signature...');
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
    
    const isValid = providedSignature === computedSignature;
    console.log(`Signature verification ${isValid ? 'succeeded' : 'failed'}`);
    console.log('Debug info:', {
      providedSignature,
      computedSignature,
      timestamp
    });
    return isValid;
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

// Netlify function handler
export const handler: Handler = async (event, context) => {
  console.log('Handler function started');
  console.log(`Received request: ${event.httpMethod} ${event.path}`);
  
  // Check memory usage at start
  const startMemory = process.memoryUsage();
  console.log('Initial memory usage:', {
    rss: `${Math.round(startMemory.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(startMemory.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(startMemory.external / 1024 / 1024)}MB`
  });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`Rejected ${event.httpMethod} request`);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Make sure we have a request body
  if (!event.body) {
    console.log('Request missing body');
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
      console.log('Missing webhook signature');
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
  } else {
    console.log('No webhook secret configured - skipping signature verification');
  }

  try {
    console.log('Received webhook call with headers:', JSON.stringify(event.headers, null, 2));
    console.log('Webhook event type from headers:', event.headers['x-ghost-event'] || 'Not specified');
    
    // Parse payload with error handling
    let payload: WebhookPayload;
    try {
      console.log('Parsing webhook payload...');
      // For large payloads, log only the length first
      console.log(`Payload size: ${event.body.length} characters`);
      
      payload = JSON.parse(event.body) as WebhookPayload;
      console.log('Successfully parsed payload');
      
      // Log more details about the payload structure
      console.log('Payload top-level keys:', Object.keys(payload));
      
      if (payload.post) {
        console.log('Post object keys:', Object.keys(payload.post));
        
        // Log current and previous structure info
        if (payload.post.current) {
          console.log('Post.current keys:', Object.keys(payload.post.current));
          console.log('Post.current is empty:', Object.keys(payload.post.current).length === 0);
        }
        
        if (payload.post.previous) {
          console.log('Post.previous keys:', Object.keys(payload.post.previous));
          if (payload.post.previous.id) {
            console.log('Post.previous.id:', payload.post.previous.id);
          }
        }
      }
      
      // For debugging, log the detailed payload structure
      console.log('Detailed payload structure:', JSON.stringify(payload, null, 2));
      
      // Log a summary of the payload
      const extractedPostId = extractPostId(payload);
      let title = 'No title';
      let status = 'Unknown status';
      let visibility = 'Unknown visibility';
      
      if (payload.post?.current?.title && typeof payload.post.current.title === 'string') {
        title = payload.post.current.title;
        status = payload.post.current.status && typeof payload.post.current.status === 'string' 
          ? payload.post.current.status 
          : 'Unknown status';
        visibility = payload.post.current.visibility && typeof payload.post.current.visibility === 'string'
          ? payload.post.current.visibility
          : 'Unknown visibility';
      } else if (payload.post?.previous?.title && typeof payload.post.previous.title === 'string') {
        title = payload.post.previous.title;
        status = payload.post.previous.status && typeof payload.post.previous.status === 'string'
          ? payload.post.previous.status
          : 'Unknown status';
        visibility = payload.post.previous.visibility && typeof payload.post.previous.visibility === 'string'
          ? payload.post.previous.visibility
          : 'Unknown visibility';
      }
      
      console.log('Post summary:', {
        id: extractedPostId || 'undefined',
        title,
        status,
        visibility
      });
    } catch (parseError) {
      console.error('Error parsing webhook payload:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid JSON payload', 
          details: parseError instanceof Error ? parseError.message : 'Unknown error' 
        })
      };
    }
    
    // Determine the event type from the payload
    const webhookEventType = determineEventType(payload);
    console.log(`Determined event type: ${webhookEventType}`);
    
    // Extract post ID using the new function
    const postId = extractPostId(payload);
    console.log(`Processing post ID: ${postId || 'undefined'}`);

    // Load configuration
    console.log('Loading configuration from environment...');
    console.log('Checking required environment variables...');
    const requiredVars = {
      GHOST_URL: !!process.env.GHOST_URL,
      GHOST_KEY: !!process.env.GHOST_KEY,
      MEILISEARCH_HOST: !!process.env.MEILISEARCH_HOST,
      MEILISEARCH_API_KEY: !!process.env.MEILISEARCH_API_KEY
    };
    console.log('Environment variables present:', requiredVars);
    
    const missingVars = Object.entries(requiredVars)
      .filter(([_, present]) => !present)
      .map(([name]) => name);
      
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Missing configuration', 
          details: `Missing required environment variables: ${missingVars.join(', ')}` 
        })
      };
    }

    console.log('Optional environment variables:', {
      GHOST_VERSION: process.env.GHOST_VERSION,
      MEILISEARCH_TIMEOUT: process.env.MEILISEARCH_TIMEOUT,
      MEILISEARCH_INDEX_NAME: process.env.MEILISEARCH_INDEX_NAME
    });
    
    let config;
    try {
      config = getConfigFromEnv();
      console.log('Validated configuration:', {
        ghostUrl: config.ghost.url,
        ghostVersion: config.ghost.version,
        meilisearchHost: config.meilisearch.host,
        meilisearchTimeout: config.meilisearch.timeout,
        indexName: config.index.name
      });
    } catch (configError) {
      console.error('Error validating configuration:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Configuration error',
          details: configError instanceof Error ? configError.message : 'Unknown error'
        })
      };
    }

    // Initialize manager
    console.log('Initializing GhostMeilisearchManager...');
    let manager;
    try {
      manager = new GhostMeilisearchManager(config);
      console.log('GhostMeilisearchManager initialized successfully');
    } catch (managerError) {
      console.error('Error initializing GhostMeilisearchManager:', managerError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to initialize MeiliSearch manager',
          details: managerError instanceof Error ? managerError.message : 'Unknown error'
        })
      };
    }

    // Log the post details
    console.log('Post details:', {
      postId: postId || 'unknown',
      event: webhookEventType,
      status: payload.post?.current?.status || payload.post?.previous?.status || 'unknown',
      visibility: payload.post?.current?.visibility || payload.post?.previous?.visibility || 'unknown'
    });

    // Set operation timeout (slightly less than Netlify's 10s timeout)
    const OPERATION_TIMEOUT = 8000;

    // Handle different event types based on determined event
    console.log(`Processing event type: ${webhookEventType}`);
    
    // Make sure we have a valid post ID for all operations
    const postIdToUse = postId || payload.post?.previous?.id;
    
    if (!postIdToUse) {
      console.error('No post ID found in payload, cannot process webhook');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid payload structure: no post ID found', 
          payloadKeys: Object.keys(payload)
        })
      };
    }
    
    if (webhookEventType === 'post.published' || 
        (webhookEventType === 'post.updated' && 
         payload.post?.current?.status === 'published' && 
         payload.post?.current?.visibility === 'public')) {
      console.log(`Starting to index post ${postIdToUse}...`);
      
      try {
        // Add timeout to the indexing operation
        const result = await withTimeout(
          manager.indexPost(postIdToUse),
          OPERATION_TIMEOUT,
          `Indexing post ${postIdToUse}`
        );
        
        console.log(`Successfully indexed post ${postIdToUse}`);
        console.log("MeiliSearch response:", result);
        
        // Check memory usage after operation
        const endMemory = process.memoryUsage();
        console.log('Memory usage after indexing:', {
          rss: `${Math.round(endMemory.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(endMemory.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(endMemory.external / 1024 / 1024)}MB`
        });
      } catch (indexError) {
        console.error('Error indexing post to MeiliSearch:', {
          postId: postIdToUse,
          error: indexError instanceof Error 
            ? { message: indexError.message, stack: indexError.stack, name: indexError.name }
            : indexError
        });
        
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Error indexing post',
            details: indexError instanceof Error ? indexError.message : 'Unknown error'
          })
        };
      }
    } else if (webhookEventType === 'post.deleted' || 
               webhookEventType === 'post.unpublished' ||
               (payload.post?.previous?.id && Object.keys(payload.post?.current || {}).length === 0) ||
               (payload.post?.current && 
               (payload.post.current.status !== 'published' || 
               payload.post.current.visibility !== 'public'))) {
      
      console.log(`Starting to delete post ${postIdToUse} from index...`);
      
      try {
        // Add timeout to the delete operation
        await withTimeout(
          manager.deletePost(postIdToUse),
          OPERATION_TIMEOUT,
          `Deleting post ${postIdToUse}`
        );
        
        console.log(`Successfully deleted post ${postIdToUse} from index`);
        
        // Check memory usage after operation
        const endMemory = process.memoryUsage();
        console.log('Memory usage after deletion:', {
          rss: `${Math.round(endMemory.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(endMemory.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(endMemory.external / 1024 / 1024)}MB`
        });
      } catch (deleteError) {
        console.error('Error deleting post from MeiliSearch:', {
          postId: postIdToUse,
          error: deleteError instanceof Error 
            ? { message: deleteError.message, stack: deleteError.stack, name: deleteError.name }
            : deleteError
        });
        
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Error deleting post',
            details: deleteError instanceof Error ? deleteError.message : 'Unknown error'
          })
        };
      }
    } else {
      console.log(`No action needed for event type ${webhookEventType}`);
    }

    console.log('Webhook processing completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        postId: postIdToUse,
        action: webhookEventType
      })
    };
  } catch (error) {
    console.error('Unhandled error processing webhook:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.constructor.name
      });
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      })
    };
  } finally {
    console.log('Handler function completed');
  }
};
