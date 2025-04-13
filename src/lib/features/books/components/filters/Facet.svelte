<script lang="ts">
  import { onMount } from "svelte";
  import {
    currentRefinements,
    refinementList,
    clearRefinements,
    ratingMenu,
  } from "instantsearch.js/es/widgets";
  import { getBookState } from "$lib/features";

  const bookState = getBookState();

  function createStarRating(rating: number, max: number = 5): string {
    let stars = "";
    for (let i = 1; i <= max; i++) {
      if (i <= rating) {
        stars += '<span class="text-yellow-400">★</span>'; // Filled star
      } else {
        stars += '<span class="text-gray-300">☆</span>'; // Empty star
      }
    }
    return stars;
  }

  onMount(() => {
    bookState.search.addWidgets([
      refinementList({
        container: "#genre-refinement-list",
        attribute: "genre",
        searchable: true,
        searchablePlaceholder: "Search genres",
        showMore: true,
        operator: "and",
        cssClasses: {
          searchableInput: "input input-bordered w-full max-w-xs mb-2",
          searchableSubmit: "hidden",
          searchableReset: "hidden",
          showMore: "btn btn-sm btn-outline mt-2 w-full mx-auto",
          list: "menu p-0 rounded-box",
          count: "badge badge-sm",
          label: "flex items-center",
          checkbox: "checkbox checkbox-sm mr-2",
        },
        transformItems(items) {
          return items
            .map((item) => ({
              ...item,
              count: item.count || 0,
            }))
            .sort((a, b) => b.count - a.count); // Sort by count
        },
      }),
      refinementList({
        container: "#tags-refinement-list",
        attribute: "tags",
        searchable: true,
        searchablePlaceholder: "Search tags",
        showMore: true,
        operator: "and",
        cssClasses: {
          searchableInput: "input input-bordered w-full max-w-xs mb-2",
          searchableSubmit: "hidden",
          searchableReset: "hidden",
          showMore: "btn btn-sm btn-outline mt-2 w-full mx-auto",
          list: "menu p-0 rounded-box",
          count: "badge badge-sm",
          label: "flex items-center",
          checkbox: "checkbox checkbox-sm mr-2",
        },
        transformItems(items) {
          return items
            .map((item) => ({
              ...item,
              count: item.count || 0,
            }))
            .sort((a, b) => b.count - a.count); // Sort by count
        },
      }),
      ratingMenu({
        container: `#rating-refinement-list`,
        attribute: "avgRating",
        max: 5,
        cssClasses: {
          root: "bg-base-100 rounded-lg p-3",
          list: "space-y-1.5",
          item: "flex items-center",
          label: "flex items-center cursor-pointer w-full text-sm",
          count: "hidden",
          selectedItem: "font-semibold",
          disabledItem: "opacity-50",
        },
        templates: {
          item: (item) => {
            const { count, name, isRefined } = item;
            const rating = parseInt(name, 10);
            const stars = createStarRating(rating);
            return `
                  <label class="flex items-center cursor-pointer w-full text-sm ${
                    isRefined ? "font-semibold" : ""
                  }">
                    <input 
                      type="checkbox" 
                      class="checkbox checkbox-xs checkbox-primary mr-2" 
                      ${isRefined ? "checked" : ""}
                      data-facet-value="${name}"
                      data-facet-count="${count}"
                    />
                    <span class="flex items-center">${stars} & Up</span>
                    <span class="ml-auto badge badge-xs" data-facet-count-display>1000</span>
                  </label>
                `;
          },
        },
      }),
      currentRefinements({
        container: "#current-refinements",
        cssClasses: {
          list: "flex flex-wrap gap-2",
          label: "hidden",
          item: "badge badge-sm",
          category: "badge-primary",
          delete: "ml-2 cursor-pointer",
        },
        transformItems: (items) => {
          const modifiedItems = items.map((item) => {
            return {
              ...item,
              label: "",
            };
          });
          return modifiedItems;
        },
      }),
      clearRefinements({
        container: "#clear-refinements",
        cssClasses: {
          root: "mb-3",
          button: "btn btn-sm btn-outline w-full text-xs",
          disabledButton: "btn btn-sm btn-outline btn-disabled w-full text-xs",
        },
        templates: {
          resetLabel: () => "Clear filters",
        },
      }),
    ]);
  });
</script>

<div class="space-y-4 w-1/6">
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <div id="current-refinements" class="mb-2"></div>
      <div id="clear-refinements"></div>
      <h3 class="card-title">Genres</h3>
      <div id="genre-refinement-list"></div>
    </div>
  </div>

  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title">Tags</h3>
      <div id="tags-refinement-list"></div>
    </div>
  </div>

  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title">Ratings</h3>
      <div id="rating-refinement-list"></div>
    </div>
  </div>
</div>
