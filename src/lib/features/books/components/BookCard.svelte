<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Book } from "$lib/types/books.type";
  import { Star } from "@lucide/svelte";

  interface BookCardProps {
    book: Book;
  }

  let { book }: BookCardProps = $props();
</script>

<div
  class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
  onclick={() => goto(`/books/${book.id}`)}
  role="presentation"
>
  <figure class="relative bg-gray-300 h-72">
    {#if book.coverUrl}
      <img
        src={book.coverUrl}
        alt={book.title}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center text-white text-xl font-semibold"
      >
        Book Cover
      </div>
    {/if}
    <div class="absolute top-2 right-2">
      <span class="badge badge-neutral">{book.genre}</span>
    </div>
  </figure>

  <div class="card-body p-4">
    <div class="flex justify-between items-start">
      <h2 class="card-title text-xl font-bold">{book.title}</h2>
      <div class="flex">
        {#each Array(5) as _, i}
          <Star class="w-5 h-5" fill={i < Math.round(book.avgRating) ? "currentColor" : "none"} />
        {/each}
      </div>
    </div>

    <p class="text-gray-700 text-lg">{book.authorName}</p>

    <div class="flex flex-wrap gap-2 mt-2">
      {#each book.tags as tag}
        <span class="badge badge-outline badge-secondary">{tag}</span>
      {/each}
    </div>
  </div>
</div>
