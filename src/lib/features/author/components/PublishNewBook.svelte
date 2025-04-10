<script lang="ts">
  import { getAuthorState } from "$lib/features";
  import { auth } from "$lib/services/firebase";
  import type { Book } from "$lib/types/books.type";
  import { Edit, X } from "@lucide/svelte";

  const authorState = getAuthorState();

  // Props for component mode (create or edit)
  interface Props {
    mode?: "create" | "edit";
    initialBook?: Book;
  }

  let { mode = "create", initialBook }: Props = $props();

  // Book form data
  let book = $state<Book>({
    id: "",
    title: "",
    authorName: auth.currentUser?.displayName || "",
    authorId: auth.currentUser?.uid || "",
    coverUrl: "",
    avgRating: 0,
    genre: "",
    tags: [],
    publishedDate: new Date(),
    description: "",
    pages: 0,
  });

  // For tags input
  let tagInput = $state("");

  // For modal control
  let isModalOpen = $state(false);
  let isEditing = $state(mode === "edit");
  let bookId = $state(initialBook?.id || "");

  // Initialize with initial book if in edit mode
  $effect(() => {
    if (mode === "edit" && initialBook) {
      book = { ...initialBook };
      isEditing = true;
      bookId = initialBook.id;
    }
  });

  // Genres list
  const genres = [
    "Fiction",
    "Non-Fiction",
    "Science Fiction",
    "Fantasy",
    "Mystery",
    "Thriller",
    "Romance",
    "Horror",
    "Biography",
    "History",
    "Self-Help",
    "Business",
    "Children's",
    "Young Adult",
    "Poetry",
    "Other",
  ];

  function openModal(editBook?: Book) {
    if (editBook) {
      book = {
        ...editBook,
        publishedDate: new Date(editBook.publishedDate),
      };
    } else if (isEditing && initialBook) {
      // Make sure we use initialBook in edit mode
      book = { ...initialBook };
    } else {
      // Reset form for new book
      book = {
        id: "",
        title: "",
        authorName: auth.currentUser?.displayName || "",
        authorId: auth.currentUser?.uid || "",
        coverUrl: "",
        avgRating: 0,
        genre: "",
        tags: [],
        publishedDate: new Date(),
        description: "",
        pages: 0,
      };
    }
    isModalOpen = true;
  }

  function closeModal() {
    isModalOpen = false;
  }

  function addTag() {
    if (tagInput.trim() && !book.tags.includes(tagInput.trim())) {
      book.tags = [...book.tags, tagInput.trim()];
      tagInput = "";
    }
  }

  function removeTag(tag: string) {
    book.tags = book.tags.filter((t) => t !== tag);
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!book.title || !book.genre) {
      return;
    }

    try {
      if (isEditing) {
        // Update book logic would go here
        await authorState.editBook(book);
      } else {
        await authorState.publishBook(book);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving book:", error);
    }
  }

  // Export the openModal function for external use
  export { openModal };
</script>

{#if isEditing}
  <button class="btn btn-ghost btn-sm" onclick={() => openModal(initialBook)}>
    <Edit />
  </button>
{:else}
  <button class="btn btn-primary" onclick={() => openModal()}>
    Publish New Book
  </button>
{/if}

<!-- Modal -->
<dialog class="modal" class:modal-open={isModalOpen}>
  <div class="modal-box w-11/12 max-w-3xl">
    <h3 class="font-bold text-lg mb-4">
      {isEditing ? "Edit Book" : "Publish New Book"}
    </h3>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Title -->
      <div class="form-control">
        <label class="label-text mb-2" for="title">Title</label>
        <input
          type="text"
          id="title"
          class="input input-bordered w-full"
          bind:value={book.title}
          required
        />
      </div>

      <!-- Cover URL -->
      <div class="form-control">
        <label class="label-text mb-2" for="coverUrl">Cover URL</label>
        <input
          type="url"
          id="coverUrl"
          class="input input-bordered w-full"
          bind:value={book.coverUrl}
          placeholder="https://example.com/book-cover.jpg"
        />
      </div>

      <!-- Genre -->
      <div class="form-control">
        <label class="label-text mb-2" for="genre">Genre</label>
        <select
          id="genre"
          class="select select-bordered w-full"
          bind:value={book.genre}
          required
        >
          <option value="" disabled selected>Select a genre</option>
          {#each genres as genre}
            <option value={genre}>{genre}</option>
          {/each}
        </select>
      </div>

      <!-- Tags -->
      <div class="form-control">
        <label class="label-text mb-2" for="tags">Tags</label>
        <div class="flex gap-2">
          <input
            type="text"
            id="tags"
            class="input input-bordered flex-grow"
            bind:value={tagInput}
            placeholder="Add a tag and press Enter"
            onkeydown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addTag())}
          />
          <button type="button" class="btn btn-secondary" onclick={addTag}>
            Add
          </button>
        </div>

        <div class="flex flex-wrap gap-2 mt-2">
          {#each book.tags as tag}
            <div class="badge badge-secondary badge-lg badge-outline gap-1">
              {tag}
              <button type="button" onclick={() => removeTag(tag)}>
                <X class="h-3 w-3" />
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Published Date -->
      <div class="form-control">
        <label class="label-text mb-2" for="publishedDate">Published Date</label
        >
        <input
          type="date"
          id="publishedDate"
          class="input input-bordered w-full"
          bind:value={book.publishedDate}
          required
        />
      </div>

      <!-- Description -->
      <div class="form-control">
        <label class="label-text mb-2" for="description">Description</label>
        <textarea
          id="description"
          class="textarea textarea-bordered h-24 w-full"
          bind:value={book.description}
          required
        ></textarea>
      </div>

      <!-- Pages -->
      <div class="form-control">
        <label class="label-text mb-2" for="pages">Number of Pages</label>
        <input
          type="number"
          id="pages"
          class="input input-bordered w-full"
          bind:value={book.pages}
          min="1"
          required
        />
      </div>

      <div class="modal-action">
        <button type="button" class="btn" onclick={closeModal}>Cancel</button>
        <button type="submit" class="btn btn-primary">
          {isEditing ? "Update Book" : "Publish Book"}
        </button>
      </div>
    </form>
  </div>

  <div class="modal-backdrop" onclick={closeModal} role="presentation"></div>
</dialog>
