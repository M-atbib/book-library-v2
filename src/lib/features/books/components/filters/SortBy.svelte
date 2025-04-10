<script lang="ts">
  import { getBookState } from "$lib/features/books/context/books.svelte";
  import { ArrowUpDown } from "@lucide/svelte";
  
  const bookState = getBookState();
  
  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "rating", label: "Highest Rated" }
  ];
  
  let selectedSort = $state("newest"); // Default sort
  
  // Handle sort change
  function handleSortChange(value: string) {
    selectedSort = value;
    
    // Call the sort function from bookState
    bookState.sortBooks(selectedSort);
  }
</script>

<div class="dropdown dropdown-end">
  <div tabindex="0" role="button" class="btn btn-ghost gap-1 normal-case">
    <ArrowUpDown size={16} />
    <span class="hidden md:inline">Sort by: {sortOptions.find(opt => opt.value === selectedSort)?.label}</span>
    <span class="md:hidden">Sort</span>
  </div>
  <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52" role="menu">
    {#each sortOptions as option}
      <li>
        <button 
          class={selectedSort === option.value ? "active" : ""} 
          onclick={() => handleSortChange(option.value)}
        >
          {option.label}
        </button>
      </li>
    {/each}
  </ul>
</div>