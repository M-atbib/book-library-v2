<script lang="ts">
  import { onMount } from "svelte";
  import BookList from "$lib/features/books/components/BookList.svelte";
  import {
    setBookState,
    getBookState,
  } from "$lib/features/books/context/books.svelte";

  // Initialize the book state context
  setBookState();
  const bookState = getBookState();
  let displayedRange = `${bookState.pagination.currentPage}-${bookState.pagination.pageSize}`;

  onMount(async () => {
    // Fetch books from Firestore when component mounts
    await bookState.fetchBooks();
  });

  // Function to load more books
  async function loadMoreBooks() {
    if (bookState.pagination.hasNextPage) {
      await bookState.fetchBooks(true);
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    {#if bookState.totalBooks > 0}
      <p class="text-gray-600 font-medium">
        {displayedRange} of {bookState.totalBooks}
      </p>
    {/if}
  </div>

  {#if bookState.error}
    <div
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
    >
      {bookState.error}
    </div>
  {/if}

  <BookList />
  <div class="flex justify-center my-4">
    {#if bookState.pagination.hasNextPage}
      <button
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        onclick={loadMoreBooks}
        disabled={bookState.loading}
      >
        {bookState.loading ? "Loading..." : "Load More"}
      </button>
    {/if}
  </div>
</div>
