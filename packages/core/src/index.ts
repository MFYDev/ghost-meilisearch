import GhostContentAPI, { PostOrPage as GhostPost, BrowseResults } from '@tryghost/content-api';
import { MeiliSearch, Index } from 'meilisearch';
import { Config, IndexField } from '@fanyangmeng/ghost-meilisearch-config';

export interface Post {
  id: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  url: string;
  feature_image?: string;
  published_at: number;
  updated_at: number;
  tags?: string[];
  authors?: string[];
  [key: string]: unknown;
}

export class GhostMeilisearchManager {
  private ghost: ReturnType<typeof GhostContentAPI>;
  private meilisearch: MeiliSearch;
  private config: Config;
  private index: Index;

  constructor(config: Config) {
    this.config = config;
    
    // Initialize Ghost Content API client
    this.ghost = GhostContentAPI({
      url: config.ghost.url,
      key: config.ghost.key,
      version: config.ghost.version
    });

    // Initialize Meilisearch client
    this.meilisearch = new MeiliSearch({
      host: config.meilisearch.host,
      apiKey: config.meilisearch.apiKey,
      timeout: config.meilisearch.timeout
    });
    
    this.index = this.meilisearch.index(config.index.name);
  }

  /**
   * Initialize the Meilisearch index with the specified settings
   */
  async initializeIndex(): Promise<void> {
    try {
      // Check if index exists
      const indexes = await this.meilisearch.getIndexes();
      const existingIndex = indexes.results.find(idx => idx.uid === this.config.index.name);
      
      // Create index if it doesn't exist
      if (!existingIndex) {
        await this.meilisearch.createIndex(this.config.index.name, { primaryKey: this.config.index.primaryKey });
      }
      
      // Configure index settings
      await this.configureIndexSettings();
    } catch (error) {
      throw this.handleError('Error initializing index', error);
    }
  }

  /**
   * Configure index settings based on the configuration
   */
  private async configureIndexSettings(): Promise<void> {
    // Extract attributes from fields
    const searchableAttributes = this.config.index.fields
      .filter(field => field.searchable)
      .map(field => field.name);
    
    const filterableAttributes = this.config.index.fields
      .filter(field => field.filterable)
      .map(field => field.name);
    
    const sortableAttributes = this.config.index.fields
      .filter(field => field.sortable)
      .map(field => field.name);
    
    const displayedAttributes = this.config.index.fields
      .filter(field => field.displayed)
      .map(field => field.name);
    
    // Update index settings
    await this.index.updateSearchableAttributes(searchableAttributes);
    await this.index.updateFilterableAttributes(filterableAttributes);
    await this.index.updateSortableAttributes(sortableAttributes);
    await this.index.updateDisplayedAttributes(displayedAttributes);
  }

  /**
   * Transform a Ghost post into the format expected by Meilisearch
   */
  private transformPost(post: GhostPost): Post {
    const transformed: Post = {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      html: post.html || '',
      excerpt: post.excerpt || '',
      url: post.url || '',
      published_at: new Date(post.published_at || Date.now()).getTime(),
      updated_at: new Date(post.updated_at || Date.now()).getTime()
    };

    if (post.feature_image) {
      transformed.feature_image = post.feature_image;
    }

    // Handle tags
    if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
      transformed.tags = post.tags.map((tag: { name: string }) => tag.name);
    }

    // Handle authors
    if (post.authors && Array.isArray(post.authors) && post.authors.length > 0) {
      transformed.authors = post.authors.map((author: { name: string }) => author.name);
    }

    // Add any additional fields specified in the config
    this.config.index.fields.forEach((field: IndexField) => {
      const fieldName = field.name;
      const value = post[fieldName as keyof GhostPost];
      if (!transformed[fieldName] && value !== undefined && value !== null) {
        transformed[fieldName] = value;
      }
    });

    return transformed;
  }

  /**
   * Fetch all posts from Ghost and index them in Meilisearch
   */
  async indexAllPosts(): Promise<void> {
    try {
      const allPosts = await this.fetchAllPosts();
      const documents = allPosts.map(post => this.transformPost(post));
      
      // Add documents to Meilisearch
      const response = await this.index.addDocuments(documents);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
    } catch (error) {
      throw this.handleError('Error indexing posts', error);
    }
  }

  /**
   * Fetch all posts from Ghost API
   */
  private async fetchAllPosts(): Promise<GhostPost[]> {
    let allPosts: GhostPost[] = [];
    
    // Fetch first page of posts
    const posts = await this.ghost.posts.browse({
      limit: 15, // Default limit in Ghost
      include: 'tags,authors'
    });
    
    // Add posts to our array
    if (Array.isArray(posts)) {
      allPosts = [...posts];
    } else if (posts && typeof posts === 'object') {
      // Handle the case where posts is a BrowseResults object
      const postsArray = posts as unknown as GhostPost[];
      allPosts = [...postsArray];
    }
    
    // Get total number of posts and calculate pages
    let total = 0;
    let limit = 15;
    
    // Try to extract pagination info
    if (posts && typeof posts === 'object' && 'meta' in posts) {
      const meta = (posts as any).meta;
      if (meta && meta.pagination) {
        total = meta.pagination.total;
        limit = meta.pagination.limit;
      }
    }
    const totalPages = Math.ceil(total / limit);
    
    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const pageResponse = await this.ghost.posts.browse({
        limit: limit,
        page: page,
        include: 'tags,authors'
      });
      
      // Add posts to our array
      if (Array.isArray(pageResponse)) {
        allPosts = [...allPosts, ...pageResponse];
      } else if (pageResponse && typeof pageResponse === 'object') {
        // Handle the case where pageResponse is a BrowseResults object
        const postsArray = pageResponse as unknown as GhostPost[];
        allPosts = [...allPosts, ...postsArray];
      }
    }
    
    return allPosts;
  }

  /**
   * Index a single post in Meilisearch
   */
  async indexPost(postId: string): Promise<void> {
    try {
      // Add a small delay to ensure Ghost API returns the latest content
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add a cache-busting parameter to force a fresh fetch
      const cacheBuster = Date.now();
      const post = await this.ghost.posts.read({id: postId} as any, {
        include: 'tags,authors',
        cache: cacheBuster.toString()
      });
      
      const document = this.transformPost(post);
      const response = await this.index.addDocuments([document]);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
    } catch (error) {
      throw this.handleError(`Error indexing post ${postId}`, error);
    }
  }

  /**
   * Delete a post from Meilisearch
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const response = await this.index.deleteDocument(postId);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
    } catch (error) {
      throw this.handleError(`Error deleting post ${postId}`, error);
    }
  }

  /**
   * Clear all documents from the index
   */
  async clearIndex(): Promise<void> {
    try {
      const response = await this.index.deleteAllDocuments();
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
    } catch (error) {
      throw this.handleError('Error clearing index', error);
    }
  }

  /**
   * Helper method to handle errors consistently
   */
  private handleError(message: string, error: unknown): Error {
    if (error instanceof Error) {
      error.message = `${message}: ${error.message}`;
      return error;
    }
    return new Error(`${message}: ${String(error)}`);
  }
}