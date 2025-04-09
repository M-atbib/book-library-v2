<script lang="ts">
  import { Search, X } from "@lucide/svelte";
  import { getBookState } from "$lib/features/books/context/books.svelte";
  import { page } from "$app/stores";
  import { afterNavigate, goto } from "$app/navigation";

  const bookState = getBookState();

  let searchQuery = $state("");
  let suggestions = $state<any[]>([]);
  let showSuggestions = $state(false);
  let loading = $state(false);
  let selectedIndex = $state(-1);

  afterNavigate(() => {
    searchQuery = "";
    suggestions = [];
    showSuggestions = false;
  });

  // Only show autocomplete if not on books page
  $effect(() => {
    const isBookPage = $page.url.pathname === "/books";
    if (isBookPage) {
      // On books page, just perform regular search
      bookState.handleSearchResults(searchQuery);
    } else if (searchQuery.length >= 2) {
      // On other pages, show autocomplete
      fetchSuggestions();
    } else {
      suggestions = [];
      showSuggestions = false;
    }
  });

  async function fetchSuggestions() {
    loading = true;
    try {
      suggestions = await bookState.getSearchSuggestions(searchQuery);
      showSuggestions = suggestions.length > 0;
      selectedIndex = -1;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestions = [];
    } finally {
      loading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (event.key === "Enter") {
      if (selectedIndex >= 0) {
        selectSuggestion(suggestions[selectedIndex]);
      } else {
        // Navigate to books page with search query
        goto(`/books?search=${encodeURIComponent(searchQuery)}`);
      }
    } else if (event.key === "Escape") {
      showSuggestions = false;
    }
  }

  async function selectSuggestion(suggestion: any) {
    searchQuery = "";
    showSuggestions = false;
    await goto(`/books/${suggestion.id}`);
    await bookState.fetchBookById(suggestion.id);
  }

  function clearSearch() {
    searchQuery = "";
    suggestions = [];
    showSuggestions = false;
  }

  function handleBlur() {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }
</script>

<div class="form-control w-full relative">
  <div class="input-group relative">
    <input
      type="text"
      placeholder="Search books..."
      class="input input-bordered w-full"
      bind:value={searchQuery}
      onkeydown={handleKeydown}
      onfocus={() => searchQuery.length >= 2 && (showSuggestions = true)}
      onblur={handleBlur}
      aria-label="Search for books"
      aria-autocomplete="list"
      aria-controls="search-suggestions"
    />

    {#if searchQuery}
      <button
        class="absolute inset-y-0 right-8 flex items-center pr-2"
        onclick={clearSearch}
        aria-label="Clear search"
      >
        <X size={16} class="text-gray-400 hover:text-gray-600" />
      </button>
    {/if}

    <div
      class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
    >
      {#if loading}
        <span class="loading loading-spinner loading-xs text-primary"></span>
      {:else}
        <Search size={18} class="text-gray-400" />
      {/if}
    </div>
  </div>

  {#if showSuggestions}
    <div
      id="search-suggestions"
      class="absolute z-10 p-0 mt-1 w-full bg-base-100 shadow-lg rounded-box border border-base-300 max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each suggestions as suggestion, i}
        <div
          class="px-4 py-2 hover:bg-base-200 cursor-pointer flex items-center gap-2 min-w-[200px] {selectedIndex ===
          i
            ? 'bg-base-200'
            : ''}"
          onclick={() => selectSuggestion(suggestion)}
          role="presentation"
        >
          {#if suggestion.coverUrl}
            <img
              src={suggestion.coverUrl}
              alt={suggestion.title}
              class="h-10 w-8 object-cover rounded"
            />
          {:else}
            <div
              class="h-10 w-8 bg-base-300 rounded flex items-center justify-center"
            >
              <span class="text-xs">No img</span>
            </div>
          {/if}
          <div>
            <div class="font-medium">{suggestion.title}</div>
            <div class="text-sm text-base-content opacity-70">
              {suggestion.authorName}
            </div>
          </div>
        </div>
      {/each}
      <div
        class="px-4 py-2 text-primary hover:bg-base-200 cursor-pointer border-t border-base-300"
      >
        <a href="/books?search={encodeURIComponent(searchQuery)}">
          View all results for "{searchQuery}"
        </a>
      </div>
    </div>
  {/if}
</div>
