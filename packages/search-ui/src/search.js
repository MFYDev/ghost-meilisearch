import { MeiliSearch } from 'meilisearch';
import './styles.css';

/**
 * Ghost Meilisearch Search UI
 * A search UI for Ghost blogs using Meilisearch
 */
class GhostMeilisearchSearch {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      meilisearchHost: 'http://localhost:7700',
      meilisearchApiKey: '',
      indexName: 'ghost_posts',
      theme: 'system', // 'light', 'dark', 'system'
      commonSearches: [],
      searchFields: {
        title: { weight: 4, highlight: true },
        excerpt: { weight: 2, highlight: true },
        html: { weight: 1, highlight: true }
      },
      ...config
    };

    // Initialize state
    this.state = {
      isOpen: false,
      query: '',
      results: [],
      loading: false,
      selectedIndex: -1,
      error: null
    };

    // Initialize Meilisearch client
    this.client = new MeiliSearch({
      host: this.config.meilisearchHost,
      apiKey: this.config.meilisearchApiKey
    });

    // Get the index
    this.index = this.client.index(this.config.indexName);

    // Create DOM elements
    this.createDOMElements();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Create DOM elements for the search UI
   */
  createDOMElements() {
    // Create wrapper element
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'ms-search-wrapper';
    document.body.appendChild(this.wrapper);

    // Create modal element
    this.modal = document.createElement('div');
    this.modal.id = 'ms-search-modal';
    this.modal.classList.add('hidden');
    this.wrapper.appendChild(this.modal);

    // Create modal content
    this.modal.innerHTML = `
      <div class="ms-backdrop"></div>
      <div class="ms-modal-container">
        <button class="ms-close-button" aria-label="Close search">&times;</button>
        <div class="ms-modal-content">
          <div class="ms-search-header">
            <input type="text" class="ms-search-input" placeholder="Search..." aria-label="Search">
          </div>
          <div class="ms-keyboard-hints">
            <span><span class="ms-kbd">↑</span><span class="ms-kbd">↓</span> to navigate</span>
            <span><span class="ms-kbd">↵</span> to select</span>
            <span><span class="ms-kbd">ESC</span> to close</span>
          </div>
          <div class="ms-results-container">
            <div class="ms-common-searches">
              <div class="ms-common-searches-title">Common searches</div>
              <div class="ms-common-searches-list"></div>
            </div>
            <ul class="ms-hits-list"></ul>
            <div class="ms-loading-state">
              <div class="ms-loading-spinner"></div>
              <div>Searching...</div>
            </div>
            <div class="ms-empty-state">
              <div class="ms-empty-message">No results found for your search.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Get references to elements
    this.searchInput = this.modal.querySelector('.ms-search-input');
    this.closeButton = this.modal.querySelector('.ms-close-button');
    this.hitsList = this.modal.querySelector('.ms-hits-list');
    this.loadingState = this.modal.querySelector('.ms-loading-state');
    this.emptyState = this.modal.querySelector('.ms-empty-state');
    this.commonSearchesList = this.modal.querySelector('.ms-common-searches-list');
    this.commonSearchesSection = this.modal.querySelector('.ms-common-searches');

    // Populate common searches
    this.populateCommonSearches();

    // Apply theme based on page color scheme
    this.applyTheme();
  }

  /**
   * Populate common searches section
   */
  populateCommonSearches() {
    if (!this.config.commonSearches || this.config.commonSearches.length === 0) {
      this.commonSearchesSection.classList.add('hidden');
      return;
    }

    this.commonSearchesList.innerHTML = '';
    this.config.commonSearches.forEach(search => {
      const button = document.createElement('button');
      button.classList.add('ms-common-search-btn');
      button.textContent = search;
      button.addEventListener('click', () => {
        this.searchInput.value = search;
        this.state.query = search;
        this.performSearch();
      });
      this.commonSearchesList.appendChild(button);
    });
  }

  /**
   * Apply theme based on page color scheme
   */
  applyTheme() {
    // First check for data-color-scheme on html or body element
    const htmlColorScheme = document.documentElement.getAttribute('data-color-scheme');
    const bodyColorScheme = document.body.getAttribute('data-color-scheme');
    const pageColorScheme = htmlColorScheme || bodyColorScheme || this.config.theme;
    
    // Remove any existing classes
    this.wrapper.classList.remove('dark', 'light');
    
    if (pageColorScheme === 'dark') {
      this.wrapper.classList.add('dark');
    } else if (pageColorScheme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.wrapper.classList.add('dark');
      } else {
        this.wrapper.classList.add('light');
      }
      
      // Listen for changes in system preference
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        this.wrapper.classList.remove('dark', 'light');
        if (e.matches) {
          this.wrapper.classList.add('dark');
        } else {
          this.wrapper.classList.add('light');
        }
      });
    } else {
      // Default to light
      this.wrapper.classList.add('light');
    }
    
    // Add MutationObserver to watch for changes in data-color-scheme
    this.setupColorSchemeObserver();
  }
  
  /**
   * Set up observer to watch for changes in data-color-scheme
   */
  setupColorSchemeObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-scheme') {
          this.applyTheme();
        }
      });
    });
    
    // Observe both html and body for changes
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-color-scheme'] });
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    // Close button click
    this.closeButton.addEventListener('click', () => this.close());

    // Backdrop click
    this.modal.querySelector('.ms-backdrop').addEventListener('click', () => this.close());

    // Search input
    this.searchInput.addEventListener('input', () => {
      this.state.query = this.searchInput.value;
      this.performSearch();
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Add click event to search triggers
    document.querySelectorAll('[data-ghost-search]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.open();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
      
      // Forward slash (/) when not in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.open();
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.state.isOpen) {
        // Adjust modal position and size on resize
        this.adjustModalForScreenSize();
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(e) {
    if (!this.state.isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault(); // Prevent page scrolling
        this.navigateResults(1);
        break;
      case 'ArrowUp':
        e.preventDefault(); // Prevent page scrolling
        this.navigateResults(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this.selectResult();
        break;
    }
  }
  
  /**
   * Adjust modal for different screen sizes
   */
  adjustModalForScreenSize() {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      // Mobile optimizations
      this.modal.querySelector('.ms-modal-content').style.height = '100vh';
      this.modal.querySelector('.ms-results-container').style.maxHeight = 'calc(100vh - 7rem)';
    } else {
      // Desktop optimizations
      this.modal.querySelector('.ms-modal-content').style.height = '';
      this.modal.querySelector('.ms-results-container').style.maxHeight = '';
    }
  }

  /**
   * Navigate through search results
   */
  navigateResults(direction) {
    const results = this.state.results;
    if (results.length === 0) return;

    // Calculate new index
    let newIndex = this.state.selectedIndex + direction;
    
    // Wrap around
    if (newIndex < 0) {
      newIndex = results.length - 1;
    } else if (newIndex >= results.length) {
      newIndex = 0;
    }

    // Update selected index
    this.state.selectedIndex = newIndex;
    
    // Update UI
    this.updateSelectedResult();
  }

  /**
   * Update the selected result in the UI
   */
  updateSelectedResult() {
    // Remove selected class from all results
    const resultElements = this.hitsList.querySelectorAll('.ms-result-link');
    resultElements.forEach(el => el.classList.remove('ms-selected'));

    // Add selected class to current result
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < resultElements.length) {
      const selectedElement = resultElements[this.state.selectedIndex];
      selectedElement.classList.add('ms-selected');
      
      // Scroll into view if needed
      const container = this.modal.querySelector('.ms-results-container');
      const elementTop = selectedElement.offsetTop;
      const elementBottom = elementTop + selectedElement.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.offsetHeight;

      if (elementTop < containerTop) {
        container.scrollTop = elementTop;
      } else if (elementBottom > containerBottom) {
        container.scrollTop = elementBottom - container.offsetHeight;
      }
    }
  }

  /**
   * Select the current result
   */
  selectResult() {
    const results = this.state.results;
    if (results.length === 0 || this.state.selectedIndex < 0) return;

    const selectedResult = results[this.state.selectedIndex];
    
    // Close the search UI first
    this.close();
    
    // Then redirect to the URL
    if (selectedResult && selectedResult.url) {
      window.location.href = selectedResult.url;
    } else if (selectedResult && selectedResult.slug) {
      // Fallback to slug if URL is not available
      window.location.href = `/${selectedResult.slug}`;
    }
  }

  /**
   * Open the search modal
   */
  open() {
    this.state.isOpen = true;
    this.modal.classList.remove('hidden');
    this.searchInput.focus();
    
    // Check if search input is empty and hide elements if needed
    if (this.state.query.trim() === '') {
      this.modal.querySelector('.ms-keyboard-hints').classList.add('hidden');
      this.modal.querySelector('.ms-results-container').classList.add('ms-results-empty');
    } else {
      this.modal.querySelector('.ms-keyboard-hints').classList.remove('hidden');
      this.modal.querySelector('.ms-results-container').classList.remove('ms-results-empty');
    }
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Adjust for screen size
    this.adjustModalForScreenSize();
  }

  /**
   * Close the search modal
   */
  close() {
    this.state.isOpen = false;
    this.modal.classList.add('hidden');
    
    // Reset state
    this.state.selectedIndex = -1;
    
    // Allow body scrolling
    document.body.style.overflow = '';
  }

  /**
   * Perform search with current query
   */
  async performSearch() {
    const query = this.state.query.trim();
    
    // Show/hide common searches based on query
    if (query === '') {
      this.commonSearchesSection.classList.remove('hidden');
      this.hitsList.innerHTML = '';
      this.loadingState.classList.remove('active');
      this.emptyState.classList.remove('active');
      this.state.results = [];

      // Hide keyboard hints and results container when search is empty
      this.modal.querySelector('.ms-keyboard-hints').classList.add('hidden');
      this.modal.querySelector('.ms-results-container').classList.add('ms-results-empty');

      return;
    } else {
      this.commonSearchesSection.classList.add('hidden');

      // Show keyboard hints and results container when search has content
      this.modal.querySelector('.ms-keyboard-hints').classList.remove('hidden');
      this.modal.querySelector('.ms-results-container').classList.remove('ms-results-empty');
    }

    // Set loading state
    this.state.loading = true;
    this.loadingState.classList.add('active');
    this.emptyState.classList.remove('active');
    
    try {
      // Prepare search parameters
      const searchParams = {
        limit: 10,
        attributesToHighlight: Object.entries(this.config.searchFields)
          .filter(([_, config]) => config.highlight)
          .map(([field]) => field)
      };

      // Perform search
      const results = await this.index.search(query, searchParams);
      
      // Update state
      this.state.loading = false;
      this.state.results = results.hits;
      this.state.selectedIndex = -1;
      
      // Update UI
      this.renderResults(results.hits);
      
      // Hide loading state
      this.loadingState.classList.remove('active');
      
      // Show empty state if no results
      if (results.hits.length === 0) {
        this.emptyState.classList.add('active');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.state.loading = false;
      this.state.error = error;
      this.loadingState.classList.remove('active');
      
      // Show empty state with error message
      this.emptyState.classList.add('active');
      this.emptyState.querySelector('.ms-empty-message').textContent = 'An error occurred while searching. Please try again.';
    }
  }

  /**
   * Render search results
   */
  renderResults(hits) {
    this.hitsList.innerHTML = '';
    
    hits.forEach(hit => {
      const li = document.createElement('li');
      
      // Create result link
      const link = document.createElement('a');
      if (hit.url) {
        link.href = hit.url;
      } else {
        // Fallback to slug if URL is not available
        link.href = `/${hit.slug}`;
      }
      link.classList.add('ms-result-link');
      
      // Add click event listener to close search before navigation
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        // Navigate after a brief delay to ensure UI is closed
        setTimeout(() => {
          window.location.href = link.href;
        }, 10);
      });
      
      // Create result item container
      const resultItem = document.createElement('div');
      resultItem.classList.add('ms-result-item');
      
      // Create title
      const title = document.createElement('h3');
      title.classList.add('ms-result-title');
      
      // Clean up highlighting if needed
      let titleContent = hit._highlightResult?.title?.value || hit.title;
      titleContent = titleContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
      title.innerHTML = titleContent;
      
      // Create excerpt
      const excerpt = document.createElement('p');
      excerpt.classList.add('ms-result-excerpt');
      
      // Use highlighted excerpt if available, otherwise use regular excerpt
      if (hit._highlightResult?.excerpt?.value) {
        let excerptContent = hit._highlightResult.excerpt.value;
        excerptContent = excerptContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
        excerpt.innerHTML = excerptContent;
      } else if (hit._highlightResult?.html?.value) {
        // If excerpt isn't highlighted but HTML is, use a snippet from HTML
        const div = document.createElement('div');
        div.innerHTML = hit._highlightResult.html.value;
        const text = div.textContent || '';
        excerpt.innerHTML = text.substring(0, 150) + '...';
      } else {
        excerpt.textContent = hit.excerpt || '';
      }
      
      // Append elements
      resultItem.appendChild(title);
      resultItem.appendChild(excerpt);
      link.appendChild(resultItem);
      li.appendChild(link);
      this.hitsList.appendChild(li);
    });
  }
}

// Initialize search if configuration is available
if (window.__MS_SEARCH_CONFIG__) {
  window.ghostMeilisearchSearch = new GhostMeilisearchSearch(window.__MS_SEARCH_CONFIG__);
}

// Add a utility method to help with initialization
GhostMeilisearchSearch.initialize = function(config) {
  if (!window.ghostMeilisearchSearch) {
    window.ghostMeilisearchSearch = new GhostMeilisearchSearch(config);
  }
  return window.ghostMeilisearchSearch;
};

export default GhostMeilisearchSearch;