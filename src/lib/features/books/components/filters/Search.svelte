<script lang="ts">
  import instantsearch from "instantsearch.js";
  import { searchClient } from "$lib/services/typesense";
  import { onMount } from "svelte";
  import { connectAutocomplete } from "instantsearch.js/es/connectors";
  import { goto } from "$app/navigation";

  // Create a separate instance for autocomplete that won't affect the main search
  let autocompleteSearch = instantsearch({
    indexName: "books",
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  let searchContainer;
  let totalHits = 0;
  let displayedHits = 0;

  onMount(() => {
    autocompleteSearch.start();

    // 1. Create a render function for autocomplete
    const renderAutocomplete = (renderOptions: any, isFirstRender: any) => {
      const { indices, currentRefinement, refine, widgetParams } =
        renderOptions;

      const container = document.querySelector("#autocomplete");

      if (isFirstRender) {
        // Create the root div with position relative to contain the dropdown
        const rootDiv = document.createElement("div");
        rootDiv.className = "relative w-full";

        // Create input with daisyUI styling
        const inputContainer = document.createElement("div");
        inputContainer.className = "form-control w-full";

        const input = document.createElement("input");
        input.type = "search";
        input.placeholder = "Search for books...";
        input.className = "input input-bordered w-full";

        input.addEventListener("input", (event) => {
          refine((event.target as HTMLInputElement).value);
        });

        // Add keydown event listener to handle Enter key press
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const searchTerm = (event.target as HTMLInputElement).value;
            if (searchTerm.trim()) {
              // Redirect to search page with the query parameter
              goto(`/search-book?q=${encodeURIComponent(searchTerm)}`);
              // Clear the input after search
              (event.target as HTMLInputElement).value = '';
              refine('');
            }
          }
        });

        // Create suggestions container with absolute positioning
        const suggestionsDiv = document.createElement("div");
        suggestionsDiv.className =
          "suggestions-dropdown card card-compact dropdown-content shadow bg-base-100 rounded-box absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto w-full hidden";

        inputContainer.appendChild(input);
        rootDiv.appendChild(inputContainer);
        rootDiv.appendChild(suggestionsDiv);

        if (container) {
          container.appendChild(rootDiv);
        }
      }

      // Update the suggestions
      const rootDiv = container?.querySelector("div");
      const suggestionsDiv = rootDiv?.querySelector(
        ".suggestions-dropdown"
      ) as HTMLElement;
      const input = rootDiv?.querySelector("input");

      if (input) {
        input.value = currentRefinement;
      }

      if (suggestionsDiv) {
        // Show/hide suggestions based on input
        if (currentRefinement.length > 0 && indices[0]?.hits.length > 0) {
          suggestionsDiv.classList.remove("hidden");
        } else {
          suggestionsDiv.classList.add("hidden");
          return;
        }

        // Clear previous suggestions
        suggestionsDiv.innerHTML = "";

        // Add new suggestions
        indices[0]?.hits
          .slice(0, 5)
          .forEach((hit: any, index: number, array: any[]) => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className =
              "p-3 hover:bg-base-200 cursor-pointer flex gap-4";

            if (index < array.length - 1) {
              suggestionItem.classList.add("border-b", "border-base-200");
            }

            // Add book cover image
            const coverContainer = document.createElement("div");
            coverContainer.className = "flex-shrink-0 w-[50px]";

            const coverImage = document.createElement("img");
            coverImage.src = hit.coverUrl;
            coverImage.alt = hit.title;
            coverImage.className =
              "w-full h-auto object-cover rounded max-h-[70px]";
            coverImage.onerror = () => {
              coverImage.src = "/images/book-placeholder.png";
            };

            coverContainer.appendChild(coverImage);

            // Content container for title and author
            const contentContainer = document.createElement("div");
            contentContainer.className = "flex-grow";

            const title = document.createElement("div");
            title.className = "font-medium text-base-content";
            title.textContent = hit.title;

            const author = document.createElement("div");
            author.className = "text-sm text-base-content/70";

            // Use authorName if available, otherwise fall back to authors array
            if (hit.authorName) {
              author.textContent = `By: ${hit.authorName}`;
            } else if (hit.authors) {
              author.textContent = `By: ${Array.isArray(hit.authors) ? hit.authors.join(", ") : hit.authors}`;
            } else {
              author.textContent = "Unknown author";
            }

            contentContainer.appendChild(title);
            contentContainer.appendChild(author);

            suggestionItem.appendChild(coverContainer);
            suggestionItem.appendChild(contentContainer);

            suggestionItem.addEventListener("click", () => {
              if (input) {
                input.value = hit.title;
                suggestionsDiv.classList.add("hidden");

                // Navigate to the book detail page when a suggestion is clicked
                goto(`/books/${hit.id}`);
              }
            });

            suggestionsDiv.appendChild(suggestionItem);
          });

        // Add click outside listener to close suggestions
        document.addEventListener("click", (event) => {
          if (!container?.contains(event.target as Node)) {
            suggestionsDiv.classList.add("hidden");
          }
        });
      }
    };

    // 2. Create the custom autocomplete widget
    const customAutocomplete = connectAutocomplete(renderAutocomplete);

    // Add the autocomplete widget to the separate search instance
    autocompleteSearch.addWidgets([customAutocomplete({})]);
  });
</script>

<div class="w-full">
  <div bind:this={searchContainer} class="w-full p-4">
    <div id="stats" class="hidden"></div>
    {#if totalHits > 0}
      <p class="text-base-content/70 mb-4">
        Showing {displayedHits} of {totalHits} books
      </p>
    {/if}
    <div id="autocomplete" class="mb-6"></div>
    <div id="hits" class="mt-4"></div>
  </div>
</div>
