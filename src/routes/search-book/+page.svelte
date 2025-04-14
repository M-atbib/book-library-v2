<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import instantsearch from "instantsearch.js";
  import { searchBox, configure } from "instantsearch.js/es/widgets";
  import { connectHits } from "instantsearch.js/es/connectors";
  import { searchClient } from "$lib/services/typesense";
  import { NoContent } from "$lib/components";
  import { BookCard, Facet } from "$lib/features";
  import type { Book } from "$lib/types/books.type";

  // Get search query from URL params
  let query = $page.url.searchParams.get("q") || "";
  let books: Book[] = [];
  let totalHits = 0;
  let loading = true;
  let error = "";

  // Create InstantSearch instance
  const search = instantsearch({
    indexName: "books",
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  onMount(() => {
    // Custom render for hits
    const customHits = connectHits(({ hits }) => {
      // Transform the hits into Book objects
      books = hits.map((hit: any) => hit as Book);
      totalHits = search.helper?.lastResults?.nbHits || 0;
      loading = false;
    });

    // Add widgets to control the search
    search.addWidgets([
      searchBox({
        container: "#searchbox",
        placeholder: "Search for books...",
        autofocus: true,
        searchAsYouType: true,
        showReset: true,
        showSubmit: true,
        showLoadingIndicator: true,
        cssClasses: {
          form: "relative",
          input: "input input-bordered w-full",
          submit:
            "btn btn-ghost text-white absolute right-0 top-0 rounded-l-none",
          reset: "btn btn-ghost absolute right-8 top-0",
          loadingIndicator: "loading loading-spinner absolute right-24 top-3",
        },
      }),
      configure({
        query,
        hitsPerPage: 20,
      }),
      customHits({}),
    ]);

    // Subscribe to search events
    search.on("render", () => {
      loading = false;
    });

    search.on("search", () => {
      loading = true;
    });

    search.on("error", (e) => {
      error = e.message;
      loading = false;
    });

    // Start the search
    search.start();

    return () => {
      search.dispose();
    };
  });
</script>

<svelte:head>
  <title>Book Library | Search Results</title>
</svelte:head>

<div class="">
  <h1 class="text-2xl font-bold mb-6">Search Books</h1>

  <div class="mb-8">
    <div id="searchbox" class="form-control w-full"></div>
  </div>

  {#if error}
    <div class="alert alert-error mb-4">
      {error}
    </div>
  {/if}

  <div class="flex flex-row gap-6">
    <!-- Facets -->
    <Facet {search} />

    <!-- Search results -->
    <div class="w-5/6">
      {#if loading && books.length === 0}
        <div class="flex justify-center my-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if books.length === 0}
        <NoContent message="No books found matching your search" />
      {:else}
        <div class="mb-4">
          <p class="text-base-content/70">
            Found {totalHits}
            {totalHits === 1 ? "book" : "books"} matching your search
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {#each books as book (book.id)}
            <BookCard {book} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
