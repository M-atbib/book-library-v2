<script lang="ts">
  import { getBookState, BookDetail } from "$lib/features";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  const bookState = getBookState();
  const { id } = $page.params;

  onMount(async () => {
    await bookState.fetchBookById(id);
  });
</script>

<svelte:head>
  <title>Book Library | Book Details</title>
</svelte:head>

<BookDetail />
