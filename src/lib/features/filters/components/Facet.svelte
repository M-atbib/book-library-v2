<script lang="ts">
  import { getBookState } from "$lib/features";

  const bookState = getBookState();

  // Facet options
  let genres = $state<{ value: string; count: number }[]>([]);
  let ratings = $state<{ value: number; count: number }[]>([]);
  let tags = $state<{ value: string; count: number }[]>([]);

  // Selected filters
  let selectedGenres = $state<string[]>([]);
  let selectedRatings = $state<number[]>([]);
  let selectedTags = $state<string[]>([]);

  // Load facets on mount
  $effect(() => {
    loadFacets();
  });

  async function loadFacets() {
    try {
      const facetData = await bookState.getFacets();
      if (facetData) {
        genres = facetData.genres || [];
        ratings = facetData.ratings || [];
        tags = facetData.tags || [];
      }
    } catch (error) {
      console.error("Error loading facets:", error);
    }
  }

  function toggleGenre(genre: string) {
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter((g) => g !== genre);
    } else {
      selectedGenres = [...selectedGenres, genre];
    }
    applyFilters();
  }

  function toggleRating(rating: number) {
    if (selectedRatings.includes(rating)) {
      selectedRatings = selectedRatings.filter((r) => r !== rating);
    } else {
      selectedRatings = [...selectedRatings, rating];
    }
    applyFilters();
  }

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
    applyFilters();
  }

  function clearFilters() {
    selectedGenres = [];
    selectedRatings = [];
    selectedTags = [];
    applyFilters();
  }

  function applyFilters() {
    // This calls the filter function in BookState
    bookState.filterBooks(selectedGenres, selectedRatings, selectedTags);
  }
</script>

<div class="sticky top-24">
  <div class="bg-base-100 rounded-lg shadow-sm border border-base-200 p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Filters</h3>
      {#if selectedGenres.length > 0 || selectedRatings.length > 0 || selectedTags.length > 0}
        <button class="btn btn-sm btn-ghost" onclick={clearFilters}>
          Clear all
        </button>
      {/if}
    </div>

    <!-- Applied filters summary -->
    {#if selectedGenres.length > 0 || selectedRatings.length > 0 || selectedTags.length > 0}
      <div class="mt-4 p-3 bg-base-200 rounded-lg">
        <h4 class="font-medium mb-2 text-sm">Applied Filters</h4>
        <div class="flex flex-wrap gap-2">
          {#each selectedGenres as genre}
            <span class="badge badge-primary badge-sm">
              {genre}
              <button class="ml-1" onclick={() => toggleGenre(genre)}>×</button>
            </span>
          {/each}
          {#each selectedRatings as rating}
            <span class="badge badge-secondary badge-sm">
              {rating}
              {rating === 1 ? "Star" : "Stars"}
              <button class="ml-1" onclick={() => toggleRating(rating)}
                >×</button
              >
            </span>
          {/each}
          {#each selectedTags as tag}
            <span class="badge badge-accent badge-sm">
              {tag}
              <button class="ml-1" onclick={() => toggleTag(tag)}>×</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Genre Filter -->
    <div class="mb-6">
      <h4 class="font-medium mb-2 text-base-content/70">Genre</h4>
      <div class="space-y-2 max-h-64 overflow-y-auto pr-2">
        {#each genres as genre}
          <label
            class="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-1 rounded"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={selectedGenres.includes(genre.value)}
              onchange={() => toggleGenre(genre.value)}
            />
            <span class="text-sm">{genre.value}</span>
            <span class="text-sm text-base-content/50 ml-auto"
              >({genre.count})</span
            >
          </label>
        {/each}
      </div>
    </div>

    <!-- Rating Filter -->
    <div class="mb-6">
      <h4 class="font-medium mb-2 text-base-content/70">Rating</h4>
      <div class="space-y-2">
        {#each ratings as rating}
          <label
            class="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-1 rounded"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={selectedRatings.includes(rating.value)}
              onchange={() => toggleRating(rating.value)}
            />
            <span class="text-sm"
              >{rating.value} {rating.value === 1 ? "Star" : "Stars"}</span
            >
            <span class="text-sm text-base-content/50 ml-auto"
              >({rating.count})</span
            >
          </label>
        {/each}
      </div>
    </div>

    <!-- Tags Filter -->
    <div class="mb-6">
      <h4 class="font-medium mb-2 text-base-content/70">Tags</h4>
      <div class="space-y-2 max-h-64 overflow-y-auto pr-2">
        {#each tags as tag}
          <label
            class="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-1 rounded"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={selectedTags.includes(tag.value)}
              onchange={() => toggleTag(tag.value)}
            />
            <span class="text-sm">{tag.value}</span>
            <span class="text-sm text-base-content/50 ml-auto"
              >({tag.count})</span
            >
          </label>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  /* Add custom scrollbar for overflow areas */
  div::-webkit-scrollbar {
    width: 4px;
  }

  div::-webkit-scrollbar-track {
    background: transparent;
  }

  div::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
</style>
