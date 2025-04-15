<script lang="ts">
  import { BookCard, getReaderState } from "$lib/features";
  import { onMount } from "svelte";
  import { X } from "@lucide/svelte";

  const readerState = getReaderState();

  onMount(() => {
    readerState.initializeSearch();

    return () => {
      readerState.disposeSearch();
    };
  });

  $effect(() => {
    readerState.fetchSavedBooks();
  });

  function handleRemoveSaved(bookId: string) {
    readerState.removeSavedBook(bookId);
  }

  function clearError() {
    readerState.error = null;
  }
</script>

<div class="container mx-auto p-4">
  <h2 class="text-2xl font-bold mb-6">My Saved Books</h2>

  {#if readerState.error}
    <div class="alert alert-error mb-4 flex justify-between">
      <span>{readerState.error}</span>
      <button class="btn btn-ghost btn-sm" onclick={clearError}>
        <X size={18} />
      </button>
    </div>
  {/if}

  <!-- Search interface -->
  <div class="mb-6">
    <div
      class="relative mb-4"
      id="searchbox"
      class:hidden={readerState.totalSavedBooks === 0}
    ></div>
  </div>

  {#if readerState.loading}
    <div class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if readerState.totalSavedBooks === 0}
    <div class="alert alert-info">
      <p>You haven't saved any books yet.</p>
    </div>
  {:else if readerState.searchResults.length === 0}
    <div class="alert alert-info">
      <p>No books found matching your search.</p>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each readerState.searchResults as book (book.id)}
        <BookCard {book} onRemoveSaved={handleRemoveSaved} isSaved={true} />
      {/each}
    </div>

    <!-- Pagination -->
    {#if readerState.totalPages > 1}
      <div class="flex justify-center mt-4">
        <div class="join">
          <button
            class="join-item btn"
            onclick={() =>
              readerState.handlePageChange(readerState.currentPage - 1)}
            disabled={readerState.currentPage === 1}
          >
            «
          </button>
          <button class="join-item btn">Page {readerState.currentPage}</button>
          <button
            class="join-item btn"
            onclick={() =>
              readerState.handlePageChange(readerState.currentPage + 1)}
            disabled={readerState.currentPage === readerState.totalPages}
          >
            »
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>