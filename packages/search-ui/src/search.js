import { MeiliSearch } from 'meilisearch';
import './styles.css';

/**
 * Ghost Meilisearch Search UI
 * A search UI for Ghost blogs using Meilisearch
 */
class GhostMeilisearchSearch {
  constructor(config = {}) {
    // Default configuration
    const defaultConfig = {
      meilisearchHost: null,
      meilisearchApiKey: null,
      indexName: null,
      commonSearches: [],
      theme: 'system',
      enableHighlighting: true,
      searchFields: {
        title: { weight: 5, highlight: true },
        plaintext: { weight: 4, highlight: true },
        excerpt: { weight: 3, highlight: true },
        html: { weight: 1, highlight: true }
      }
    };

    // Merge default config with user config
    this.config = {
      ...defaultConfig,
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

    // Initialize MeiliSearch client
    this.client = new MeiliSearch({
      host: this.config.meilisearchHost,
      apiKey: this.config.meilisearchApiKey
    });

    // Get index
    this.index = this.client.index(this.config.indexName);

    // Create DOM elements
    this.createDOMElements();

    // Apply theme
    this.applyTheme();

    // Setup color scheme observer
    this.setupColorSchemeObserver();

    // Add event listeners
    this.addEventListeners();

    // Populate common searches
    this.populateCommonSearches();

    // Adjust modal for screen size
    this.adjustModalForScreenSize();
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
   * Extract text between double quotes for exact phrase matching
   * @param {string} text - The text to extract from
   * @returns {string|null} The extracted text or null if no quoted phrase found
   */
  extractTextBetweenQuotes(text) {
    if (!text) return null;
    const match = text.match(/"([^"]+)"/);
    return match ? match[1] : null;
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
        limit: 50, // Increased from 20 to 50 to ensure we have enough results to filter
        attributesToHighlight: Object.entries(this.config.searchFields)
          .filter(([_, config]) => config.highlight)
          .map(([field]) => field),
        attributesToRetrieve: ['title', 'url', 'excerpt', 'plaintext', 'tags'],
        // Use 'all' matching strategy for all searches to require all words to be present
        matchingStrategy: 'all',
        // Specify which attributes to search on
        attributesToSearchOn: ['title', 'plaintext', 'excerpt']
      };

      // Check if the query is wrapped in quotes for exact phrase matching
      const hasQuotes = query.startsWith('"') && query.endsWith('"');
      
      // Extract exact phrases to support phrase matching
      const exactPhrase = this.extractTextBetweenQuotes(query);
      
      // Determine the search query and phrase to match
      let searchQuery = query;
      let phraseToMatch = query; // By default, try to match the entire query as a phrase
      
      // If there's an exact phrase or the query is wrapped in quotes, use that instead
      if (exactPhrase || hasQuotes) {
        // Use the exact phrase as the search query (remove quotes if the entire query is quoted)
        const extractedPhrase = exactPhrase || query.slice(1, -1);
        searchQuery = extractedPhrase;
        phraseToMatch = extractedPhrase;
      }

      // Perform search
      const results = await this.index.search(searchQuery, searchParams);
      
      // Post-process the results to prioritize exact phrase matches
      // Convert to lowercase for case-insensitive matching
      const lowerPhrase = phraseToMatch.toLowerCase();
      
      // First, find results that contain the exact phrase
      const exactMatches = results.hits.filter(hit => {
        return (
          (hit.title && hit.title.toLowerCase().includes(lowerPhrase)) ||
          (hit.plaintext && hit.plaintext.toLowerCase().includes(lowerPhrase)) ||
          (hit.excerpt && hit.excerpt.toLowerCase().includes(lowerPhrase))
        );
      });
      
      // Then, include the remaining results that matched all words but not as an exact phrase
      const otherMatches = results.hits.filter(hit => {
        return !exactMatches.includes(hit);
      });
      
      // Combine the results: exact matches first, then other matches
      const finalResults = [...exactMatches, ...otherMatches];
      
      // Update state
      this.state.loading = false;
      this.state.results = finalResults;
      this.state.selectedIndex = -1;
      
      // Update UI
      this.renderResults(finalResults);
      
      // Hide loading state
      this.loadingState.classList.remove('active');
      
      // Show empty state if no results
      if (finalResults.length === 0) {
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
    
    // Get the current search query
    const query = this.state.query.trim();
    
    // Extract exact phrase if present
    const exactPhrase = this.extractTextBetweenQuotes(query);
    
    // Check if the query is wrapped in quotes
    const hasQuotes = query.startsWith('"') && query.endsWith('"');
    
    // Determine the phrase to highlight
    const phraseToHighlight = exactPhrase || (hasQuotes ? query.slice(1, -1) : query);
    
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
      
      // Get the title content
      let titleContent = hit.title || 'Untitled';
      
      // Apply custom highlighting to title if enabled
      if (query && this.config.enableHighlighting) {
        // First use MeiliSearch's highlighting if available
        if (hit._highlightResult?.title?.value) {
          titleContent = hit._highlightResult.title.value;
          // Clean up MeiliSearch highlighting format
          titleContent = titleContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
        } else {
          // Apply our own highlighting
          // For exact phrase searches, highlight the entire phrase first
          if (phraseToHighlight && phraseToHighlight.length > 2) {
            try {
              // Escape special regex characters
              const escapedPhrase = phraseToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              
              // Create a case-insensitive regex for the exact phrase
              const phraseRegex = new RegExp(`(${escapedPhrase})`, 'gi');
              
              // Apply highlighting
              titleContent = titleContent.replace(phraseRegex, '<em>$1</em>');
            } catch (e) {
              console.warn('Error highlighting exact phrase in title:', e);
            }
          }
          
          // Then highlight individual words
          if (!exactPhrase && !hasQuotes) {
            const words = query.split(/\s+/);
            
            // Sort words by length in descending order to handle longer phrases first
            words.sort((a, b) => b.length - a.length);
            
            for (const word of words) {
              if (word.length < 2) continue; // Skip very short words
              try {
                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedWord})`, 'gi');
                
                // Don't re-highlight words that are already part of a highlighted phrase
                titleContent = titleContent.replace(
                  regex, 
                  function(match) {
                    // Only highlight if not already inside an em tag
                    if (/<em[^>]*>[^<]*$/i.test(titleContent.substring(0, titleContent.indexOf(match))) &&
                        /^[^<]*<\/em>/i.test(titleContent.substring(titleContent.indexOf(match) + match.length))) {
                      return match; // Already highlighted
                    }
                    return '<em>' + match + '</em>'; // Use concatenation instead of $&
                  }
                );
              } catch (e) {
                console.warn('Error highlighting word in title:', word, e);
              }
            }
          }
        }
      }
      
      title.innerHTML = titleContent;
      
      // Create excerpt
      const excerpt = document.createElement('p');
      excerpt.classList.add('ms-result-excerpt');
      
      // Always use plaintext as our primary text content source
      let textContent = hit.plaintext || '';
      
      // If for some reason plaintext is empty, use excerpt as fallback
      if (!textContent && hit.excerpt) {
        textContent = hit.excerpt;
      }
      
      // Apply highlighting to excerpt
      let excerptContent = textContent;
      
      if (this.config.enableHighlighting) {
        // First use MeiliSearch's highlighting if available
        if (hit._highlightResult?.plaintext?.value) {
          excerptContent = hit._highlightResult.plaintext.value;
          // Clean up MeiliSearch highlighting format
          excerptContent = excerptContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
        } else if (hit._highlightResult?.excerpt?.value) {
          excerptContent = hit._highlightResult.excerpt.value;
          excerptContent = excerptContent.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
        } else {
          // Apply our own highlighting
          // For exact phrase searches, try to find and highlight the phrase
          if (phraseToHighlight && phraseToHighlight.length > 2) {
            try {
              // Find the position of the phrase in the text (case-insensitive)
              const lowerText = textContent.toLowerCase();
              const lowerPhrase = phraseToHighlight.toLowerCase();
              const phrasePosition = lowerText.indexOf(lowerPhrase);
              
              if (phrasePosition !== -1) {
                // Extract a portion of text around the phrase for context
                const startPos = Math.max(0, phrasePosition - 60);
                const endPos = Math.min(textContent.length, phrasePosition + phraseToHighlight.length + 60);
                excerptContent = textContent.substring(startPos, endPos);
                
                // Add ellipsis if needed
                if (startPos > 0) excerptContent = '...' + excerptContent;
                if (endPos < textContent.length) excerptContent = excerptContent + '...';
                
                // Highlight the phrase
                const escapedPhrase = phraseToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const phraseRegex = new RegExp(`(${escapedPhrase})`, 'gi');
                excerptContent = excerptContent.replace(phraseRegex, '<em>$1</em>');
              }
            } catch (e) {
              console.warn('Error highlighting exact phrase in excerpt:', e);
            }
          }
          
          // If no exact phrase or it wasn't found, highlight individual words
          if ((!phraseToHighlight || excerptContent === textContent) && query) {
            const words = query.split(/\s+/);
            
            // Sort words by length in descending order
            words.sort((a, b) => b.length - a.length);
            
            // Find the first occurrence of any word to center the excerpt
            let firstMatchPos = -1;
            let matchedWord = '';
            
            for (const word of words) {
              if (word.length < 2) continue;
              const lowerText = textContent.toLowerCase();
              const lowerWord = word.toLowerCase();
              const wordPos = lowerText.indexOf(lowerWord);
              if (wordPos !== -1 && (firstMatchPos === -1 || wordPos < firstMatchPos)) {
                firstMatchPos = wordPos;
                matchedWord = word;
              }
            }
            
            // If we found a match, extract text around it
            if (firstMatchPos !== -1) {
              const startPos = Math.max(0, firstMatchPos - 60);
              const endPos = Math.min(textContent.length, firstMatchPos + matchedWord.length + 60);
              excerptContent = textContent.substring(startPos, endPos);
              
              // Add ellipsis if needed
              if (startPos > 0) excerptContent = '...' + excerptContent;
              if (endPos < textContent.length) excerptContent = excerptContent + '...';
              
              // Highlight all matching words
              for (const word of words) {
                if (word.length < 2) continue;
                try {
                  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`(${escapedWord})`, 'gi');
                  
                  // Don't re-highlight words that are already part of a highlighted phrase
                  excerptContent = excerptContent.replace(
                    regex, 
                    function(match) {
                      // Only highlight if not already inside an em tag
                      if (/<em[^>]*>[^<]*$/i.test(excerptContent.substring(0, excerptContent.indexOf(match))) &&
                          /^[^<]*<\/em>/i.test(excerptContent.substring(excerptContent.indexOf(match) + match.length))) {
                        return match; // Already highlighted
                      }
                      return '<em>' + match + '</em>'; // Use concatenation instead of $&
                    }
                  );
                } catch (e) {
                  console.warn('Error highlighting word in excerpt:', word, e);
                }
              }
            }
          }
        }
      } else {
        // If highlighting is disabled, just use a simple excerpt
        if (textContent.length > 150) {
          excerptContent = textContent.substring(0, 150) + '...';
        }
      }
      
      excerpt.innerHTML = excerptContent;
      
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