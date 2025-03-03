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
│   └── webhook-handler/     # Webhook handler (Netlify & Cloudflare Workers)
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
    "url": "https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.1.3/dist/search.min.js"
}
```

Or set the environment variable:
```bash
sodoSearch__url=https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.1.3/dist/search.min.js
```

#### Option 2: Code Injection

If you're using a managed host like Ghost(Pro), add this to your site's code injection (Settings → Code injection → Site Header):

```html
<script src="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.1.3/dist/search.min.js"></script>
```

### 3. Configure the Search UI

Add this to your site's header code injection:

```html
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui@0.1.3/dist/styles.css">

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

To keep your search index in sync with your content:

#### Option 1: Deploy to Netlify

1. Deploy the webhook handler to Netlify:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mfydev/ghost-meilisearch)

2. Set these environment variables in Netlify (Site settings → Environment variables):
```env
GHOST_URL=https://your-ghost-blog.com
GHOST_KEY=your-content-api-key  # From Ghost Admin
GHOST_VERSION=v5.0
MEILISEARCH_HOST=https://your-meilisearch-host.com
MEILISEARCH_API_KEY=your-master-api-key  # Meilisearch Master API key
MEILISEARCH_INDEX_NAME=ghost_posts  # Must match search config
WEBHOOK_SECRET=your-secret-key  # Generate a random string
```

#### Option 2: Deploy to Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mfydev/ghost-meilisearch)

##### Option A: Quick Deploy (Recommended)

1. Fork this repository
2. Click the "Deploy with Workers" button above
3. Configure these environment variables in Cloudflare Dashboard (Workers & Pages → your worker → Settings → Variables), set them as secrets so that they won't be exposed in the frontend, and they won't be lost after re-deploying:
   ```env
   GHOST_URL=https://your-ghost-blog.com
   GHOST_KEY=your-content-api-key  # From Ghost Admin
   GHOST_VERSION=v5.0
   MEILISEARCH_HOST=https://your-meilisearch-host.com
   MEILISEARCH_API_KEY=your-master-api-key  # Meilisearch Master API key
   MEILISEARCH_INDEX_NAME=ghost_posts  # Must match search config
   WEBHOOK_SECRET=your-secret-key  # Generate a random string
   ```

##### Option B: Manual Deploy

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Clone your fork and navigate to the webhook handler:
   ```bash
   git clone https://github.com/your-username/ghost-meilisearch.git
   cd ghost-meilisearch/apps/webhook-handler
   ```

3. Update your `wrangler.toml`:
   ```toml
   name = "ghost-meilisearch"
   main = "apps/webhook-handler/cloudflare-worker/worker.js"
   compatibility_date = "2025-03-02"

   # Environment variables and secrets are set in the Cloudflare Dashboard
   # DO NOT put sensitive values here
   # You can also use wrangler secret put to set secrets
   ```

4. Build and deploy:
   ```bash
   npm install
   npm run build
   wrangler deploy
   ```

Your worker will be deployed to: `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev`


#### Set up webhooks in Ghost Admin:

1. Go to Settings → Integrations
2. Create/select a Custom Integration
3. Give it a name (e.g. "Meilisearch Search")
4. Add these webhooks:

   For Netlify deployment:
   | Event | Target URL |
   |--------|------------|
   | Post published | `https://your-site.netlify.app/.netlify/functions/handler` |
   | Post updated | `https://your-site.netlify.app/.netlify/functions/handler` |
   | Post deleted | `https://your-site.netlify.app/.netlify/functions/handler` |
   | Post unpublished | `https://your-site.netlify.app/.netlify/functions/handler` |

   For Cloudflare Workers deployment:
   | Event | Target URL |
   |--------|------------|
   | Post published | `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev` |
   | Post updated | `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev` |
   | Post deleted | `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev` |
   | Post unpublished | `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev` |


Now your search index will automatically update when you publish, update, or delete posts!

## 🔍 Advanced Usage

### CLI Commands

The CLI tool provides several commands:

```bash
# Initialize the index with the schema from config.json
ghost-meilisearch init --config config.json

# Sync all posts from Ghost to Meilisearch
ghost-meilisearch sync --config config.json

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
| [@fanyangmeng/ghost-meilisearch-search-ui](packages/search-ui/README.md) | Search interface that matches your Ghost theme |  0.1.3 |
| [@fanyangmeng/ghost-meilisearch-cli](apps/cli/README.md) | CLI tool for content syncing | 0.1.3 |
| [@fanyangmeng/ghost-meilisearch-webhook-handler](apps/webhook-handler/README.md) | Webhook handler for real-time updates |  0.2.0 |
| [@fanyangmeng/ghost-meilisearch-config](packages/config/README.md) | Configuration utilities |  0.1.3 |
| [@fanyangmeng/ghost-meilisearch-core](packages/core/README.md) | Core functionality |  0.1.3 |


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
