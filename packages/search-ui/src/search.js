import { MeiliSearch } from "meilisearch";
import "./styles.css";

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
            theme: "system",
            enableHighlighting: true,
            searchFields: {
                // Default fields to search and highlight
                title: { weight: 5, highlight: true },
                plaintext_public: { weight: 4, highlight: true }, // Changed from plaintext
                plaintext_private: { weight: 4, highlight: false }, // Added private field (searchable, not highlighted)
                excerpt: { weight: 3, highlight: true },
                tags: { weight: 2, highlight: false }, // Added tags
                authors: { weight: 2, highlight: false }, // Added authors
                // html: { weight: 1, highlight: true }, // Removed html by default
            },
            // AI Search Configuration
            enableAiSearch: false,
            aiSearchEmbedder: null,
            aiSearchLimit: 3, // Limit for AI results
        };

        // Merge default config with user config
        this.config = {
            ...defaultConfig,
            ...config,
            // Deep merge searchFields if provided by user
            searchFields: {
                ...defaultConfig.searchFields,
                ...(config.searchFields || {}),
            },
        };

        // Initialize state
        this.state = {
            isOpen: false,
            query: "",
            normalResults: [], // Renamed from results
            aiResults: [], // Added for AI search results
            loading: false,
            selectedIndex: -1,
            error: null,
        };

        // Initialize MeiliSearch client
        this.client = new MeiliSearch({
            host: this.config.meilisearchHost,
            apiKey: this.config.meilisearchApiKey,
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
        this.wrapper = document.createElement("div");
        this.wrapper.id = "ms-search-wrapper";
        document.body.appendChild(this.wrapper);

        // Create modal element
        this.modal = document.createElement("div");
        this.modal.id = "ms-search-modal";
        this.modal.classList.add("hidden");
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
            <div class="ms-ai-results-section hidden">
              <div class="ms-results-section-title">AI Suggestions</div>
              <ul class="ms-ai-hits-list"></ul>
            </div>
            <div class="ms-normal-results-section">
              <div class="ms-results-section-title">Keyword Matches</div>
              <ul class="ms-normal-hits-list"></ul>
            </div>
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
        this.searchInput = this.modal.querySelector(".ms-search-input");
        this.closeButton = this.modal.querySelector(".ms-close-button");
        this.aiResultsSection = this.modal.querySelector(
            ".ms-ai-results-section"
        );
        this.aiHitsList = this.modal.querySelector(".ms-ai-hits-list");
        this.normalResultsSection = this.modal.querySelector(
            ".ms-normal-results-section"
        ); // Added for potential styling/visibility control
        this.normalHitsList = this.modal.querySelector(".ms-normal-hits-list"); // Renamed from hitsList
        this.loadingState = this.modal.querySelector(".ms-loading-state");
        this.emptyState = this.modal.querySelector(".ms-empty-state");
        this.commonSearchesList = this.modal.querySelector(
            ".ms-common-searches-list"
        );
        this.commonSearchesSection = this.modal.querySelector(
            ".ms-common-searches"
        );

        // Populate common searches
        this.populateCommonSearches();

        // Apply theme based on page color scheme
        this.applyTheme();
    }

    /**
     * Populate common searches section
     */
    populateCommonSearches() {
        if (
            !this.config.commonSearches ||
            this.config.commonSearches.length === 0
        ) {
            this.commonSearchesSection.classList.add("hidden");
            return;
        }

        this.commonSearchesList.innerHTML = "";
        this.config.commonSearches.forEach((search) => {
            const button = document.createElement("button");
            button.classList.add("ms-common-search-btn");
            button.textContent = search;
            button.addEventListener("click", () => {
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
        const htmlColorScheme =
            document.documentElement.getAttribute("data-color-scheme");
        const bodyColorScheme = document.body.getAttribute("data-color-scheme");
        const pageColorScheme =
            htmlColorScheme || bodyColorScheme || this.config.theme;

        // Remove any existing classes
        this.wrapper.classList.remove("dark", "light");

        if (pageColorScheme === "dark") {
            this.wrapper.classList.add("dark");
        } else if (pageColorScheme === "system") {
            // Check system preference
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            if (prefersDark) {
                this.wrapper.classList.add("dark");
            } else {
                this.wrapper.classList.add("light");
            }

            // Listen for changes in system preference
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", (e) => {
                    this.wrapper.classList.remove("dark", "light");
                    if (e.matches) {
                        this.wrapper.classList.add("dark");
                    } else {
                        this.wrapper.classList.add("light");
                    }
                });
        } else {
            // Default to light
            this.wrapper.classList.add("light");
        }

        // Add MutationObserver to watch for changes in data-color-scheme
        this.setupColorSchemeObserver();
    }

    /**
     * Set up observer to watch for changes in data-color-scheme
     */
    setupColorSchemeObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-color-scheme"
                ) {
                    this.applyTheme();
                }
            });
        });

        // Observe both html and body for changes
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-color-scheme"],
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["data-color-scheme"],
        });
    }

    /**
     * Add event listeners
     */
    addEventListeners() {
        // Close button click
        this.closeButton.addEventListener("click", () => this.close());

        // Backdrop click
        this.modal
            .querySelector(".ms-backdrop")
            .addEventListener("click", () => this.close());

        // Search input
        this.searchInput.addEventListener("input", () => {
            this.state.query = this.searchInput.value;
            this.performSearch();
        });

        // Keyboard navigation
        document.addEventListener("keydown", this.handleKeyDown.bind(this));

        // Add click event to search triggers
        document.querySelectorAll("[data-ghost-search]").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                this.open();
            });
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                this.open();
            }

            // Forward slash (/) when not in an input
            if (
                e.key === "/" &&
                !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
            ) {
                e.preventDefault();
                this.open();
            }
        });

        // Handle window resize
        window.addEventListener("resize", () => {
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
            case "Escape":
                e.preventDefault();
                this.close();
                break;
            case "ArrowDown":
                e.preventDefault(); // Prevent page scrolling
                this.navigateResults(1);
                break;
            case "ArrowUp":
                e.preventDefault(); // Prevent page scrolling
                this.navigateResults(-1);
                break;
            case "Enter":
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
            this.modal.querySelector(".ms-modal-content").style.height =
                "100vh";
            this.modal.querySelector(".ms-results-container").style.maxHeight =
                "calc(100vh - 7rem)";
        } else {
            // Desktop optimizations
            this.modal.querySelector(".ms-modal-content").style.height = "";
            this.modal.querySelector(".ms-results-container").style.maxHeight =
                "";
        }
    }

    /**
     * Navigate through search results
     */
    navigateResults(direction) {
        // Combine results from both lists for navigation
        const combinedResults = [
            ...(this.config.enableAiSearch ? this.state.aiResults : []),
            ...this.state.normalResults,
        ];

        const totalResults = combinedResults.length;
        if (totalResults === 0) return;

        // Calculate new index
        let newIndex = this.state.selectedIndex + direction;

        // Wrap around
        if (newIndex < 0) {
            newIndex = totalResults - 1;
        } else if (newIndex >= totalResults) {
            newIndex = 0;
        }

        // Update selected index
        this.state.selectedIndex = newIndex;

        // Update UI
        this.updateSelectedResult();
    }

    /**
     * Update the selected result in the UI across both lists
     */
    updateSelectedResult() {
        // Get all result links from both lists
        const resultElements = this.modal.querySelectorAll(".ms-result-link");

        // Remove selected class from all results
        resultElements.forEach((el) => el.classList.remove("ms-selected"));

        // Add selected class to current result if index is valid
        if (
            this.state.selectedIndex >= 0 &&
            this.state.selectedIndex < resultElements.length
        ) {
            const selectedElement = resultElements[this.state.selectedIndex];
            selectedElement.classList.add("ms-selected");

            // Scroll into view if needed
            const container = this.modal.querySelector(".ms-results-container");
            // Get position relative to the container, not just the list
            const elementTop = selectedElement.offsetTop - container.offsetTop;
            const elementBottom = elementTop + selectedElement.offsetHeight;
            const containerScrollTop = container.scrollTop;
            const containerVisibleHeight = container.offsetHeight;

            if (elementTop < containerScrollTop) {
                // Element is above the visible area
                container.scrollTop = elementTop;
            } else if (
                elementBottom >
                containerScrollTop + containerVisibleHeight
            ) {
                // Element is below the visible area
                container.scrollTop = elementBottom - containerVisibleHeight;
            }
            // No scrolling needed if element is already within the visible area
        }
    }

    /**
     * Select the current result from the combined list
     */
    selectResult() {
        // Combine results from both lists
        const combinedResults = [
            ...(this.config.enableAiSearch ? this.state.aiResults : []),
            ...this.state.normalResults,
        ];

        const totalResults = combinedResults.length;
        if (
            totalResults === 0 ||
            this.state.selectedIndex < 0 ||
            this.state.selectedIndex >= totalResults
        ) {
            return; // No valid selection
        }

        const selectedResult = combinedResults[this.state.selectedIndex];

        // Close the search UI first
        this.close();

        // Then redirect to the URL or slug
        const targetUrl =
            selectedResult.url ||
            (selectedResult.slug ? `/${selectedResult.slug}` : null);

        if (targetUrl) {
            // Use setTimeout to ensure the close animation can start before navigation
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 10);
        } else {
            console.warn("Selected result has no URL or slug:", selectedResult);
        }
    }

    /**
     * Open the search modal
     */
    open() {
        this.state.isOpen = true;
        this.modal.classList.remove("hidden");
        this.searchInput.focus();

        // Check if search input is empty and hide elements if needed
        if (this.state.query.trim() === "") {
            this.modal
                .querySelector(".ms-keyboard-hints")
                .classList.add("hidden");
            this.modal
                .querySelector(".ms-results-container")
                .classList.add("ms-results-empty");
        } else {
            this.modal
                .querySelector(".ms-keyboard-hints")
                .classList.remove("hidden");
            this.modal
                .querySelector(".ms-results-container")
                .classList.remove("ms-results-empty");
        }

        // Prevent body scrolling
        document.body.style.overflow = "hidden";

        // Adjust for screen size
        this.adjustModalForScreenSize();
    }

    /**
     * Close the search modal
     */
    close() {
        this.state.isOpen = false;
        this.modal.classList.add("hidden");

        // Reset state
        this.state.selectedIndex = -1;

        // Allow body scrolling
        document.body.style.overflow = "";
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

        // Reset results and hide AI section initially
        this.state.aiResults = [];
        this.state.normalResults = [];
        this.aiResultsSection.classList.add("hidden");
        this.normalResultsSection.classList.remove("hidden"); // Ensure normal section is visible

        // Show/hide common searches based on query
        if (query === "") {
            this.commonSearchesSection.classList.remove("hidden");
            this.aiHitsList.innerHTML = ""; // Clear AI list
            this.normalHitsList.innerHTML = ""; // Clear normal list
            this.loadingState.classList.remove("active");
            this.emptyState.classList.remove("active");

            // Hide keyboard hints and results container when search is empty
            this.modal
                .querySelector(".ms-keyboard-hints")
                .classList.add("hidden");
            this.modal
                .querySelector(".ms-results-container")
                .classList.add("ms-results-empty");

            return;
        } else {
            this.commonSearchesSection.classList.add("hidden");

            // Show keyboard hints and results container when search has content
            this.modal
                .querySelector(".ms-keyboard-hints")
                .classList.remove("hidden");
            this.modal
                .querySelector(".ms-results-container")
                .classList.remove("ms-results-empty");
        }

        // Set loading state
        this.state.loading = true;
        this.loadingState.classList.add("active");
        this.emptyState.classList.remove("active");

        try {
            // Prepare base search parameters
            const baseSearchParams = {
                limit: 100, // Consider making this configurable?
                // Dynamically get fields to highlight based on config
                attributesToHighlight: Object.entries(this.config.searchFields)
                    .filter(([_, fieldConfig]) => fieldConfig.highlight)
                    .map(([fieldName]) => fieldName),
                attributesToRetrieve: [
                    "id", // Needed for potential logic
                    "title",
                    "url",
                    "excerpt",
                    "plaintext_public", // Retrieve new public field
                    "tags",
                    "authors",
                    "slug", // Ensure slug is retrieved
                    "visibility", // Retrieve visibility
                    "_matchesInfo", // Retrieve match info
                    // Add any other fields needed for display or logic
                ],
                highlightPreTag: "<em>", // Ensure consistent highlighting tags
                highlightPostTag: "</em>",
            };

            let aiSearchPromise = Promise.resolve({ hits: [] }); // Default to empty results
            let normalSearchPromise;

            // Dynamically get fields to search on based on config weights
            const attributesToSearchOn = Object.entries(
                this.config.searchFields
            )
                .sort(([, a], [, b]) => (b.weight || 0) - (a.weight || 0)) // Sort by weight desc
                .map(([fieldName]) => fieldName);

            // Add plaintext_private to searchable attributes for normal search
            const normalAttributesToSearchOn = [
                ...attributesToSearchOn,
                "plaintext_private", // Always search private field
            ];

            // --- Conditional Search Execution ---
            if (this.config.enableAiSearch && this.config.aiSearchEmbedder) {
                // --- AI Search Enabled ---
                this.aiResultsSection.classList.remove("hidden"); // Show AI section

                // AI Search Parameters (using hybrid)
                const aiSearchParams = {
                    ...baseSearchParams,
                    limit: this.config.aiSearchLimit, // Apply AI-specific limit
                    hybrid: {
                        embedder: this.config.aiSearchEmbedder,
                        // semanticRatio: 0.9 // Optional: Tune ratio if needed
                    },
                    // Let hybrid handle searchable attributes and matching strategy
                };
                aiSearchPromise = this.index.search(query, aiSearchParams);

                // Normal Search Parameters (when AI is also enabled)
                const normalSearchParams = {
                    ...baseSearchParams,
                    attributesToSearchOn: normalAttributesToSearchOn, // Use derived + private
                    matchingStrategy: "last", // Default strategy for keyword search
                };
                normalSearchPromise = this.index.search(
                    query,
                    normalSearchParams
                );
            } else {
                // --- AI Search Disabled (Standard Search Only) ---
                this.aiResultsSection.classList.add("hidden"); // Ensure AI section is hidden

                // Check for exact phrase matching (only when AI is disabled)
                const hasQuotes = query.startsWith('"') && query.endsWith('"');
                const exactPhrase = this.extractTextBetweenQuotes(query);
                const isExactMatch = hasQuotes || exactPhrase !== null;

                const normalSearchParams = {
                    ...baseSearchParams,
                    attributesToSearchOn: normalAttributesToSearchOn, // Use derived + private
                };

                if (isExactMatch) {
                    // Handle exact phrase search (existing logic, but search across all specified fields)
                    const searchPhrase = hasQuotes
                        ? query.slice(1, -1)
                        : exactPhrase;
                    normalSearchParams.matchingStrategy = "all"; // Use 'all' for initial fetch

                    // Perform initial search and then filter manually across searchable fields
                    normalSearchPromise = this.index
                        .search(searchPhrase, normalSearchParams)
                        .then((initialResults) => {
                            if (initialResults.hits.length > 0) {
                                const lowerPhrase = searchPhrase.toLowerCase();
                                const filteredHits = initialResults.hits.filter(
                                    (hit) => {
                                        // Check all searchable fields for the phrase
                                        return normalAttributesToSearchOn.some(
                                            (field) =>
                                                hit[field] &&
                                                typeof hit[field] ===
                                                    "string" &&
                                                hit[field]
                                                    .toLowerCase()
                                                    .includes(lowerPhrase)
                                        );
                                    }
                                );
                                // Return the structure MeiliSearch expects, with filtered hits
                                return {
                                    ...initialResults,
                                    hits: filteredHits,
                                };
                            }
                            return initialResults; // Return original if no hits initially
                        });
                } else {
                    // Regular keyword search
                    normalSearchParams.matchingStrategy = "last";
                    normalSearchPromise = this.index.search(
                        query,
                        normalSearchParams
                    );
                }
            }

            // --- Execute Searches and Process Results ---
            const [aiResults, normalResults] = await Promise.all([
                aiSearchPromise,
                normalSearchPromise,
            ]);

            // Update state
            this.state.loading = false;
            this.state.aiResults = aiResults.hits || [];
            this.state.normalResults = normalResults.hits || [];
            this.state.selectedIndex = -1; // Reset selection
            this.state.error = null; // Clear previous errors

            // Update UI
            this.renderResults(); // Call renderResults without arguments

            // Hide loading state
            this.loadingState.classList.remove("active");

            // Show empty state if *both* result sets are empty
            if (
                this.state.aiResults.length === 0 &&
                this.state.normalResults.length === 0
            ) {
                this.emptyState.classList.add("active");
                this.emptyState.querySelector(".ms-empty-message").textContent =
                    "No results found for your search.";
            }
        } catch (error) {
            console.error("Search error:", error);
            this.state.loading = false;
            this.state.error = error;
            this.state.aiResults = []; // Clear results on error
            this.state.normalResults = [];
            this.loadingState.classList.remove("active");
            this.aiResultsSection.classList.add("hidden"); // Hide AI section on error

            // Show empty state with error message
            this.emptyState.classList.add("active");
            this.emptyState.querySelector(".ms-empty-message").textContent =
                "An error occurred while searching. Please try again.";

            // Render empty results
            this.renderResults();
        }
    }

    /**
     * Render search results based on current state
     */
    renderResults() {
        // Clear previous results
        this.aiHitsList.innerHTML = "";
        this.normalHitsList.innerHTML = "";

        const query = this.state.query.trim();

        // Render AI Results
        if (this.config.enableAiSearch && this.state.aiResults.length > 0) {
            this.aiResultsSection.classList.remove("hidden");
            this.state.aiResults.forEach((hit) => {
                const hitElement = this._createHitElement(hit, query);
                this.aiHitsList.appendChild(hitElement);
            });
        } else {
            this.aiResultsSection.classList.add("hidden");
        }

        // Render Normal Results
        if (this.state.normalResults.length > 0) {
            this.normalResultsSection.classList.remove("hidden"); // Ensure section is visible
            this.state.normalResults.forEach((hit) => {
                const hitElement = this._createHitElement(hit, query);
                this.normalHitsList.appendChild(hitElement);
            });
        } else {
            // Optionally hide the "Keyword Matches" section if AI is enabled and has results, but normal doesn't
            // if (this.config.enableAiSearch && this.state.aiResults.length > 0) {
            //     this.normalResultsSection.classList.add('hidden');
            // } else {
            this.normalResultsSection.classList.remove("hidden"); // Default: keep visible if it's the only potential section
            // }
        }

        // Update selection state (important after re-rendering)
        this.updateSelectedResult();
    }

    /**
     * Creates a single hit element (<li>) for the results list.
     * @param {object} hit - The MeiliSearch hit object.
     * @param {string} query - The current search query for highlighting.
     * @returns {HTMLElement} The created list item element.
     * @private
     */
    _createHitElement(hit, query) {
        // console.log("--- Processing Hit ---", JSON.stringify(hit)); // DEBUG: Log the raw hit
        const li = document.createElement("li");
        const visibility = hit.visibility || "public"; // Default to public if missing
        // console.log("Determined visibility:", visibility); // DEBUG: Log determined visibility

        // --- Helper for basic highlighting ---
        const highlightText = (text, terms) => {
            if (
                !this.config.enableHighlighting ||
                !terms ||
                terms.length === 0 ||
                !text
            ) {
                return text;
            }
            let highlightedText = text;
            terms.forEach((term) => {
                try {
                    const escapedTerm = term.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    );
                    const regex = new RegExp(`(${escapedTerm})`, "gi");
                    highlightedText = highlightedText.replace(
                        regex,
                        "<em>$1</em>"
                    );
                } catch (e) {
                    console.warn("Error highlighting term:", term, e);
                }
            });
            return highlightedText;
        };

        // --- Get query terms for basic highlighting ---
        const queryTerms = query
            ? query.split(/\s+/).filter((w) => w.length >= 2)
            : [];

        // --- Create result link (common logic) ---
        const link = document.createElement("a");
        if (hit.url) {
            link.href = hit.url;
        } else if (hit.slug) {
            link.href = `/${hit.slug}`;
        } else {
            link.href = "#";
            link.style.pointerEvents = "none";
        }
        link.classList.add("ms-result-link");
        link.addEventListener("click", (e) => {
            if (link.style.pointerEvents === "none") {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            this.close();
            setTimeout(() => {
                window.location.href = link.href;
            }, 10);
        });

        // --- Create result item container (common logic) ---
        const resultItem = document.createElement("div");
        resultItem.classList.add("ms-result-item");

        // --- Title ---
        const title = document.createElement("h3");
        title.classList.add("ms-result-title");
        let titleContent = hit.title || "Untitled";

        // --- Excerpt / Content ---
        const excerpt = document.createElement("p");
        excerpt.classList.add("ms-result-excerpt");
        let excerptContent = "";

        // --- Helper to generate snippet ---
        const generateSnippet = (
            textContent,
            termsToHighlight,
            phraseToHighlight
        ) => {
            if (!textContent) return "";
            if (!this.config.enableHighlighting || !query) {
                return (
                    textContent.substring(0, 150) +
                    (textContent.length > 150 ? "..." : "")
                );
            }

            let firstMatchPos = -1;
            let matchLength = 0;
            const lowerTextContent = textContent.toLowerCase();

            if (phraseToHighlight) {
                const lowerPhrase = phraseToHighlight.toLowerCase();
                const pos = lowerTextContent.indexOf(lowerPhrase);
                if (pos !== -1) {
                    firstMatchPos = pos;
                    matchLength = phraseToHighlight.length;
                }
            } else {
                for (const word of termsToHighlight) {
                    const lowerWord = word.toLowerCase();
                    const pos = lowerTextContent.indexOf(lowerWord);
                    if (
                        pos !== -1 &&
                        (firstMatchPos === -1 || pos < firstMatchPos)
                    ) {
                        firstMatchPos = pos;
                        matchLength = word.length;
                    }
                }
            }

            let snippet = "";
            if (firstMatchPos !== -1) {
                const snippetRadius = 60;
                const startPos = Math.max(0, firstMatchPos - snippetRadius);
                const endPos = Math.min(
                    textContent.length,
                    firstMatchPos + matchLength + snippetRadius
                );
                snippet = textContent.substring(startPos, endPos);
                if (startPos > 0) snippet = "..." + snippet;
                if (endPos < textContent.length) snippet = snippet + "...";
            } else {
                snippet =
                    textContent.substring(0, 150) +
                    (textContent.length > 150 ? "..." : "");
            }

            const finalTerms = phraseToHighlight
                ? [phraseToHighlight]
                : termsToHighlight;
            return highlightText(snippet, finalTerms);
        };

        // --- Conditional Rendering based on Visibility ---
        const exactPhrase = this.extractTextBetweenQuotes(query);
        const hasQuotes = query.startsWith('"') && query.endsWith('"');
        const phraseToHighlight =
            exactPhrase || (hasQuotes ? query.slice(1, -1) : null);
        const wordsToHighlight = phraseToHighlight
            ? []
            : queryTerms.sort((a, b) => b.length - a.length);

        // Title Highlighting (prefer _formatted, fallback to basic)
        const formattedTitle =
            this.config.enableHighlighting &&
            (hit._formatted?.title || hit._highlightResult?.title?.value);
        if (formattedTitle) {
            titleContent = formattedTitle;
        } else {
            titleContent = highlightText(titleContent, queryTerms);
        }

        if (visibility === "public") {
            // --- Public Post Rendering ---
            const textContent = hit.plaintext_public || hit.excerpt || "";
            excerptContent = generateSnippet(
                textContent,
                wordsToHighlight,
                phraseToHighlight
            );
        } else {
            // --- Non-Public Post Rendering ---
            // Check if there was a match in the public part
            const hasPublicMatch =
                hit._matchesInfo?.plaintext_public?.length > 0;

            if (hasPublicMatch && this.config.enableHighlighting) {
                // If match in public part, generate snippet from public part
                const publicTextContent = hit.plaintext_public || "";
                excerptContent = generateSnippet(
                    publicTextContent,
                    wordsToHighlight,
                    phraseToHighlight
                );
            } else {
                // Otherwise, show raw excerpt (no snippet/highlight from private)
                excerptContent = hit.excerpt || "";
                // No highlighting for excerpt in this case
            }
        }
        // console.log("Final excerptContent before setting HTML:", excerptContent); // DEBUG

        // --- Set content (common logic) ---
        title.innerHTML = titleContent;
        excerpt.innerHTML = excerptContent; // Use innerHTML to render highlights

        // --- Append elements (common logic) ---
        resultItem.appendChild(title);
        resultItem.appendChild(excerpt);
        link.appendChild(resultItem);
        li.appendChild(link);

        return li;
    }
} // End of GhostMeilisearchSearch class

// Initialize search if configuration is available
if (window.__MS_SEARCH_CONFIG__) {
    window.ghostMeilisearchSearch = new GhostMeilisearchSearch(
        window.__MS_SEARCH_CONFIG__
    );
}

// Add a utility method to help with initialization
GhostMeilisearchSearch.initialize = function (config) {
    if (!window.ghostMeilisearchSearch) {
        window.ghostMeilisearchSearch = new GhostMeilisearchSearch(config);
    }
    return window.ghostMeilisearchSearch;
};

export default GhostMeilisearchSearch;
