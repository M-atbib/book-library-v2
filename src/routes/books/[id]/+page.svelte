<script lang="ts">
  import { getBookState, setBookState } from "$lib/features/books/context/books.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import BookDetail from "$lib/features/books/components/BookDetail.svelte";
  import { setProfileState } from "$lib/features/profile/context/profile.svelte";
  
  setBookState();
  setProfileState();
  const bookState = getBookState();
  const { id } = $page.params;

  onMount(async () => {
    await bookState.fetchBookById(id);
  });
</script>

<BookDetail />