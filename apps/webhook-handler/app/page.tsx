import React from 'react';

export default function Home() {
  return (
    <main>
      <header>
        <h1>Ghost Meilisearch</h1>
        <p className="subtitle">A powerful search integration for Ghost CMS</p>
        <button className="search-trigger" data-ghost-search>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          Search
        </button>
      </header>
      
      <section className="demo-section">
        <h2>Demo</h2>
        <p>This is a demo page for the Ghost Meilisearch integration. You can trigger the search UI by:</p>
        
        <div className="keyboard-shortcuts">
          <div className="keyboard-shortcut">
            <span className="kbd">Ctrl</span>
            <span className="plus">+</span>
            <span className="kbd">K</span>
          </div>
          
          <div className="keyboard-shortcut">
            <span className="kbd">Cmd</span>
            <span className="plus">+</span>
            <span className="kbd">K</span>
          </div>
          
          <div className="keyboard-shortcut">
            <span className="kbd">/</span>
          </div>
          
          <div className="keyboard-shortcut">
            <span>Clicking the search button above</span>
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Configuration</h2>
        <p>To use Ghost Meilisearch in your Ghost theme, add the following code to your theme's <code>default.hbs</code> file:</p>
        
        <div className="config-example">
          <pre><code>{`<script>
  // Meilisearch configuration
  window.__MS_SEARCH_CONFIG__ = {
    meilisearchHost: "https://your-meilisearch-host.com/",
    meilisearchApiKey: "your-meilisearch-search-api-key",
    indexName: "ghost_posts",
    theme: "system", // Options: "light", "dark", "system"
    commonSearches: ["getting started", "tutorial", "guide"]
  };
</script>
<script src="search.min.js"></script>
<link rel="stylesheet" href="styles.css">`}</code></pre>
        </div>
      </section>
      
      <div className="mt-4 text-sm text-gray-500">
        The webhook endpoint is available at <code>/api/webhook</code>
      </div>
    </main>
  );
} 