// @ts-ignore - Suppress TS7016 error as @tryghost/admin-api lacks types
import GhostAdminAPI, { PostOrPage as GhostPost, PostsOrPages as GhostPostsOrPages } from '@tryghost/admin-api';
import { MeiliSearch, Index } from 'meilisearch';
import { Config, IndexField } from '@fanyangmeng/ghost-meilisearch-config';
import * as cheerio from 'cheerio';

export interface Post {
  id: string;
  title: string;
  slug: string;
  html: string;
  // plaintext: string; // Removed
  plaintext_public: string | null; // Added
  plaintext_private: string | null; // Added
  excerpt: string;
  url: string;
  visibility: string;
  feature_image?: string;
  published_at: number;
  updated_at: number;
  tags?: string[];
  authors?: string[];
  [key: string]: unknown;
}

export class GhostMeilisearchManager {
  private ghost: GhostAdminAPI;
  private meilisearch: MeiliSearch;
  private config: Config;
  private index: Index;

  constructor(config: Config) {
    this.config = config;

    // Initialize Ghost Admin API client
    // The 'key' from config is expected to be the Admin API key (id:secret)
    this.ghost = new GhostAdminAPI({
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
   * Transform Ghost post to format suitable for Meilisearch
   */
  private transformPost(post: GhostPost): Post {
    let plaintext_public: string | null = null;
    let plaintext_private: string | null = null;
    const visibility = post.visibility || 'public'; // Default to public
    // Using a custom selector function to find the comment-based divider
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

    const transformed: Post = {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      html: post.html || '',
      plaintext_public: plaintext_public, // Use new field
      plaintext_private: plaintext_private, // Use new field
      excerpt: post.excerpt || '',
      url: post.url || '',
      visibility: visibility, // Use the determined visibility
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
    // Ensure we don't overwrite the fields we just set
    const handledFields = ['id', 'title', 'slug', 'html', 'plaintext_public', 'plaintext_private', 'excerpt', 'url', 'visibility', 'published_at', 'updated_at', 'feature_image', 'tags', 'authors'];
    this.config.index.fields.forEach((field: IndexField) => {
      const fieldName = field.name;
      if (!handledFields.includes(fieldName)) {
          const value = post[fieldName as keyof GhostPost];
          if (value !== undefined && value !== null) {
              transformed[fieldName] = value;
          }
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
    let currentPage = 1;
    let totalPages = 1; // Initialize to 1 to ensure the loop runs at least once
    const limit = 50; // Fetch more posts per page with Admin API

    do {
      try {
        // Fetch posts for the current page using Admin API client
        const pageResponse = await this.ghost.posts.browse({
          limit: limit,
          page: currentPage,
          include: 'tags,authors',
          formats: 'html,plaintext' // Request necessary formats
        });

        // Add posts from the current page response
        // Admin API client returns posts in the main array
        if (pageResponse && Array.isArray(pageResponse)) {
           allPosts = allPosts.concat(pageResponse);
        } else {
          // Handle potential inconsistencies or errors if needed
          console.warn(`Unexpected response format on page ${currentPage}:`, pageResponse);
        }

        // Update total pages from pagination metadata if available
        // Admin API client includes meta directly in the response object
        if (pageResponse && pageResponse.meta && pageResponse.meta.pagination) {
          totalPages = pageResponse.meta.pagination.pages ?? totalPages;
        } else if (currentPage === 1) {
           // If meta is missing on the first page, assume only one page
           totalPages = 1;
        }

        currentPage++;

      } catch (error) {
         // Log error and stop fetching further pages
         console.error(`Error fetching page ${currentPage}:`, error);
         break;
      }
    } while (currentPage <= totalPages);

    return allPosts;
  }

  /**
   * Index a single post in Meilisearch
   */
  async indexPost(postId: string): Promise<void> {
    try {
      // Add a small delay to ensure Ghost API returns the latest content
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the post using the Admin API client
      // The first argument to read is an object identifying the post (e.g., by id or slug)
      // The second argument contains options like include and formats
      const post = await this.ghost.posts.read({ id: postId }, {
        include: 'tags,authors',
        formats: 'html,plaintext' // Request necessary formats
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