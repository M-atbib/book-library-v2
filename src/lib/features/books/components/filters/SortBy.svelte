<script lang="ts">
  import { onMount } from "svelte";
  import { getBookState } from "$lib/features";

  const bookState = getBookState();

  // Initialize with value from BookState
  let selectedSort = $state(bookState.getSavedSortOption());

  const sortOptions = [
    { value: "books/sort/publishedDate:desc", label: "Newest" },
    { value: "books/sort/publishedDate:asc", label: "Oldest" },
    { value: "books/sort/avgRating:desc", label: "Top Rated" },
  ];

  onMount(() => {
    // Check if the InstantSearch state has a different index set
    const currentIndex = bookState.search.helper?.state?.index;

    if (currentIndex && currentIndex !== selectedSort) {
      selectedSort = currentIndex;
    } else if (
      selectedSort &&
      (!currentIndex || currentIndex !== selectedSort)
    ) {
      // Apply our selected sort if it's different from the helper state
      bookState.setSortOption(selectedSort);
    }
  });

  function handleSortChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSort = target.value;

    // Use the centralized method to update and save the sort option
    bookState.setSortOption(selectedSort);
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
