<script lang="ts">
  interface LoadingProps {
    size?: "xs" | "sm" | "md" | "lg";
    color?: string;
    text?: string;
  }

  let {
    size = "md",
    color = "primary",
    text = "Loading...",
  }: LoadingProps = $props();
</script>

<div class="flex flex-col items-center justify-center gap-2">
  <span class="loading loading-spinner loading-{size} text-{color}"></span>
  {#if text}
    <p class="text-sm text-gray-500">{text}</p>
  {/if}
</div>
