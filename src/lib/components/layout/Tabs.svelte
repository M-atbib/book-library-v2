<script lang="ts">
  import {
    SavedBooks,
    AuthorPublishedBooks,
    getAuthorState,
    Profile,
  } from "$lib/features";
  import { onMount } from "svelte";

  const authorState = getAuthorState();
  // Define tabs
  const tabs = [
    { id: "profile", label: "My Profile", component: Profile },
    { id: "books", label: "My Books", component: SavedBooks },
    { id: "published", label: "My Published", component: AuthorPublishedBooks },
  ];

  // Active tab state
  let activeTab = $state(tabs[0].id);
  let visibleTabs = $state(tabs);

  // Function to change active tab
  function setActiveTab(tabId: string) {
    activeTab = tabId;
  }

  onMount(async () => {
    await authorState.getRole();
    const isAuthor = authorState.role === "author";
    visibleTabs = tabs.filter((tab) => tab.id !== "published" || isAuthor);
  });
</script>

<div class="w-full">
  <!-- Tab navigation -->
  <div class="tabs tabs-border mb-4">
    {#each visibleTabs as tab}
      <button
        class="tab {activeTab === tab.id ? 'tab-active' : ''}"
        onclick={() => setActiveTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  {#each visibleTabs as tab}
    {#if activeTab === tab.id}
      {#if tab.id === "profile"}
        <Profile />
      {:else if tab.id === "books"}
        <SavedBooks />
      {:else if tab.id === "published"}
        <AuthorPublishedBooks />
      {/if}
    {/if}
  {/each}
</div>
