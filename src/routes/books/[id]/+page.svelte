<script lang="ts">
  import { getBookState, BookDetail } from "$lib/features";
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";

  const bookState = getBookState();
  const { id } = $page.params;

  onMount(async () => {
    await bookState.fetchBookById(id);
  });

  onDestroy(() => {
    // Clean up any subscriptions or state when component is destroyed
    bookState.book = null;
  });
</script>

<svelte:head>
  <title>Book Library | Book Details</title>
</svelte:head>

<BookDetail />
