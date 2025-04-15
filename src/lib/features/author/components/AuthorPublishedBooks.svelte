<script lang="ts">
  import { getAuthorState, PublishNewBook } from "$lib/features";
  import { formatDate } from "$lib/utils/dateFormatting";
  import { onMount } from "svelte";
  import { Trash2, X } from "@lucide/svelte";

  const authorState = getAuthorState();

  onMount(() => {
    authorState.initializeSearch();

    return () => {
      authorState.disposeSearch();
    };
  });

  async function handleDeleteBook(bookId: string) {
    if (confirm("Are you sure you want to delete this book?")) {
      await authorState.deleteBook(bookId);
    }
  }

  function clearError() {
    authorState.clearError();
  }
</script>

<div class="w-full">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">My Published Books</h2>
    <PublishNewBook />
  </div>

  {#if authorState.error}
    <div class="alert alert-error mb-4 flex justify-between">
      <span>{authorState.error}</span>
      <button class="btn btn-ghost btn-sm" onclick={clearError}>
        <X size={18} />
      </button>
    </div>
  {/if}

  <!-- Search interface - hide if no books -->
  <div class="mb-6">
    <div
      class="relative mb-4"
      id="searchbox"
      class:hidden={authorState.totalPublishedBooks === 0}
    ></div>
  </div>

  {#if authorState.loading && !authorState.searchResults.length}
    <div class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if authorState.totalPublishedBooks === 0}
    <div class="alert alert-info">
      <span>You haven't published any books yet.</span>
    </div>
  {:else if authorState.searchResults.length === 0}
    <div class="alert alert-info">
      <p>No books found matching your search.</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Genre</th>
            <th>Published Date</th>
            <th>Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each authorState.searchResults as book}
            <tr>
              <td class="w-16">
                {#if book.coverUrl}
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    class="w-12 h-16 object-cover"
                  />
                {:else}
                  <div
                    class="w-12 h-16 bg-gray-300 flex items-center justify-center text-xs"
                  >
                    No Cover
                  </div>
                {/if}
              </td>
              <td>{book.title}</td>
              <td>{book.genre}</td>
              <td>{formatDate(book.publishedDate)}</td>
              <td>{book.avgRating || "N/A"}</td>
              <td>
                <PublishNewBook mode="edit" initialBook={book} />
                <button
                  class="btn btn-ghost btn-sm text-error"
                  onclick={() => handleDeleteBook(book.id)}
                >
                  <Trash2 />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Pagination -->
      {#if authorState.totalPages > 1}
        <div class="flex justify-center mt-4">
          <div class="join">
            <button 
              class="join-item btn" 
              onclick={() => authorState.handlePageChange(authorState.currentPage - 1)}
              disabled={authorState.currentPage === 1}
            >
              «
            </button>
            <button class="join-item btn">Page {authorState.currentPage}</button>
            <button 
              class="join-item btn"
              onclick={() => authorState.handlePageChange(authorState.currentPage + 1)}
              disabled={authorState.currentPage === authorState.totalPages}
            >
              »
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
