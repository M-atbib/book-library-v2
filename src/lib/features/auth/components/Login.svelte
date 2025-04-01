<script lang="ts">
  import { AuthForm } from "$lib/features/auth/components";
  import { Logo } from "$lib/components";
</script>

<div class="w-full max-w-md mx-auto min-h-screen flex flex-col justify-center">
  <div class="flex justify-center mb-8">
    <Logo />
  </div>
  <AuthForm />

  <div class="flex justify-center mt-4">
    <p>
      Don't have an account?
      <a href="/register" class="link link-hover"> Register </a>
    </p>
  </div>
</div>
