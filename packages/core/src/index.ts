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
    console.log(`Initializing index: ${this.config.index.name}`);
    
    try {
      // Check if index exists
      const indexes = await this.meilisearch.getIndexes();
      const existingIndex = indexes.results.find(idx => idx.uid === this.config.index.name);
      
      // Create index if it doesn't exist
      if (!existingIndex) {
        console.log(`Creating index: ${this.config.index.name}`);
        await this.meilisearch.createIndex(this.config.index.name, { primaryKey: this.config.index.primaryKey });
      } else {
        console.log(`Index ${this.config.index.name} already exists`);
      }
      
      // Configure index settings
      await this.configureIndexSettings();
      
      console.log('Index initialized successfully');
    } catch (error) {
      console.error('Error initializing index:', error);
      throw error;
    }
  }

  /**
   * Configure index settings based on the configuration
   */
  private async configureIndexSettings(): Promise<void> {
    console.log('Configuring index settings...');
    
    // Extract searchable attributes from fields
    const searchableAttributes = this.config.index.fields
      .filter(field => field.searchable)
      .map(field => field.name);
    
    // Extract filterable attributes from fields
    const filterableAttributes = this.config.index.fields
      .filter(field => field.filterable)
      .map(field => field.name);
    
    // Extract sortable attributes from fields
    const sortableAttributes = this.config.index.fields
      .filter(field => field.sortable)
      .map(field => field.name);
    
    // Extract displayed attributes from fields
    const displayedAttributes = this.config.index.fields
      .filter(field => field.displayed)
      .map(field => field.name);
    
    // Update index settings
    await this.index.updateSearchableAttributes(searchableAttributes);
    await this.index.updateFilterableAttributes(filterableAttributes);
    await this.index.updateSortableAttributes(sortableAttributes);
    await this.index.updateDisplayedAttributes(displayedAttributes);
    
    console.log('Index settings configured successfully');
  }

  /**
   * Transform a Ghost post into the format expected by Meilisearch
   */
  private transformPost(post: GhostPost): Post {
    console.log(`Transforming post: ${post.id}, ${post.title}`);
    
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

    const tags = post.tags;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      transformed.tags = tags.map((tag: { name: string }) => tag.name);
    }

    const authors = post.authors;
    if (authors && Array.isArray(authors) && authors.length > 0) {
      transformed.authors = authors.map((author: { name: string }) => author.name);
    }

    // Add any additional fields specified in the config
    this.config.index.fields.forEach((field: IndexField) => {
      const fieldName = field.name;
      const value = post[fieldName as keyof GhostPost];
      if (!transformed[fieldName] && value !== undefined && value !== null) {
        transformed[fieldName] = value;
      }
    });

    console.log('Transformed document:', transformed);
    return transformed;
  }

  /**
   * Fetch all posts from Ghost and index them in Meilisearch
   */
  async indexAllPosts(): Promise<void> {
    console.log('Indexing all posts...');
    let allPosts: GhostPost[] = [];
    
    try {
      // Fetch first page of posts
      const posts = await this.ghost.posts.browse({
        limit: 15, // Default limit in Ghost
        include: 'tags,authors'
      });
      
      // Add posts to our array
      if (Array.isArray(posts)) {
        allPosts = [...allPosts, ...posts];
      } else if (posts && typeof posts === 'object') {
        // Handle the case where posts is a BrowseResults object
        const postsArray = posts as unknown as GhostPost[];
        allPosts = [...allPosts, ...postsArray];
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
      
      console.log(`Found ${total} posts, fetching ${totalPages} pages...`);
      
      // Fetch remaining pages
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Fetching page ${page}/${totalPages}...`);
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
      
      console.log(`Found ${allPosts.length} posts to index`);
      const documents = allPosts.map(post => this.transformPost(post));
      
      // Add documents to Meilisearch
      const response = await this.index.addDocuments(documents);
      console.log(`Indexing task: ${response.taskUid}`);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
      console.log('Indexing complete');
    } catch (error) {
      console.error('Error indexing posts:', error);
      throw error;
    }
  }

  /**
   * Index a single post in Meilisearch
   */
  async indexPost(postId: string): Promise<void> {
    console.log(`Indexing post: ${postId}`);
    
    try {
      // Add a small delay to ensure Ghost API returns the latest content
      // This helps with the potential caching issue in the Ghost Content API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // The Ghost Content API requires the ID as a string for the first parameter
      // and options as the second parameter
      // Add a cache-busting parameter to force a fresh fetch
      const cacheBuster = Date.now();
      const post = await this.ghost.posts.read({id: postId} as any, {
        include: 'tags,authors',
        cache: cacheBuster.toString() // Add cache-busting parameter
      });
      
      const document = this.transformPost(post);
      const response = await this.index.addDocuments([document]);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
      console.log(`Post ${postId} indexed successfully`);
    } catch (error) {
      console.error(`Error indexing post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a post from Meilisearch
   */
  async deletePost(postId: string): Promise<void> {
    console.log(`Deleting post: ${postId}`);
    
    try {
      const response = await this.index.deleteDocument(postId);
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
      console.log(`Post ${postId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Clear all documents from the index
   */
  async clearIndex(): Promise<void> {
    console.log(`Clearing index: ${this.config.index.name}`);
    
    try {
      const response = await this.index.deleteAllDocuments();
      
      // Wait for task to complete
      await this.meilisearch.waitForTask(response.taskUid);
      console.log('Index cleared successfully');
    } catch (error) {
      console.error('Error clearing index:', error);
      throw error;
    }
  }
}
