<script lang="ts">
  import { getBookState, setBookState } from "$lib/features/books/context/books.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import BookDetail from "$lib/features/books/components/BookDetail.svelte";

  setBookState();
  const bookState = getBookState();
  const { id } = $page.params;

  onMount(async () => {
    await bookState.fetchBookById(id);
    console.log(bookState.book);
  });
</script>

<BookDetail />