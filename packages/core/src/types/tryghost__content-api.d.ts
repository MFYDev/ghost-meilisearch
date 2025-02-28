declare module '@tryghost/content-api' {
  interface PostOrPage {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    html: string;
    comment_id?: string;
    feature_image?: string;
    featured: boolean;
    visibility: string;
    created_at: string;
    updated_at: string;
    published_at: string;
    custom_excerpt?: string;
    codeinjection_head?: string;
    codeinjection_foot?: string;
    custom_template?: string;
    canonical_url?: string;
    url: string;
    excerpt: string;
    reading_time: number;
    access: boolean;
    comments: boolean;
    og_image?: string;
    og_title?: string;
    og_description?: string;
    twitter_image?: string;
    twitter_title?: string;
    twitter_description?: string;
    meta_title?: string;
    meta_description?: string;
    email_subject?: string;
    frontmatter?: string;
    tags?: Array<Tag>;
    authors?: Array<Author>;
    primary_author?: Author;
    primary_tag?: Tag;
  }

  interface Tag {
    id: string;
    name: string;
    slug: string;
    description?: string;
    feature_image?: string;
    visibility: string;
    meta_title?: string;
    meta_description?: string;
    url: string;
  }

  interface Author {
    id: string;
    name: string;
    slug: string;
    profile_image?: string;
    cover_image?: string;
    bio?: string;
    website?: string;
    location?: string;
    facebook?: string;
    twitter?: string;
    meta_title?: string;
    meta_description?: string;
    url: string;
  }

  interface Pagination {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next?: number;
    prev?: number;
  }

  interface BrowseResults<T> {
    [index: string]: T[] | Pagination;
  }

  interface BrowseParams {
    include?: string;
    fields?: string;
    filter?: string;
    formats?: string;
    limit?: string | number;
    page?: string | number;
    order?: string;
  }

  interface GhostContentAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  interface GhostAPI {
    posts: {
      browse: (options?: BrowseParams) => Promise<BrowseResults<PostOrPage>>;
      read: (idOrSlug: string, options?: any) => Promise<PostOrPage>;
    };
    pages: {
      browse: (options?: BrowseParams) => Promise<BrowseResults<PostOrPage>>;
      read: (idOrSlug: string, options?: any) => Promise<PostOrPage>;
    };
    authors: {
      browse: (options?: BrowseParams) => Promise<BrowseResults<Author>>;
      read: (idOrSlug: string, options?: any) => Promise<Author>;
    };
    tags: {
      browse: (options?: BrowseParams) => Promise<BrowseResults<Tag>>;
      read: (idOrSlug: string, options?: any) => Promise<Tag>;
    };
  }

  export { PostOrPage, Tag, Author, Pagination, BrowseResults, BrowseParams, GhostContentAPIOptions, GhostAPI };
  
  export default function GhostContentAPI(options: GhostContentAPIOptions): GhostAPI;
}
