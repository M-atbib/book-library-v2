<script lang="ts">
  import { getBookState } from "$lib/features";
  import { formatDate } from "$lib/utils/dateFormatting";
  import { BookmarkCheck, BookmarkPlus, Loader, Star } from "@lucide/svelte";

  const bookState = getBookState();
  let userRating = $state(0);

  // Update userRating whenever bookState.book.rating changes
  $effect(() => {
    if (bookState.book?.rating) {
      userRating = bookState.book.rating.ratingValue;
    }
  });

  async function saveBook() {
    try {
      if (bookState.book?.book) {
        await bookState.saveBook(bookState.book.book);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function rateBook(rating: number) {
    try {
      if (bookState.book?.book) {
        userRating = rating;
        const success = await bookState.rateBook(
          bookState.book.book.id,
          rating
        );
        if (success && bookState.book) {
          // Update local state to reflect the new rating
          bookState.book.rating.ratingValue = rating;
        }
      }
    } catch (error) {
      console.error("Error rating book:", error);
    }
  }
</script>

<div class="grid grid-cols-3 gap-6 p-4">
  <div class="md:col-span-2 space-y-6">
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><a href="/books">Books</a></li>
        <li>{bookState.book?.book.title}</li>
      </ul>
    </div>

    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-primary">
        {bookState.book?.book.title}
      </h1>
      <button
        class="btn btn-circle btn-ghost"
        onclick={saveBook}
        disabled={bookState.loading}
      >
        {#if bookState.loading}
          <Loader class="w-6 h-6 animate-spin" />
        {:else if bookState.isBookSaved}
          <BookmarkCheck class="w-6 h-6" />
        {:else}
          <BookmarkPlus class="w-6 h-6" />
        {/if}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="card bg-base-200 p-4">
        <h4 class="text-sm font-semibold text-base-content/70">Author</h4>
        <p class="text-lg font-medium">{bookState.book?.book.authorName}</p>
      </div>
      <div class="card bg-base-200 p-4">
        <h4 class="text-sm font-semibold text-base-content/70">
          Published Date
        </h4>
        <p class="text-lg font-medium">
          {formatDate(bookState.book?.book.publishedDate)}
        </p>
      </div>
      <div class="card bg-base-200 p-4">
        <h4 class="text-sm font-semibold text-base-content/70">Genre</h4>
        <p class="text-lg font-medium">{bookState.book?.book.genre}</p>
      </div>
      <div class="card bg-base-200 p-4">
        <h4 class="text-sm font-semibold text-base-content/70">Pages</h4>
        <p class="text-lg font-medium">{bookState.book?.book.pages}</p>
      </div>
    </div>

    <div class="card bg-base-200 p-6">
      <h3 class="text-xl font-semibold mb-2">Description</h3>
      <p class="text-base-content/80 leading-relaxed">
        {bookState.book?.book.description}
      </p>
    </div>

    <div class="card bg-base-200 p-6">
      <h3 class="text-xl font-semibold mb-2">Tags</h3>
      <div class="flex flex-wrap gap-2">
        {#each bookState.book?.book.tags ?? [] as tag}
          <span class="badge badge-primary">{tag}</span>
        {/each}
      </div>
    </div>

    <div class="card bg-base-200 p-6">
      <h3 class="text-xl font-semibold mb-4">Rating</h3>
      <div class="flex gap-8">
        <div class="flex items-center gap-4 bg-base-100 p-4 rounded-lg">
          <p class="text-4xl font-bold text-primary">
            {bookState.book?.book.avgRating?.toFixed(1) || "0.0"}
          </p>
          <div class="text-sm">
            <p class="font-medium">out of 5</p>
            <p class="text-base-content/70">average rating</p>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-base-content/70">
            Your Rating
          </h4>
          <div class="flex gap-1 text-warning">
            {#each Array(5) as _, i}
              <button
                class="btn btn-ghost btn-sm p-0"
                onclick={() => rateBook(i + 1)}
                disabled={bookState.loading}
              >
                <Star
                  class="w-6 h-6"
                  fill={i < userRating ? "currentColor" : "none"}
                />
              </button>
            {/each}
          </div>
          {#if bookState.loading}
            <p class="text-xs text-base-content/70">Rating book...</p>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <figure class="card bg-base-200 overflow-hidden h-full">
    {#if bookState.book?.book.coverUrl}
      <img
        src={bookState.book?.book.coverUrl}
        alt={bookState.book?.book.title}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center bg-neutral text-neutral-content text-xl font-semibold"
      >
        Book Cover
      </div>
    {/if}
  </figure>
</div>
