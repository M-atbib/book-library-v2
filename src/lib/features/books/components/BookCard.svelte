<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Book, SavedBook } from "$lib/types/books.type";
  import { Star, X } from "@lucide/svelte";

  interface BookCardProps {
    book: Book | SavedBook;
    isSaved?: boolean;
    onRemoveSaved?: (bookId: string) => void;
  }

  let { book, isSaved = false, onRemoveSaved }: BookCardProps = $props();

  function handleRemove(event: MouseEvent) {
    event.stopPropagation();
    if (onRemoveSaved) {
      onRemoveSaved(book.id);
    }
  }
</script>

<a
  class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
  href={`/books/${book.id}`}
  target="_blank"
  rel="noopener noreferrer"
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
    {#if isSaved}
      <button
        class="absolute top-2 left-2 bg-error text-white rounded-full p-1 hover:bg-error-focus"
        onclick={handleRemove}
        aria-label="Remove from saved books"
      >
        <X class="w-5 h-5" />
      </button>
    {/if}
  </figure>

  <div class="card-body p-4">
    <div class="flex justify-between items-start">
      <h2 class="card-title text-xl font-bold">{book.title}</h2>
      <div class="flex">
        {#each Array(5) as _, i}
          <Star
            class="w-5 h-5"
            fill={i < Math.round(book.avgRating) ? "currentColor" : "none"}
          />
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
</a>
