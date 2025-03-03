/**
 * Environment variables for the Cloudflare Worker
 */
export interface Env {
  /**
   * Secret key for verifying webhook signatures
   */
  WEBHOOK_SECRET?: string;
  
  /**
   * Ghost blog URL
   */
  GHOST_URL?: string;
  
  /**
   * Ghost Content API key
   */
  GHOST_KEY?: string;
  
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