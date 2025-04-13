<script lang="ts">
  import { onMount } from "svelte";
  import { getBookState } from "$lib/features";

  const bookState = getBookState();

  let selectedSort = "books/sort/publishedDate:desc"; // default

  const sortOptions = [
    { value: "books/sort/publishedDate:desc", label: "Newest" },
    { value: "books/sort/publishedDate:asc", label: "Oldest" },
    { value: "books/sort/avgRating:desc", label: "Top Rated" },
  ];

  // If you're using InstantSearch.js sortBy widget or custom routing, sync here:
  onMount(() => {
    const currentIndex = bookState.search.helper?.state?.index;
    if (currentIndex) selectedSort = currentIndex;
  });

  function handleSortChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSort = target.value;
    bookState.search.helper?.setIndex(target.value).search(); // Update the index
  }
</script>

<select
  class="select select-bordered select-lg w-fit max-w-xs"
  onchange={handleSortChange}
  bind:value={selectedSort}
>
  {#each sortOptions as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>
