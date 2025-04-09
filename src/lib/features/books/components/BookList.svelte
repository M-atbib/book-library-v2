<script lang="ts">
  import { BookCard, getBookState, SortBy } from "$lib/features";
  import { NoContent } from "$lib/components";
  import { onMount } from "svelte";

  const bookState = getBookState();

  onMount(async () => {
    // await bookState.fetchBooks();
  });

  async function loadMoreBooks() {
    await bookState.loadMore();
  }
</script>

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

  {#if bookState.books.length === 0}
    <NoContent message="No books found" />
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
