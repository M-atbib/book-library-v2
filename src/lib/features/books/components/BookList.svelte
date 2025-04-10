<script lang="ts">
  import { BookCard, getBookState, SortBy } from "$lib/features";
  import { NoContent } from "$lib/components";
  import instantsearch from "instantsearch.js";
  import { configure, hits as hitsWidget } from "instantsearch.js/es/widgets";
  import { searchClient } from "$lib/services/typesense";
  import { onMount, onDestroy } from "svelte";
  import { connectHits } from "instantsearch.js/es/connectors";
  import type { Book } from "$lib/types/books.type";
  import Facet from "$lib/features/books/components/filters/Facet.svelte";

  const bookState = getBookState();

  // Create a shared InstantSearch instance that will be used for all filter components
  export const search = instantsearch({
    indexName: "books",
    searchClient,
    routing: {
      stateMapping: {
        stateToRoute(uiState: any) {
          return uiState.books || {};
        },
        routeToState(routeState: any) {
          return {
            books: routeState,
          };
        },
      },
    },
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  // Store all books as we load more
  let allBooks = $state<Book[]>([]);
  let currentPage = $state(0);
  
  // Reference to store event types for cleanup
  let eventListeners: string[] = [];

  // Setup and connect InstantSearch to our BookState
  onMount(() => {
    // Custom render for hits - updates the BookState with results
    const customHits = connectHits(({ hits }) => {
      // Transform the hits into Book objects
      const newBooks = hits.map((hit: any) => hit as Book);
      
      // If we're on the first page, reset allBooks
      if (!currentPage || currentPage === 0) {
        allBooks = newBooks;
      } else {
        // Otherwise append the new books
        // Use a Map to deduplicate by ID
        const uniqueBooks = new Map<string, Book>();
        
        // Add all existing books to the map
        allBooks.forEach(book => {
          uniqueBooks.set(book.id, book);
        });
        
        // Add new books, overwriting duplicates
        newBooks.forEach(book => {
          uniqueBooks.set(book.id, book);
        });
        
        // Convert the Map back to an array
        allBooks = Array.from(uniqueBooks.values());
      }

      // Update book state
      bookState.books = allBooks;
      bookState.totalHits = search.helper?.lastResults?.nbHits || 0;
      bookState.hasMoreResults = allBooks.length < bookState.totalHits;
      bookState.loading = false;
    });

    // Add widgets to control the search/filter/sort
    search.addWidgets([
      configure({
        hitsPerPage: bookState.pageSize,
        maxValuesPerFacet: 500,
        facetingAfterDistinct: true,
        attributesToSnippet: ["description:20"],
        distinct: true,
        facets: ["*"], // Enable all facets
        attributesToRetrieve: [
          "id",
          "title",
          "author",
          "coverImage",
          "publishedDate",
          "avgRating",
          "genre",
          "tags",
        ],
      }),
      customHits({}),
    ]);

    // Subscribe to search events
    const renderEvent = "render";
    const searchEvent = "search";

    search.on(renderEvent, () => {
      // Update the loading state when search is complete
      bookState.loading = false;
    });

    search.on(searchEvent, () => {
      // Set loading state when search starts
      bookState.loading = true;
    });

    // Store event types for cleanup
    eventListeners = [renderEvent, searchEvent];

    // Reset current page
    currentPage = 0;
    
    // Start the search
    search.start();
  });

  // Cleanup when component is destroyed
  onDestroy(() => {
    // Remove all event listeners
    eventListeners.forEach((eventType) => {
      search.removeAllListeners(eventType);
    });
  });

  // Function to load more books
  async function loadMoreBooks() {
    if (bookState.loading || !bookState.hasMoreResults) return;

    // Increment the page
    currentPage++;
    
    // Set the next page and search
    search.helper?.setPage(currentPage).search();
  }
</script>

<div class="grid grid-cols-1 md:grid-cols-5 gap-6">
  <div class="md:col-span-1">
    <Facet {search} />
  </div>

  <div class="md:col-span-4">
    <div class="w-full">
      <div class="flex justify-between items-center mb-8">
        {#if bookState.totalHits > 0}
          <p class="text-base-content/70 mb-4">
            Showing {bookState.books.length} of {bookState.totalHits} books
          </p>
        {/if}
        <SortBy />
      </div>

      {#if bookState.error}
        <div class="alert alert-error mb-4">
          {bookState.error}
        </div>
      {/if}

      {#if bookState.loading && bookState.books.length === 0}
        <div class="flex justify-center my-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if bookState.books.length === 0}
        <NoContent message="No books found" />
      {:else}
        <div class="grid grid-cols-4 gap-6">
          {#each bookState.books as book (book.id)}
            <BookCard {book} />
          {/each}
        </div>

        {#if bookState.hasMoreResults}
          <div class="flex justify-center mt-8">
            <button
              class="btn btn-primary"
              onclick={loadMoreBooks}
              disabled={bookState.loading}
            >
              {bookState.loading ? "Loading..." : "Load More"}
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>
