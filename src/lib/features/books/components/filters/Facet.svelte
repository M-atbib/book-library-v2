<script lang="ts">
  import { getBookState } from "$lib/features/books/context/books.svelte";
  import { onMount } from "svelte";
  import {
    currentRefinements,
    clearRefinements,
    ratingMenu,
    configure,
  } from "instantsearch.js/es/widgets";
  import connectRefinementList from "instantsearch.js/es/connectors/refinement-list/connectRefinementList";

  // Get the shared instance from props
  const { search } = $props();
  
  // Get the bookState for reactive updates
  const bookState = getBookState();

  let facetContainer;
  let limit = 10;
  let searchable = true;

  // Define all facets in a single array for easier management
  const facets = [
    {
      type: "refinementList",
      attribute: "genre",
      title: "Genre",
      searchablePlaceholder: "Search genre...",
      showMore: true,
      showMoreLimit: 20,
    },
    {
      type: "refinementList",
      attribute: "tags",
      title: "Tags",
      searchablePlaceholder: "Search tags...",
      showMore: true,
      showMoreLimit: 20,
    },
    {
      type: "ratingMenu",
      attribute: "avgRating",
      title: "Rating",
      showMore: false,
      showMoreLimit: 10,
    },
  ];

  // Helper function to create star rating HTML
  const createStarRating = (rating: number, max: number = 5): string => {
    let stars = "";
    for (let i = 1; i <= max; i++) {
      if (i <= rating) {
        stars += '<span class="text-yellow-400">★</span>'; // Filled star
      } else {
        stars += '<span class="text-gray-300">☆</span>'; // Empty star
      }
    }
    return stars;
  };

  onMount(() => {
    if (!search) {
      console.error("Search instance not provided to Facet component");
      return;
    }

    // Create custom refinement list renderer with additional handling for dynamic counts
    const customRefinementList = connectRefinementList(
      (renderOptions, isFirstRender) => {
        const {
          items,
          refine,
          widgetParams,
          isShowingMore,
          toggleShowMore,
          searchForItems,
        } = renderOptions;

        const container = document.querySelector(
          `#facet-list-${widgetParams.attribute}`
        );

        if (isFirstRender) {
          // Create the root div
          const rootDiv = document.createElement("div");
          rootDiv.className = "bg-base-100 rounded-lg";

          // Create search box if searchable
          if (searchable) {
            const searchDiv = document.createElement("div");
            searchDiv.className = "p-3 pb-0";

            const searchInput = document.createElement("input");
            searchInput.type = "search";
            searchInput.placeholder = `Search ${widgetParams.attribute}...`;
            searchInput.className = "input input-bordered w-full input-sm";

            searchInput.addEventListener("input", (event) => {
              searchForItems((event.target as HTMLInputElement).value);
            });

            searchDiv.appendChild(searchInput);
            rootDiv.appendChild(searchDiv);
          }

          // Create list container
          const listDiv = document.createElement("div");
          listDiv.className = "p-3 space-y-1.5";
          listDiv.setAttribute('data-facet-attribute', widgetParams.attribute);

          // Create show more button
          const showMoreButton = document.createElement("button");
          showMoreButton.className = "btn btn-sm btn-ghost mt-2 w-full text-xs";
          showMoreButton.textContent = "Show more";

          showMoreButton.addEventListener("click", () => {
            toggleShowMore();
          });

          rootDiv.appendChild(listDiv);

          const buttonDiv = document.createElement("div");
          buttonDiv.className = "px-3 pb-3";
          buttonDiv.appendChild(showMoreButton);
          rootDiv.appendChild(buttonDiv);

          if (container) {
            container.appendChild(rootDiv);
          }
        }

        // Update the list
        const listDiv = container?.querySelector(".space-y-1\\.5");
        const showMoreButton = container?.querySelector("button");
        const buttonDiv = container?.querySelector(".px-3.pb-3");

        if (listDiv) {
          // Clear previous items
          listDiv.innerHTML = "";

          // Add new items
          items.forEach((item) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "flex items-center";

            const label = document.createElement("label");
            label.className = `flex items-center cursor-pointer w-full text-sm ${
              item.isRefined ? "font-semibold" : ""
            }`;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "checkbox checkbox-xs checkbox-primary mr-2";
            checkbox.checked = item.isRefined;
            checkbox.setAttribute('data-facet-value', item.value);
            checkbox.setAttribute('data-facet-count', item.count.toString());

            checkbox.addEventListener("change", () => {
              refine(item.value);
            });

            const labelText = document.createTextNode(` ${item.label} `);
            label.appendChild(checkbox);
            label.appendChild(labelText);

            const count = document.createElement("span");
            count.className = "ml-auto badge badge-xs";
            count.textContent = item.count.toString();
            count.setAttribute('data-facet-count-display', '');
            label.appendChild(count);

            itemDiv.appendChild(label);
            listDiv.appendChild(itemDiv);
          });
        }

        // Update show more button
        if (showMoreButton && buttonDiv) {
          // Only show the button if there are more items than the limit
          if (items.length > limit) {
            showMoreButton.textContent = isShowingMore
              ? "Show less"
              : "Show more";
            showMoreButton.className =
              "btn btn-sm btn-ghost mt-2 w-full text-xs";
            buttonDiv.classList.remove("hidden");
          } else {
            // Hide the button if there are no more items to show
            buttonDiv.classList.add("hidden");
          }
        }
      }
    );

    // Add widgets for all facets
    const widgets: any[] = [];

    // Add configure widget to increase maxValuesPerFacet for ratings
    // and ensure counts are accurate with conjunctive facets
    widgets.push(
      configure({
        maxValuesPerFacet: 500, // Support all possible rating values
        analytics: false, // Disable analytics to reduce overhead
        facets: ['*'], // Enable all facets 
        facetingAfterDistinct: true, // Calculate facets after applying distinct
        distinct: true, // Ensure distinct results
        hierarchicalFacetsRefinements: {}, // Reset any hierarchical facets
        disjunctiveFacetsRefinements: {}, // Reset any disjunctive facets
        facetsRefinements: {}, // Reset any facet refinements
        hierarchicalFacets: [], // No hierarchical facets
        ruleContexts: [], // No context rules
        facetFilters: [], // No initial facet filters        
      })
    );

    // Add global clear refinements
    widgets.push(
      clearRefinements({
        container: "#clear-all-refinements",
        cssClasses: {
          root: "mb-3",
          button: "btn btn-sm btn-outline w-full text-xs",
          disabledButton: "btn btn-sm btn-outline btn-disabled w-full text-xs",
        },
        templates: {
          resetLabel: () => "Clear filters",
        },
      })
    );

    // Add global current refinements
    widgets.push(
      currentRefinements({
        container: "#current-all-refinements",
        cssClasses: {
          root: "mb-3",
          list: "flex flex-wrap gap-1",
          item: "flex flex-wrap gap-1",
          category: "badge badge-sm badge-primary gap-1",
          categoryLabel: "font-medium text-xs",
          delete: "ml-1 cursor-pointer",
        },
      })
    );

    // Add individual facets
    facets.forEach((facet) => {
      if (facet.type === "refinementList") {
        widgets.push(
          customRefinementList({
            attribute: facet.attribute,
            limit,
            operator: "and", // Use 'and' operator for more accurate filtering
            showMore: facet.showMore,
            showMoreLimit: facet.showMoreLimit,
            escapeFacetValues: true,
            // Transform items to ensure proper sorting and formatting
            transformItems: items => {
              // Sort by count (highest first), then alphabetically
              return items
                .sort((a, b) => {
                  // First sort by count (descending)
                  if (b.count !== a.count) {
                    return b.count - a.count;
                  }
                  // Then sort alphabetically (ascending)
                  return a.label.localeCompare(b.label);
                });
            },
          })
        );
      } else if (facet.type === "ratingMenu") {
        widgets.push(
          ratingMenu({
            container: `#facet-list-${facet.attribute}`,
            attribute: facet.attribute,
            max: 5,
            cssClasses: {
              root: "bg-base-100 rounded-lg p-3",
              list: "space-y-1.5",
              item: "flex items-center",
              label: "flex items-center cursor-pointer w-full text-sm",
              count: "ml-auto badge badge-xs",
              selectedItem: "font-semibold",
              disabledItem: "opacity-50",
            },
            templates: {
              item: (item) => {
                const { count, name, isRefined } = item;
                const rating = parseInt(name, 10);
                const stars = createStarRating(rating);

                return `
                  <label class="flex items-center cursor-pointer w-full text-sm ${isRefined ? "font-semibold" : ""}">
                    <input 
                      type="checkbox" 
                      class="checkbox checkbox-xs checkbox-primary mr-2" 
                      ${isRefined ? "checked" : ""}
                      data-facet-value="${name}"
                      data-facet-count="${count}"
                    />
                    <span class="flex items-center">${stars} & Up</span>
                    <span class="ml-auto badge badge-xs" data-facet-count-display>${count}</span>
                  </label>
                `;
              },
            },
          })
        );
      }
    });

    search.addWidgets(widgets);
    
    // Add a render listener to ensure counts are updated
    search.on('render', () => {
      bookState.loading = false;
    });
  });
</script>

<div bind:this={facetContainer} class="flex flex-col gap-2">
  <!-- Single container with border for all facets -->
  <div class="bg-base-100 rounded-lg border border-base-300 p-3">
    <!-- Global refinements controls -->
    <div class="mb-4">
      <h3 class="text-sm font-semibold mb-2 text-gray-700">Filters</h3>
      <div id="clear-all-refinements"></div>
      <div id="current-all-refinements"></div>
    </div>

    <!-- Facet sections -->
    {#each facets as facet}
      <div class="mb-4">
        <h3 class="text-sm font-semibold mb-2 text-gray-700">{facet.title}</h3>
        <div id="facet-list-{facet.attribute}"></div>
      </div>
    {/each}
  </div>
</div>
