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

2. Create `config.json`:
```json
{
  "ghost": {
    "url": "https://your-ghost-blog.com",
    "key": "your-content-api-key",
    "version": "v5.0"
  },
  "meilisearch": {
    "host": "https://your-meilisearch-host.com",
    "apiKey": "your-master-api-key",
    "timeout": 5000
  },
  "index": {
    "name": "ghost_posts",
    "primaryKey": "id"
  }
}
```

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

1. Fork this repository and click the "Deploy with Workers" button above, or follow the manual steps below. You can also choose to manually create the worker by linking the forked repo, and you just need to set deploy command to `cd apps/webhook-handler && npx wrangler deploy`.

2. Install Wrangler CLI (if deploying manually):
```bash
npm install -g wrangler
```

1. Clone your fork and navigate to the webhook handler:
```bash
git clone https://github.com/your-username/ghost-meilisearch.git
cd ghost-meilisearch/apps/webhook-handler
```

1. Configure environment variables in your `wrangler.toml`:
```toml
name = "ghost-meilisearch-webhook"
main = "dist/worker.js"
compatibility_date = "2023-10-30"

[vars]
# These are example environment variables
# WEBHOOK_SECRET = ""
# GHOST_MEILISEARCH_CONFIG = ""
```

5. Set these environment variables in the Cloudflare Dashboard (Workers & Pages → your worker → Settings → Variables):
```env
GHOST_URL=https://your-ghost-blog.com
GHOST_KEY=your-content-api-key
GHOST_VERSION=v5.0
MEILISEARCH_HOST=https://your-meilisearch-host.com
MEILISEARCH_API_KEY=your-master-api-key
MEILISEARCH_INDEX_NAME=ghost_posts
WEBHOOK_SECRET=your-secret-key
```

6. Build and deploy:
```bash
npm install
npm run build
wrangler deploy
```

7. The worker will be deployed to: `https://ghost-meilisearch-webhook.[your-subdomain].workers.dev`


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

## 🔧 Installation Options

### Self-hosting the Search UI

Instead of using the unpkg CDN, you can self-host the search UI:

1. Download the latest `search.min.js` from the [releases page](https://github.com/mfydev/ghost-meilisearch/releases)
2. Upload it to your server or CDN
3. Update your configuration to point to your hosted file

### Docker Installation

If you're using Docker for your Ghost installation, you can add Meilisearch to your `docker-compose.yml`:

```yaml
services:
  ghost:
    # Your existing Ghost configuration
    environment:
      # Add this to use the search UI
      - sodoSearch__url=https://cdn.jsdelivr.net/npm/@fanyangmeng/ghost-meilisearch-search-ui/dist/search.min.js
      
  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      - MEILI_MASTER_KEY=your-master-key
    volumes:
      - meilisearch_data:/meili_data
    ports:
      - "7700:7700"

volumes:
  meilisearch_data:
```

## ⚙️ Configuration

### Search UI Customization

You can customize the search UI by adding additional options to the `__MS_SEARCH_CONFIG__` object:

```javascript
window.__MS_SEARCH_CONFIG__ = {
  meilisearchHost: "https://your-meilisearch-host.com",
  meilisearchApiKey: "your-search-only-api-key",
  indexName: "ghost_posts",
  theme: "system",  // 'light', 'dark', or 'system'
  placeholder: "Search articles...",  // Custom placeholder text
  hotkeys: ["k", "/"],  // Keyboard shortcuts to open search
  limit: 10,  // Number of results to show
  highlightPreTag: "<mark>",  // HTML tag for highlighting matches
  highlightPostTag: "</mark>",  // HTML tag for highlighting matches
  searchableAttributes: ["title", "excerpt", "html", "tags.name", "authors.name"],
  displayedAttributes: ["title", "excerpt", "feature_image", "url", "published_at", "tags", "authors"],
  commonSearches: ["getting started", "tutorial", "guide"]  // Suggested searches
};
```

### Index Configuration

You can customize the Meilisearch index configuration by adding a `fields` array to your `config.json`:

```json
"index": {
  "name": "ghost_posts",
  "primaryKey": "id",
  "fields": [
    {
      "name": "title",
      "type": "string",
      "searchable": true,
      "filterable": false,
      "sortable": true,
      "displayed": true
    },
    {
      "name": "html",
      "type": "string",
      "searchable": true,
      "filterable": false,
      "displayed": true
    },
    {
      "name": "tags",
      "type": "string[]",
      "searchable": true,
      "filterable": true,
      "displayed": true
    }
  ]
}
```

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

### Customizing the Webhook Handler

The webhook handler is designed to be deployed to Netlify, but you can modify it to work with other serverless platforms or as a standalone server.

### Filtering and Faceting

Meilisearch supports powerful filtering and faceting. You can configure these in your index settings:

```javascript
// Example of setting up filters and facets
window.__MS_SEARCH_CONFIG__ = {
  // ... other config
  filterableAttributes: ["tags", "authors", "published_at"],
  faceting: {
    maxValuesPerFacet: 100
  }
};
```

## 🔒 Security

- **Never** use your Meilisearch master key in the frontend
- Create a search-only API key with minimal permissions for the frontend
- Use environment variables for sensitive keys in production
- Enable the webhook secret to prevent unauthorized index updates
- If self-hosting Meilisearch, place it behind a reverse proxy with HTTPS

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📦 Packages

| Package | Description |
|---------|-------------|
| [@fanyangmeng/ghost-meilisearch-search-ui](packages/search-ui/README.md) | Search interface that matches your Ghost theme |
| [@fanyangmeng/ghost-meilisearch-cli](apps/cli/README.md) | CLI tool for content syncing |
| [@fanyangmeng/ghost-meilisearch-webhook-handler](apps/webhook-handler/README.md) | Webhook handler for real-time updates |
| [@fanyangmeng/ghost-meilisearch-config](packages/config/README.md) | Configuration utilities |
| [@fanyangmeng/ghost-meilisearch-core](packages/core/README.md) | Core functionality |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
