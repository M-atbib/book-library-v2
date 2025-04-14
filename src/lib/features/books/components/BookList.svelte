<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { configure, infiniteHits, stats } from "instantsearch.js/es/widgets";
  import { SortBy, Facet, getBookState } from "$lib/features";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";

  const bookState = getBookState();
  let widgetsAdded = false;

  // Watch page changes to handle navigation
  $effect(() => {
    if ($page && browser) {
      // When we're on the books page, ensure search is started
      if (
        $page.url.pathname.includes("/books") &&
        !bookState.searchInitialized
      ) {
        bookState.startSearch();
      }
    }
  });

  onMount(() => {
    if (!browser) return;

    // Start search if not already started
    if (!bookState.searchInitialized) {
      bookState.startSearch();
    }

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
  });
</script>

<div class="p-4">
  <div class="flex gap-4">
    <Facet />

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
