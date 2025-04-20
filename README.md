# Ghost Meilisearch Integration

Add powerful, lightning-fast search to your Ghost blog with Meilisearch. This integration provides everything you need to create a seamless search experience for your readers.

![demo](static/images/demo0.5.0.gif)

## ✨ Features

- 🔍 **Beautiful Search UI**: Accessible, keyboard-navigable search interface that matches your Ghost theme
- 🚀 **Blazing Fast**: Meilisearch delivers sub-50ms search results, even with large content libraries
- 🤖 **Easy Content Syncing**: Simple CLI tool for managing your search index
- 🪝 **Real-time Updates**: Keep your search index in sync with your content via webhooks
- 🌗 **Dark/Light Modes**: Automatically matches your Ghost theme's color scheme
- 🔐 **Secure**: Uses search-only API keys for frontend, admin keys for backend
- 🍭 **Highlight Search Result**: Highlight the search result with the exact phrase
- 📈 **Improved Plain Text Search Result**: Improved plain text search result powered by cheerio
- 🧠 **AI-Powered Semantic Search**: Optional semantic search using Meilisearch v1.3+ hybrid search (requires configured embedder).

## Project Structure

```
ghost-meilisearch/
├── apps/
│   ├── cli/                 # CLI tool
│   └── webhook-handler/     # Webhook handler (Netlify, Vercel & Cloudflare Workers)
├── packages/
│   ├── config/              # Configuration utilities
│   ├── core/                # Core functionality
│   └── search-ui/           # Search UI component
├── public/                  # Built files for distribution
└── scripts/                 # Build scripts
```

## 🚀 Quick Start

### 1. Set Up Meilisearch

You'll need:
- A Meilisearch instance ([cloud](https://cloud.meilisearch.com) or [self-hosted](https://docs.meilisearch.com/learn/getting_started/installation.html))
- Admin API key from Ghost (for syncing content), you can get it by following the guide [here](https://ghost.org/docs/admin-api/#token-authentication)
- Search-only API key from Meilisearch (for the search UI)
- Writing API key for the index `ghost_posts` from Meilisearch (for the webhook handler)
- **For AI Search (Optional):**
  - An [embedder configured](https://www.meilisearch.com/docs/learn/ai_powered_search/getting_started_with_ai_search) in your Meilisearch instance settings

### 2. Add Search to Your Theme

There are two ways to add search to your Ghost site:

#### Option 1: Replace Ghost's Default Search (Recommended)

Add to your `config.[environment].json`:
```json
"sodoSearch": {
    "url": "https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@1.2.3/dist/search.min.js"
}
```

Or set the environment variable:
```bash
sodoSearch__url=https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@1.2.3/dist/search.min.js
```

#### Option 2: Code Injection

If you're using a managed host like Ghost(Pro), add this to your site's code injection (Settings → Code injection → Site Header):

```html
<script src="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@1.2.3/dist/search.min.js"></script>
```

### 3. Configure the Search UI

Firstly, create a search-only API key in Meilisearch, You can follow the guide [here](https://www.meilisearch.com/docs/reference/api/keys#create-a-key).

Basically, you need to specify the `actions` to `["search"]` and `indexes` to `["ghost_posts"]`.

```bash
curl \
  -X POST 'MEILISEARCH_URL/keys' \
  -H 'Authorization: Bearer MASTER_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "description": "Search only key for ghost blog",
    "actions": ["search"],
    "indexes": ["ghost_posts"],
    "expiresAt": null
  }'
```

Remember, never use the default master API key in the below, it will expose your Meilisearch instance to the public, and allow everyone to add, update and delete documents from your Meilisearch index.

Add this to your site's header code injection:

```html
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@1.2.3/dist/styles.css">

<script>
  window.__MS_SEARCH_CONFIG__ = {
    meilisearchHost: "https://your-meilisearch-host.com",
    meilisearchApiKey: "your-search-only-api-key",
    indexName: "ghost_posts",
    theme: "system",  // Optional: 'light', 'dark', or 'system'

    // --- Optional AI Search Configuration ---
    // Requires Meilisearch with a configured embedder
    enableAiSearch: true, // Set to true to enable AI-powered search (default: false)
    aiSearchEmbedder: "your-embedder-name", // The name of the embedder configured in Meilisearch (e.g., "openai")
    aiSearchLimit: 3, // Max number of results to show in the "AI Suggestions" section (default: 3)
  };
</script>
```

**Note on AI Search:**
- Enabling AI search requires Meilisearch v1.3 or later.
- You must have an [embedder configured](https://www.meilisearch.com/docs/learn/ai_powered_search/getting_started_with_ai_search) in your Meilisearch instance settings. The `aiSearchEmbedder` name must match the one configured in Meilisearch.
- When enabled, search results will be split into two sections: "AI Suggestions" (semantic results, limited by `aiSearchLimit`) and "Keyword Matches" (standard keyword results).
- If `enableAiSearch` is `false` (the default), the `aiSearchEmbedder` and `aiSearchLimit` options are ignored.

### 4. Initial Content Sync

1. Install the CLI:
```bash
npm install -g @fanyangmeng/ghost-meilisearch-cli@1.2.3
```

2. Create `config.json` by using `example.config.json` as a template.

3. Initialize and sync:
```bash
ghost-meilisearch init --config config.json
ghost-meilisearch sync --config config.json
```

The CLI tool provides several other commands:

```bash
# Index a single post by ID
ghost-meilisearch index <post-id> --config config.json

# Delete a single post from the index by ID
ghost-meilisearch delete <post-id> --config config.json

# Clear all documents from the index
ghost-meilisearch clear --config config.json
```

### 5. Set Up Real-Time Updates (Optional)

To keep your search index in sync with your content, you can deploy the webhook handler to your preferred platform:

#### Deploy to Your Platform

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mfydev/ghost-meilisearch)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mfydev/ghost-meilisearch)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mfydev/ghost-meilisearch)

1. Fork this repository
2. Create a new API key which will be used by the webhook handler in Meilisearch, and set the `actions` to `["documents.add", "documents.get", "documents.delete"]` and `indexes` to `["ghost_posts"]`.
```bash
curl \
  -X POST 'MEILISEARCH_URL/keys' \
  -H 'Authorization: Bearer MASTER_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "description": "Ghost Meilisearch Webhook Handler API key",
    "actions": ["documents.add", "documents.get", "documents.delete"],
    "indexes": ["ghost_posts"],
    "expiresAt": null
  }'
```
3. Click one of the deployment buttons above
4. Set these environment variables in your platform's dashboard:
```env
GHOST_URL=https://your-ghost-blog.com
GHOST_ADMIN_API_KEY=your-admin-api-key  # From Ghost Admin
GHOST_VERSION=v5.0
MEILISEARCH_HOST=https://your-meilisearch-host.com
MEILISEARCH_API_KEY=your-webhook-api-key  # Meilisearch webhook API key
MEILISEARCH_INDEX_NAME=ghost_posts  # Must match search config
WEBHOOK_SECRET=your-secret-key  # Generate a random string
```

#### Set up webhooks in Ghost Admin:

1. Go to Settings → Integrations
2. Create/select a Custom Integration
3. Give it a name (e.g. "Meilisearch Search")
4. Add these webhooks with your deployed URL:

| Platform | Webhook URL Format |
|----------|-------------------|
| Netlify | `https://your-site.netlify.app/.netlify/functions/handler` |
| Vercel | `https://your-app.vercel.app/api/webhook` |
| Cloudflare Workers | `https://your-worker.[your-subdomain].workers.dev` |

Add all four events (Post published, updated, deleted, unpublished) pointing to your webhook URL.

Now your search index will automatically update when you publish, update, or delete posts!

## 📦 Packages

| Package | Description | Latest Version |
|---------|-------------|----------------|
| [@fanyangmeng/ghost-meilisearch-search-ui](packages/search-ui) | Search interface that matches your Ghost theme |  1.2.3  |
| [@fanyangmeng/ghost-meilisearch-cli](apps/cli/README.md) | CLI tool for content syncing | 1.2.3  |
| [@fanyangmeng/ghost-meilisearch-webhook-handler](apps/webhook-handler) | Webhook handler for real-time updates |  1.2.3  |
| [@fanyangmeng/ghost-meilisearch-config](packages/config) | Configuration utilities |  1.2.3 |
| [@fanyangmeng/ghost-meilisearch-core](packages/core) | Core functionality |  1.2.3 |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
