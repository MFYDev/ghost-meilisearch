# Ghost Meilisearch Integration

Add powerful, lightning-fast search to your Ghost blog with Meilisearch. This integration provides everything you need to create a seamless search experience for your readers.

![demo](static/images/demo.gif)

## ✨ Features

- 🔍 **Beautiful Search UI**: Accessible, keyboard-navigable search interface that matches your Ghost theme
- 🚀 **Blazing Fast**: Meilisearch delivers sub-50ms search results, even with large content libraries
- 🤖 **Easy Content Syncing**: Simple CLI tool for managing your search index
- 🪝 **Real-time Updates**: Keep your search index in sync with your content via webhooks
- 🌗 **Dark/Light Modes**: Automatically matches your Ghost theme's color scheme
- 🔐 **Secure**: Uses search-only API keys for frontend, admin keys for backend

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
- Content API key from Ghost (for syncing content)
- Search-only API key from Meilisearch (for the search UI)

### 2. Add Search to Your Theme

There are two ways to add search to your Ghost site:

#### Option 1: Replace Ghost's Default Search (Recommended)

Add to your `config.[environment].json`:
```json
"sodoSearch": {
    "url": "https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.2.2/dist/search.min.js"
}
```

Or set the environment variable:
```bash
sodoSearch__url=https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.2.2/dist/search.min.js
```

#### Option 2: Code Injection

If you're using a managed host like Ghost(Pro), add this to your site's code injection (Settings → Code injection → Site Header):

```html
<script src="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.2.2/dist/search.min.js"></script>
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
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.2.2/dist/styles.css">

<script>
  window.__MS_SEARCH_CONFIG__ = {
    meilisearchHost: "https://your-meilisearch-host.com",
    meilisearchApiKey: "your-search-only-api-key",
    indexName: "ghost_posts",
    theme: "system"  // Optional: 'light', 'dark', or 'system'
  };
</script>
```

### 4. Initial Content Sync

1. Install the CLI:
```bash
npm install -g @fanyangmeng/ghost-meilisearch-cli
```

2. Create `config.json` by using `example.config.json` as a template.

3. Initialize and sync:
```bash
ghost-meilisearch init --config config.json
ghost-meilisearch sync --config config.json
```

### 5. Set Up Real-Time Updates (Optional)

To keep your search index in sync with your content, you can deploy the webhook handler to your preferred platform:

#### Deploy to Your Platform

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mfydev/ghost-meilisearch)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mfydev/ghost-meilisearch)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mfydev/ghost-meilisearch)

1. Click one of the deployment buttons above
2. Set these environment variables in your platform's dashboard:
```env
GHOST_URL=https://your-ghost-blog.com
GHOST_KEY=your-content-api-key  # From Ghost Admin
GHOST_VERSION=v5.0
MEILISEARCH_HOST=https://your-meilisearch-host.com
MEILISEARCH_API_KEY=your-master-api-key  # Meilisearch Master API key
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
| Cloudflare Workers | `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev` |

Add all four events (Post published, updated, deleted, unpublished) pointing to your webhook URL.

Now your search index will automatically update when you publish, update, or delete posts!

## 🔍 Advanced Usage

### CLI Commands

The CLI tool provides several commands:

```bash
# Initialize the index with the schema from config.json
ghost-meilisearch init --config config.json

# Sync all posts from Ghost to Meilisearch
ghost-meilisearch sync --config config.json

# Index a single post by ID
ghost-meilisearch index <post-id> --config config.json

# Delete a single post from the index by ID
ghost-meilisearch delete <post-id> --config config.json

# Clear all documents from the index
ghost-meilisearch clear --config config.json
```

## 🔒 Security

- **Never** use your Meilisearch master key in the frontend
- Create a search-only API key with minimal permissions for the frontend
- Use environment variables for sensitive keys in production
- Enable the webhook secret to prevent unauthorized index updates
- If self-hosting Meilisearch, place it behind a reverse proxy with HTTPS

## 📦 Packages

| Package | Description | Latest Version |
|---------|-------------|----------------|
| [@fanyangmeng/ghost-meilisearch-search-ui](packages/search-ui) | Search interface that matches your Ghost theme |  0.2.2 |
| [@fanyangmeng/ghost-meilisearch-cli](apps/cli/README.md) | CLI tool for content syncing | 0.1.3 |
| [@fanyangmeng/ghost-meilisearch-webhook-handler](apps/webhook-handler) | Webhook handler for real-time updates |  0.3.0 |
| [@fanyangmeng/ghost-meilisearch-config](packages/config) | Configuration utilities |  0.1.3 |
| [@fanyangmeng/ghost-meilisearch-core](packages/core) | Core functionality |  0.1.3 |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
