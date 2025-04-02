<script lang="ts">
  interface NoContentProps {
    message?: string;
  }

  let { message = "No content available" }: NoContentProps = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
  <div class="text-6xl mb-4 opacity-30">📚</div>
  <h3 class="text-xl font-semibold text-gray-600 mb-2">{message}</h3>
  <p class="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
</div>
