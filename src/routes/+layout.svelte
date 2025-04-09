<script lang="ts">
  import "../app.css";
  import { checkRouteAccess } from "$lib/utils/routeProtection";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { auth } from "$lib/services/firebase";
  import { type User } from "firebase/auth";
  import { serverTimestamp, type Timestamp } from "firebase/firestore";
  import { Navbar } from "$lib/components";
  import { initializeErrorTracking } from "$lib/services/bugsnag";
  import {
    setBookState,
    setProfileState,
    setUserState,
    getUserState,
  } from "$lib/features";

  setUserState();
  setBookState();
  setProfileState();

  const userState = getUserState();
  let { children } = $props();
  let authorized = $state(true);
  let checkingAuth = $state(true);

  onMount(() => {
    initializeErrorTracking();
    const unsubscribe = auth.onAuthStateChanged(
      async (authUser: User | null) => {
        if (authUser) {
          userState.setUser({
            uid: authUser.uid,
            displayName:
              authUser.displayName || authUser.email?.split("@")[0] || "",
            email: authUser.email || "",
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          });
          await userState.getRole();
        } else {
          userState.user = null;
          userState.role = "";
        }
        checkingAuth = false;
        handleRouteProtection($page.url.pathname);
      }
    );

    return unsubscribe;
  });

  $effect(() => {
    if (!checkingAuth) {
      handleRouteProtection($page.url.pathname);
    }
  });

  async function handleRouteProtection(path: string) {
    authorized = await checkRouteAccess(path);
  }
</script>

{#if checkingAuth}
  <div class="fixed inset-0 flex items-center justify-center bg-white/80">
    <div class="animate-spin text-2xl">⟳</div>
  </div>
{:else if authorized}
  {#if userState.user}
    <div>
      <Navbar />
      <main class="max-w-[90%] mx-auto py-8">
        {@render children()}
      </main>
    </div>
  {:else}
    {@render children()}
  {/if}
{/if}
