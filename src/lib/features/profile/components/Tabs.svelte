<script lang="ts">
  import Profile from "./Profile.svelte";
  import SavedBooks from "./SavedBooks.svelte";
  import AuthorPublishedBooks from "./AuthorPublishedBooks.svelte";

  // Define tabs
  const tabs = [
    { id: "profile", label: "My Profile", component: Profile },
    { id: "books", label: "My Books", component: SavedBooks },
    { id: "published", label: "My Published", component: AuthorPublishedBooks },
  ];

  // Active tab state
  let activeTab = tabs[0].id;

  // Function to change active tab
  function setActiveTab(tabId: string) {
    activeTab = tabId;
  }
</script>

<div class="w-full">
  <!-- Tab navigation -->
  <div class="tabs tabs-border mb-4">
    {#each tabs as tab}
      <button
        class="tab {activeTab === tab.id ? 'tab-active' : ''}"
        onclick={() => setActiveTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  {#each tabs as tab}
    {#if activeTab === tab.id}
      <svelte:component this={tab.component} />
    {/if}
  {/each}
</div>
