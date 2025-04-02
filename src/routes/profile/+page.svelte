<script lang="ts">
  import Tabs from "$lib/features/profile/components/Tabs.svelte";
  import { setProfileState } from "$lib/features/profile/context/profile.svelte";

  setProfileState();
</script>

<Tabs />
