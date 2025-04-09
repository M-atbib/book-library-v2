<script lang="ts">
  import { GoogleButton, getUserState } from "$lib/features";
  import type { UserRole } from "$lib/types/user.type";

  const context = getUserState();
  interface AuthFormProps {
    isRegistration?: boolean;
    role?: UserRole;
  }

  const { isRegistration = false, role = "reader" }: AuthFormProps = $props();

  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");

  // Form validation using derived rune
  let emailError = $derived(
    !email
      ? "Email is required"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Please enter a valid email"
        : ""
  );

  let passwordError = $derived(
    !password
      ? "Password is required"
      : password.length < 6
        ? "Password must be at least 6 characters"
        : ""
  );

  let confirmPasswordError = $derived(
    isRegistration && !confirmPassword
      ? "Please confirm your password"
      : isRegistration && password !== confirmPassword
        ? "Passwords do not match"
        : ""
  );

  let isFormValid = $derived(
    !emailError && !passwordError && (!isRegistration || !confirmPasswordError)
  );

  async function handleSubmit() {
    console.log("handleSubmit", email, password, role);
    if (!isFormValid) return;
    if (isRegistration) {
      try {
        await context.registerWithEmailAndPassword(email, password, role);
      } catch (error) {
        console.error("Error registering with email and password:", error);
      }
    } else {
      try {
        await context.loginWithEmailAndPassword(email, password);
      } catch (error) {
        console.error("Error logging in with email and password:", error);
      }
    }
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  <div class="form-control">
    <label for="email" class="label">
      <span class="label-text">Email</span>
    </label>
    <input
      id="email"
      type="email"
      placeholder="Email"
      class="input input-bordered w-full"
      class:input-error={emailError && email.length > 0}
      bind:value={email}
    />
    {#if emailError && email.length > 0}
      <label for="email" class="label">
        <span class="label-text-alt text-error">{emailError}</span>
      </label>
    {/if}
  </div>

  <div class="form-control">
    <label for="password" class="label">
      <span class="label-text">Password</span>
    </label>
    <input
      id="password"
      type="password"
      placeholder="Password"
      class="input input-bordered w-full"
      class:input-error={passwordError && password.length > 0}
      bind:value={password}
    />
    {#if passwordError && password.length > 0}
      <label for="password" class="label">
        <span class="label-text-alt text-error">{passwordError}</span>
      </label>
    {/if}
  </div>

  {#if isRegistration}
    <div class="form-control">
      <label for="confirmPassword" class="label">
        <span class="label-text">Confirm Password</span>
      </label>
      <input
        id="confirmPassword"
        type="password"
        placeholder="Confirm Password"
        class="input input-bordered w-full"
        class:input-error={confirmPasswordError && confirmPassword.length > 0}
        bind:value={confirmPassword}
      />
      {#if confirmPasswordError && confirmPassword.length > 0}
        <label for="confirmPassword" class="label">
          <span class="label-text-alt text-error">{confirmPasswordError}</span>
        </label>
      {/if}
    </div>
  {/if}

  <button
    type="submit"
    class="btn btn-primary w-full mt-2"
    disabled={!isFormValid}
  >
    {isRegistration
      ? `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`
      : "Login"}
  </button>

  <div class="divider">OR</div>

  <GoogleButton {role} {isRegistration} />
</form>
