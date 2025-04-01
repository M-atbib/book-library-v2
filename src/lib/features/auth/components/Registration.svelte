<script lang="ts">
  import { Logo } from "$lib/components";
  import { AuthForm } from "$lib/features/auth/components";
  import { BookOpenText, LibraryBig } from "@lucide/svelte";

  let selectedRole = $state<"author" | "reader">("author");

  function selectRole(role: "author" | "reader") {
    selectedRole = role;
  }
</script>

<div class="w-full max-w-md mx-auto min-h-screen flex flex-col justify-center">
  <div class="flex justify-center mb-8">
    <Logo />
  </div>
  <div class="flex justify-center mb-8">
    <div class="flex gap-4 justify-center w-full">
      <div
        class="card border {selectedRole === 'author'
          ? 'border-primary'
          : 'border-base-300'} shadow-md p-6 cursor-pointer bg-base-100 hover:bg-base-200 transition-colors w-40 h-32 flex flex-col items-center justify-center"
        onclick={() => selectRole("author")}
        role="presentation"
      >
        <LibraryBig class="w-10 h-10 mb-2" />
        <h1 class="font-medium text-lg">Author</h1>
      </div>
      <div
        class="card border {selectedRole === 'reader'
          ? 'border-primary'
          : 'border-base-300'} shadow-md p-6 cursor-pointer bg-base-100 hover:bg-base-200 transition-colors w-40 h-32 flex flex-col items-center justify-center"
        onclick={() => selectRole("reader")}
        role="presentation"
      >
        <BookOpenText class="w-10 h-10 mb-2" />
        <h1 class="font-medium text-lg">Reader</h1>
      </div>
    </div>
  </div>

  <AuthForm isRegistration={true} role={selectedRole} />

  <div class="flex justify-center mt-4">
    <p>
      Already have an account?
      <a href="/" class="link link-hover">Login</a>
    </p>
  </div>
</div>
