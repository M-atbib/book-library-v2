<script lang="ts">
  import type { Book } from "$lib/types/books.type";
  import BookCard from "./BookCard.svelte";
  import { NoContent, Loading } from "$lib/components";
  import { getBookState } from "../context/books.svelte";

  const bookState = getBookState();
  console.log(bookState.books);
</script>

{#if bookState.loading}
  <div class="w-full flex justify-center py-8">
    <Loading />
  </div>
{:else if bookState.books.length === 0}
  <NoContent message="No books found" />
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each bookState.books as book (book.id)}
      <BookCard {book} />
    {/each}
  </div>
{/if}
