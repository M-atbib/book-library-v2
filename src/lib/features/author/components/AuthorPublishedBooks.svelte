<script lang="ts">
  import { getAuthorState, PublishNewBook } from "$lib/features";
  import { formatDate } from "$lib/utils/dateFormatting";
  import { onMount } from "svelte";
  import { Trash2, X } from "@lucide/svelte";

  const authorState = getAuthorState();

  onMount(() => {
    authorState.fetchPublishedBooks();
  });

  function loadMoreBooks() {
    authorState.fetchPublishedBooks(true);
  }

  async function handleDeleteBook(bookId: string) {
    if (confirm("Are you sure you want to delete this book?")) {
      await authorState.deleteBook(bookId);
    }
  }

  function clearError() {
    authorState.error = null;
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

  {#if authorState.publishedBooks.length === 0}
    <div class="alert alert-info">
      <span>You haven't published any books yet.</span>
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
          {#each authorState.publishedBooks as book}
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
              <td>{book.avgRating}</td>
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
    </div>

    {#if authorState.publishedBooksPagination.hasNextPage}
      <div class="flex justify-center mt-6">
        <button class="btn btn-primary" onclick={loadMoreBooks}>
          Load More
        </button>
      </div>
    {/if}
  {/if}
</div>
