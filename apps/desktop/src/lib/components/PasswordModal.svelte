<script lang="ts">
  import { onMount } from "svelte";

  let {
    mode,
    filename,
    onConfirm,
    onCancel,
  }: {
    mode: "encrypt" | "decrypt";
    filename: string;
    onConfirm: (password: string) => Promise<void>;
    onCancel: () => void;
  } = $props();

  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let error = $state("");
  let passwordInputEl = $state<HTMLInputElement | null>(null);

  const isEncrypt = $derived(mode === "encrypt");
  const title = $derived(isEncrypt ? "Encrypt note" : "Open encrypted note");
  const description = $derived(
    isEncrypt
      ? `Set a password to encrypt "${filename}". The file can only be opened with this password.`
      : `Enter the password to decrypt "${filename}".`,
  );

  function validate(): boolean {
    if (password.length < 8) {
      error = "Password must be at least 8 characters.";
      return false;
    }
    if (isEncrypt && password !== confirmPassword) {
      error = "Passwords do not match.";
      return false;
    }
    error = "";
    return true;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onConfirm(password);
    } catch (caughtError) {
      error =
        caughtError instanceof Error ? caughtError.message : "Wrong password or corrupted file.";
    }
  }

  onMount(() => {
    passwordInputEl?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKey, { capture: true });
    return () => document.removeEventListener("keydown", handleKey, { capture: true });
  });
</script>

<div class="backdrop" role="presentation" onclick={onCancel} onkeydown={() => {}}>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pwd-modal-title"
    aria-describedby="pwd-modal-desc"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={() => {}}
  >
    <div class="modal-icon" aria-hidden="true">{isEncrypt ? "🔒" : "🔑"}</div>
    <p class="modal-title" id="pwd-modal-title">{title}</p>
    <p class="modal-desc" id="pwd-modal-desc">{description}</p>

    <form class="pwd-form" onsubmit={handleSubmit}>
      <div class="field">
        <label for="pwd-input" class="field-label">Password</label>
        <div class="input-group">
          <input
            bind:this={passwordInputEl}
            id="pwd-input"
            type={showPassword ? "text" : "password"}
            class="pwd-input"
            placeholder="Enter password…"
            autocomplete={isEncrypt ? "new-password" : "current-password"}
            bind:value={password}
            oninput={() => (error = "")}
          />
          <button
            type="button"
            class="toggle-vis"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onclick={() => (showPassword = !showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {#if isEncrypt}
        <div class="field">
          <label for="pwd-confirm" class="field-label">Confirm password</label>
          <input
            id="pwd-confirm"
            type={showPassword ? "text" : "password"}
            class="pwd-input"
            placeholder="Repeat password…"
            autocomplete="new-password"
            bind:value={confirmPassword}
            oninput={() => (error = "")}
          />
        </div>
      {/if}

      {#if error}
        <p class="pwd-error" role="alert">{error}</p>
      {/if}

      <div class="modal-actions">
        <button type="button" class="btn btn-cancel" onclick={onCancel}> Cancel </button>
        <button type="submit" class="btn btn-primary">
          {isEncrypt ? "Encrypt & Save" : "Decrypt & Open"}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.46);
    backdrop-filter: blur(4px);
    animation: fade-in 120ms ease;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: min(440px, calc(100vw - 48px));
    padding: 32px 28px 24px;
    border-radius: 24px;
    border: 1px solid rgba(27, 23, 18, 0.12);
    background: rgba(255, 250, 243, 0.96);
    backdrop-filter: blur(24px);
    box-shadow:
      0 8px 32px rgba(83, 52, 28, 0.18),
      0 2px 8px rgba(83, 52, 28, 0.08);
    animation: slide-up 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
    text-align: center;
  }

  :global(html[data-theme="dark"]) .modal {
    border-color: rgba(243, 239, 228, 0.1);
    background: rgba(26, 32, 28, 0.98);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.48),
      0 2px 8px rgba(0, 0, 0, 0.24);
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-icon {
    font-size: 2rem;
    line-height: 1;
    margin-bottom: 2px;
  }

  .modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .modal-desc {
    margin: 0;
    font-size: 0.88rem;
    color: rgba(27, 23, 18, 0.65);
    line-height: 1.5;
    max-width: 34ch;
  }

  :global(html[data-theme="dark"]) .modal-desc {
    color: rgba(243, 239, 228, 0.6);
  }

  .pwd-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }

  .field-label {
    font-size: 0.82rem;
    font-weight: 500;
    color: rgba(27, 23, 18, 0.65);
  }

  :global(html[data-theme="dark"]) .field-label {
    color: rgba(243, 239, 228, 0.55);
  }

  .input-group {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .pwd-input {
    flex: 1;
    font: inherit;
    font-size: 0.92rem;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    border: 1px solid rgba(27, 23, 18, 0.18);
    background: rgba(255, 252, 248, 0.8);
    color: inherit;
    outline: none;
    transition: border-color 140ms ease;
    width: 100%;
    box-sizing: border-box;
  }

  .pwd-input:focus {
    border-color: #266b5a;
  }

  :global(html[data-theme="dark"]) .pwd-input {
    border-color: rgba(243, 239, 228, 0.15);
    background: rgba(255, 255, 255, 0.06);
  }

  :global(html[data-theme="dark"]) .pwd-input:focus {
    border-color: #3a9e82;
  }

  .toggle-vis {
    font: inherit;
    font-size: 0.82rem;
    padding: 0.5rem 0.7rem;
    border-radius: 8px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: transparent;
    color: inherit;
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.7;
    transition: opacity 140ms ease;
    flex-shrink: 0;
  }

  .toggle-vis:hover {
    opacity: 1;
  }

  :global(html[data-theme="dark"]) .toggle-vis {
    border-color: rgba(243, 239, 228, 0.12);
  }

  .pwd-error {
    margin: 0;
    font-size: 0.85rem;
    color: #c7582a;
    text-align: left;
  }

  :global(html[data-theme="dark"]) .pwd-error {
    color: #ff9d78;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn {
    font: inherit;
    font-size: 0.92rem;
    border-radius: 999px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: rgba(255, 252, 248, 0.82);
    color: inherit;
    padding: 0.7rem 1.2rem;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      background 140ms ease;
  }

  :global(html[data-theme="dark"]) .btn {
    border-color: rgba(243, 239, 228, 0.12);
    background: rgba(255, 255, 255, 0.05);
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn-cancel {
    background: transparent;
    border-color: rgba(27, 23, 18, 0.1);
  }

  :global(html[data-theme="dark"]) .btn-cancel {
    border-color: rgba(243, 239, 228, 0.1);
  }

  .btn-cancel:hover {
    border-color: rgba(27, 23, 18, 0.28);
  }

  :global(html[data-theme="dark"]) .btn-cancel:hover {
    border-color: rgba(243, 239, 228, 0.28);
  }

  .btn-primary {
    background: #266b5a;
    color: #f5f1e9;
    border-color: #266b5a;
  }

  .btn-primary:hover {
    background: #1f5849;
    border-color: #1f5849;
  }
</style>
