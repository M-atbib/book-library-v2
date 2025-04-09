<script lang="ts">
  import { BookCard, getProfileState } from "$lib/features";
  import { onMount } from "svelte";

  const profileState = getProfileState();

  onMount(() => {
    profileState.fetchSavedBooks();
  });

  function loadMoreBooks() {
    profileState.fetchSavedBooks(true);
  }

  function handleRemoveSaved(bookId: string) {
    profileState.removeSavedBook(bookId);
  }
</script>

<div class="container mx-auto p-4">
  <h2 class="text-2xl font-bold mb-6">My Saved Books</h2>

  {#if profileState.loading}
    <div class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if profileState.error}
    <div class="alert alert-error">
      <p>{profileState.error}</p>
    </div>
  {:else if profileState.savedBooks.length === 0}
    <div class="alert alert-info">
      <p>You haven't saved any books yet.</p>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each profileState.savedBooks as book (book.id)}
        <BookCard {book} onRemoveSaved={handleRemoveSaved} isSaved={true} />
      {/each}
    </div>

    {#if profileState.savedBooksPagination.hasNextPage}
      <div class="flex justify-center mt-6">
        <button 
          class="btn btn-primary" 
          onclick={loadMoreBooks}
          disabled={profileState.loading}
        >
          {profileState.loading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    {/if}
  {/if}
</div>
