<script lang="ts">
  import { BookList, Facet } from "$lib/features";
</script>

<svelte:head>
  <title>Book Library | Browse Books</title>
</svelte:head>

<div class="mx-auto px-4 py-8">
  <div class="flex flex-col md:flex-row gap-8">
    <!-- Sidebar -->
    <aside class="w-full md:w-64 flex-shrink-0">
      <Facet />
    </aside>

    <!-- Main content -->
    <main class="flex-1">
      <BookList />
    </main>
  </div>
</div>
