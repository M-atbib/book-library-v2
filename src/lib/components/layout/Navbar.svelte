<script lang="ts">
  import { getUserState } from "$lib/features/auth/context/auth.svelte";
  import { Logo, Search } from "$lib/components";
  import { LogOut, User } from "@lucide/svelte";
  const context = getUserState();
</script>

<nav class="navbar max-w-[90%] mx-auto py-8">
  <div class="navbar-start">
    <Logo />
  </div>

  <div class="navbar-center w-1/3">
    <Search />
  </div>

  <div class="navbar-end">
    <div class="hidden md:flex items-center mr-4">
      <div>
        <h2 class="font-semibold text-lg">
          Welcome, {context.user?.displayName}
        </h2>
        <p class="text-sm text-gray-600 capitalize">{context.role}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <a href="/profile" class="btn btn-secondary btn-circle">
        <User class="h-6 w-6" />
      </a>
      <button class="btn btn-ghost btn-circle" onclick={() => context.logout()}>
        <LogOut class="h-6 w-6" />
      </button>
    </div>
  </div>
</nav>
