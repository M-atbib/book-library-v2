<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { configure, infiniteHits, stats } from "instantsearch.js/es/widgets";
  import { SortBy, Facet, getBookState } from "$lib/features";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const STORAGE_KEY = "book_filter_state";
  const bookState = getBookState();
  let widgetsAdded = false;
  let clickListener: ((e: MouseEvent) => void) | null = null;
  let popStateListener: (() => void) | null = null;

  // Watch page changes to handle navigation
  $effect(() => {
    if ($page && browser) {
      // When we're on the books page, ensure search is started and restore filters
      if ($page.url.pathname.includes("/books")) {
        if (!bookState.searchInitialized) {
          bookState.startSearch();
          
          // Try to restore saved filters from localStorage
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) {
            try {
              const parsedState = JSON.parse(savedState);
              bookState.search.setUiState({ books: parsedState });
            } catch (error) {
              console.error("Error restoring filters from localStorage:", error);
            }
          }
        }
      }
    }
  });

  // Function to save current filter state to localStorage
  function saveFilterState(): void {
    if (browser && bookState.searchInitialized) {
      const currentState = bookState.search.getUiState().books || {};
      if (Object.keys(currentState).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      }
    }
  }

  onMount(() => {
    // Add analytics middleware only once
    const analyticsMiddleware = () => {
      return {
        onStateChange() {
          if (browser) {
            import("firebase/analytics").then(
              ({ getAnalytics, logEvent, setCurrentScreen }) => {
                const analytics = getAnalytics();
                const currentPath = (
                  window.location.pathname + window.location.search
                ).toLowerCase();

                setCurrentScreen(analytics, currentPath);
                logEvent(analytics, "page_view", {
                  page_path: currentPath,
                });
              }
            );
          }
        },
        subscribe() {},
        unsubscribe() {},
      };
    };

    bookState.search.use(analyticsMiddleware);

    // Set up a middleware to save state changes
    // Using the general middleware pattern instead of mainIndex.use
    bookState.search.use(() => {
      return {
        onStateChange({ uiState }) {
          if (browser && $page.url.pathname.includes("/books")) {
            // Only save when we're on the books page
            const currentState = uiState.books || {};
            if (Object.keys(currentState).length > 0) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
            }
          }
        },
        subscribe() {},
        unsubscribe() {},
      };
    });

    // Handle link click navigation for book details
    clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const bookLink = target.closest('a[href^="/books/"]');
      
      if (bookLink && !e.ctrlKey && !e.metaKey && !e.shiftKey && bookLink.getAttribute('href') !== '/books') {
        // It's a book detail link being clicked
        e.preventDefault();
        const href = bookLink.getAttribute('href');
        if (href) {
          // Save current filter state before navigating to detail page
          saveFilterState();
          
          // Navigate programmatically with replaceState:true to avoid history stacking
          goto(href, { 
            keepFocus: true, 
            noScroll: false, 
            replaceState: true  // Change this to true to avoid adding to browser history stack
          });
        }
      }
    };
    
    document.addEventListener('click', clickListener);

    // Also handle popstate events (browser back/forward buttons)
    popStateListener = () => {
      if (browser && $page.url.pathname.includes("/books") && bookState.searchInitialized) {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            bookState.search.setUiState({ books: parsedState });
          } catch (error) {
            console.error("Error restoring filters from localStorage:", error);
          }
        }
      }
    };
    
    window.addEventListener('popstate', popStateListener);

    // Only add widgets once
    if (!widgetsAdded) {
      bookState.search.addWidgets([
        stats({
          container: "#stats",
          templates: {
            text: ({ nbHits, page, processingTimeMS }) => {
              const firstResult = page * 20 + 1;
              const lastResult = Math.min((page + 1) * 20, nbHits);
              return `Showing ${firstResult}-${lastResult} of ${nbHits.toLocaleString()} books found in ${processingTimeMS}ms`;
            },
          },
        }),
        infiniteHits({
          container: "#hits",
          cssClasses: {
            list: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
            item: "h-full",
            loadMore: "btn btn-primary w-fit mt-4 mx-auto block",
          },
          templates: {
            item: (hit) => {
              return `
                <a
                  class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer h-full flex flex-col"
                  href="/books/${hit.id}"
                  rel="noopener noreferrer"
                >
                  <figure class="relative bg-gray-300 h-72">
                    <img
                      src=${hit.coverUrl}
                      alt=${hit.title}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div class="absolute top-2 right-2">
                      <span class="badge badge-neutral">${hit.genre}</span>
                    </div>
                  </figure>

                  <div class="card-body p-4 flex-1 flex flex-col">
                    <div class="flex justify-between items-start">
                      <h2 class="card-title text-xl font-bold line-clamp-2">${hit.title}</h2>
                      <div class="flex shrink-0">
                        ${Array(5)
                          .fill(null)
                          .map(
                            (_, i) => `
                          <svg class="w-5 h-5" fill="${i < Math.round(hit.avgRating) ? "currentColor" : "none"}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        `
                          )
                          .join("")}
                        
                      </div>
                    </div>

                    <p class="text-gray-700 text-lg line-clamp-1">${hit.authorName}</p>

                    <div class="flex flex-wrap gap-2 mt-2 mt-auto">
                      ${hit.tags.map((tag: string) => `<span class="badge badge-outline badge-secondary">${tag}</span>`).join("")}
                    </div>
                  </div>
                </a>
              `;
            },
            empty: (data) =>
              `<div class="alert alert-info">
                No books found for <q>${data.query}</q>. Try another search term.
              </div>`,
          },
          transformItems: (items) => {
            return items.map((item) => {
              return {
                ...item,
                release_date_display: (() => {
                  const parsedDate = new Date(item.release_date * 1000);
                  return `${parsedDate.getUTCFullYear()}/${(
                    "0" +
                    (parsedDate.getUTCMonth() + 1)
                  ).slice(-2)}`;
                })(),
              };
            });
          },
        }),
        configure({
          hitsPerPage: 20,
        }),
      ]);

      widgetsAdded = true;
    }
    bookState.search.start();
  });

  onDestroy(() => {
    // Clean up event listeners and subscriptions
    if (browser) {
      if (clickListener) document.removeEventListener('click', clickListener);
      if (popStateListener) window.removeEventListener('popstate', popStateListener);
    }
  });
</script>

<div class="p-4">
  <div class="flex gap-4">
    <Facet search={bookState.search} />

    <div class="w-5/6 flex-1">
      <div class="flex justify-between gap-4">
        <div class="stats">
          <div class="stat">
            <div id="stats" class="stat-value text-lg"></div>
          </div>
        </div>

        <SortBy />
      </div>
      <div id="hits"></div>
    </div>
  </div>
</div>
