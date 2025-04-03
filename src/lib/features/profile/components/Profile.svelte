<script lang="ts">
  import { getUserState } from "$lib/features/auth/context/auth.svelte";
  import { auth } from "$lib/services/firebase";

  const userState = getUserState();
  let email = $state(auth.currentUser?.email || "");
  let displayName = $state(auth.currentUser?.displayName || "");
  let password = $state("");

  // Form validation with derived runes
  let emailError = $derived(
    email.trim() === ""
      ? "Email is required"
      : !email.includes("@")
        ? "Invalid email format"
        : ""
  );

  let displayNameError = $derived(
    displayName.trim() === ""
      ? "Display name is required"
      : displayName.length < 3
        ? "Display name must be at least 3 characters"
        : ""
  );

  let passwordError = $derived(
    password !== "" && password.length < 6
      ? "Password must be at least 6 characters"
      : ""
  );

  let isFormValid = $derived(
    emailError === "" &&
      displayNameError === "" &&
      (password === "" || passwordError === "")
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!isFormValid) return;

    await userState.updateInfo(email, displayName, password);

    // Reset password field after update
    if (userState.error === null) {
      password = "";
    }
  }
</script>

<div class="card bg-base-100 max-w-xl">
  <div class="card-body">
    <h2 class="card-title mb-4">My Profile</h2>

    {#if userState.error}
      <div class="alert alert-error mb-4">{userState.error}</div>
    {/if}

    <form class="space-y-4" onsubmit={handleSubmit}>
      <div class="form-control">
        <label class="label" for="email">
          <span class="label-text">Email</span>
        </label>
        <div class="input-group">
          <input
            type="email"
            id="email"
            placeholder="your@email.com"
            class="input input-bordered w-full {emailError
              ? 'input-error'
              : ''}"
            bind:value={email}
          />
        </div>
        {#if emailError}
          <span class="text-error text-sm mt-1">{emailError}</span>
        {/if}
      </div>

      <div class="form-control">
        <label class="label" for="displayName">
          <span class="label-text">Display Name</span>
        </label>
        <div class="input-group">
          <input
            type="text"
            id="displayName"
            placeholder="Your Name"
            class="input input-bordered w-full {displayNameError
              ? 'input-error'
              : ''}"
            bind:value={displayName}
          />
        </div>
        {#if displayNameError}
          <span class="text-error text-sm mt-1">{displayNameError}</span>
        {/if}
      </div>

      <div class="form-control">
        <label class="label" for="password">
          <span class="label-text">Password (leave empty to keep current)</span>
        </label>
        <div class="input-group">
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            class="input input-bordered w-full {passwordError
              ? 'input-error'
              : ''}"
            bind:value={password}
          />
        </div>
        {#if passwordError}
          <span class="text-error text-sm mt-1">{passwordError}</span>
        {/if}
      </div>

      <div class="form-control mt-6 flex justify-end">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={!isFormValid || userState.loading}
        >
          {userState.loading ? "Updating..." : "Update Profile"}
        </button>
      </div>
    </form>
  </div>
</div>
