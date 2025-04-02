<script lang="ts">
  import { Search } from "@lucide/svelte";

  let searchQuery = $state("");
</script>

<div class="form-control w-full">
  <div class="input-group relative">
    <input
      type="text"
      placeholder="Search..."
      class="input input-bordered w-full"
      bind:value={searchQuery}
    />
    <div
      class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
    >
      <Search size={18} class="text-gray-400" />
    </div>
  </div>
</div>
