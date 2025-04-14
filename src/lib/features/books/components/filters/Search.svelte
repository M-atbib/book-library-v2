<script lang="ts">
  import instantsearch from "instantsearch.js";
  import {
    searchClient,
    searchClientSuggestions,
  } from "$lib/services/typesense";
  import { onMount } from "svelte";
  import { connectAutocomplete } from "instantsearch.js/es/connectors";
  import { goto } from "$app/navigation";
  import { history } from "instantsearch.js/es/lib/routers";
  import { page } from "$app/stores";

  // Create two search instances
  let autocompleteSearch = instantsearch({
    indexName: "books",
    searchClient,
    routing: {
      router: history({ cleanUrlOnDispose: true }),
    },
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  // Create a separate instance for query suggestions
  let suggestionsSearch = instantsearch({
    indexName: "books",
    searchClient: searchClientSuggestions,
    routing: false,
  });

  let searchContainer;

  onMount(() => {
    autocompleteSearch.start();
    suggestionsSearch.start();

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
          // Show suggestions dropdown when typing
          suggestionsDiv.classList.remove("hidden");
        });

        // Add keydown event listener to handle Enter key press
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const searchTerm = (event.target as HTMLInputElement).value;
            if (searchTerm.trim()) {
              // Clear the input and hide suggestions before navigation
              (event.target as HTMLInputElement).value = "";
              suggestionsDiv.classList.add("hidden");
              refine("");
              // Redirect to search page with the query parameter
              goto(`/search-book?q=${encodeURIComponent(searchTerm)}`);
            }
          }
        });

        // Add focus event listener to show suggestions
        input.addEventListener("focus", () => {
          if (input.value.length > 0) {
            suggestionsDiv.classList.remove("hidden");
          }
        });

        // Create suggestions container with absolute positioning
        const suggestionsDiv = document.createElement("div");
        suggestionsDiv.className =
          "suggestions-dropdown card card-compact dropdown-content shadow bg-base-100 rounded-box absolute top-full left-0 right-0 z-50 mt-1 overflow-y-auto w-full hidden";

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
        suggestionsDiv.innerHTML = "";

        if (currentRefinement.length > 0) {
          // Create query suggestions section
          const querySuggestionsDiv = document.createElement("div");
          querySuggestionsDiv.className =
            "query-suggestions p-2 border-b border-base-200";

          // Get suggestions from the hits
          const suggestions =
            indices[0]?.hits?.map((hit: any) => ({
              title: hit.title,
              author:
                hit.authorName ||
                (Array.isArray(hit.authors) ? hit.authors[0] : hit.authors),
              genre: hit.genre,
            })) || [];

          // Create unique suggestions
          const uniqueSuggestions = Array.from(
            new Set(suggestions.map((s: any) => s.title))
          ).slice(0, 5);

          uniqueSuggestions.forEach((suggestion) => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className =
              "p-2 hover:bg-base-200 cursor-pointer flex items-center gap-2";

            const searchIcon = document.createElement("span");
            searchIcon.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>`;

            const text = document.createElement("span");
            text.textContent = suggestion as string;

            suggestionItem.appendChild(searchIcon);
            suggestionItem.appendChild(text);

            suggestionItem.addEventListener("click", () => {
              if (input) {
                // Clear input and hide suggestions before navigation
                input.value = "";
                suggestionsDiv.classList.add("hidden");
                refine("");
                goto(
                  `/search-book?q=${encodeURIComponent(suggestion as string)}`
                );
              }
            });

            querySuggestionsDiv.appendChild(suggestionItem);
          });

          if (uniqueSuggestions.length > 0) {
            suggestionsDiv.appendChild(querySuggestionsDiv);
          }
        }

        // Then show book results as before
        if (indices[0]?.hits.length > 0) {
          const resultsDiv = document.createElement("div");
          resultsDiv.className = "book-results";

          // Add new suggestions
          indices[0]?.hits
            .slice(0, 4)
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
                "w-full h-auto object-cover rounded max-h-[50px]";
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

              suggestionItem.addEventListener("click", async () => {
                if (input) {
                  // Clear input and hide suggestions before navigation
                  input.value = "";
                  suggestionsDiv.classList.add("hidden");
                  refine("");
                  
                  // Get current path
                  const currentPath = $page.url.pathname;
                  
                  // If we're already on a book details page, use window.location for hard refresh
                  if (currentPath.startsWith('/books/')) {
                    window.location.href = `/books/${hit.id}`;
                  } else {
                    // Otherwise use goto for SPA navigation
                    await goto(`/books/${hit.id}`);
                  }
                }
              });

              resultsDiv.appendChild(suggestionItem);
            });

          suggestionsDiv.appendChild(resultsDiv);
        }
      }

      // Add click outside listener to close suggestions
      document.addEventListener("click", (event) => {
        const target = event.target as Node;
        if (container && !container.contains(target)) {
          suggestionsDiv?.classList.add("hidden");
        }
      });
    };

    // Create and add the autocomplete widget
    const customAutocomplete = connectAutocomplete(renderAutocomplete);
    autocompleteSearch.addWidgets([customAutocomplete({})]);
  });
</script>

<div class="w-full">
  <div bind:this={searchContainer} class="w-full p-4">
    <div id="autocomplete"></div>
  </div>
</div>
