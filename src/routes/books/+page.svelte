<script lang="ts">
  import { BookList, Facet } from "$lib/features";
  import { onMount } from "svelte";
  import { beforeNavigate } from "$app/navigation";
  import type { InstantSearch } from "instantsearch.js";

  // Properly typed variables
  let bookList: BookList;
  let search: InstantSearch | undefined;

  onMount(() => {
    // Get the search instance from the BookList component
    search = bookList?.search;

    // Check for stored state on navigation
    const savedState = sessionStorage.getItem("lastSearchState");
    if (savedState && !window.location.search) {
      // Restore the search state
      window.history.replaceState(null, "", `?${savedState}`);
    }
  });

  // Save search state on navigation
  beforeNavigate(({ to, from }) => {
    if (to?.url.pathname !== from?.url.pathname) {
      // Store the current search parameters
      const currentSearchParams = new URLSearchParams(window.location.search);
      if (currentSearchParams.toString()) {
        sessionStorage.setItem(
          "lastSearchState",
          currentSearchParams.toString()
        );
      }
    }
  });
</script>

<svelte:head>
  <title>Book Library | Browse Books</title>
</svelte:head>

<div class="mx-auto px-4 py-8">
  <div class="flex flex-col md:flex-row gap-8">
    <!-- Main content -->
    <main class="flex-1">
      <BookList bind:this={bookList} />
    </main>
  </div>
</div>
