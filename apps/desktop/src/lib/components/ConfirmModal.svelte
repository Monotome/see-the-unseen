<script lang="ts">
  import { onMount } from "svelte";

  let {
    title,
    message,
    okLabel,
    okVariant = "primary",
    discardLabel,
    cancelLabel = "Cancel",
    onOk,
    onDiscard,
    onCancel,
  }: {
    title: string;
    message: string;
    okLabel: string;
    okVariant?: "primary" | "danger";
    discardLabel?: string;
    cancelLabel?: string;
    onOk: () => void;
    onDiscard?: () => void;
    onCancel: () => void;
  } = $props();

  let dialogEl = $state<HTMLDivElement | null>(null);

  onMount(() => {
    const cancelBtn = dialogEl?.querySelector<HTMLButtonElement>(".btn-cancel");
    cancelBtn?.focus();

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
    bind:this={dialogEl}
    class="modal"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-msg"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={() => {}}
  >
    <div class="modal-icon" aria-hidden="true">⚠</div>
    <p class="modal-title" id="modal-title">{title}</p>
    <p class="modal-msg" id="modal-msg">{message}</p>

    <div class="modal-actions">
      <button type="button" class="btn btn-cancel" onclick={onCancel}>
        {cancelLabel}
      </button>
      {#if discardLabel && onDiscard}
        <button type="button" class="btn btn-discard" onclick={onDiscard}>
          {discardLabel}
        </button>
      {/if}
      <button
        type="button"
        class="btn"
        class:btn-primary={okVariant === "primary"}
        class:btn-danger={okVariant === "danger"}
        onclick={onOk}
      >
        {okLabel}
      </button>
    </div>
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
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: min(420px, calc(100vw - 48px));
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
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-icon {
    font-size: 2rem;
    line-height: 1;
    margin-bottom: 2px;
    color: #c7582a;
  }

  :global(html[data-theme="dark"]) .modal-icon {
    color: #ff9d78;
  }

  .modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .modal-msg {
    margin: 0;
    font-size: 0.92rem;
    color: rgba(27, 23, 18, 0.7);
    line-height: 1.5;
  }

  :global(html[data-theme="dark"]) .modal-msg {
    color: rgba(243, 239, 228, 0.65);
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
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

  .btn-discard {
    background: transparent;
    border-color: rgba(199, 88, 42, 0.3);
    color: #b5431b;
  }

  :global(html[data-theme="dark"]) .btn-discard {
    color: #ff9d78;
    border-color: rgba(255, 157, 120, 0.3);
  }

  .btn-discard:hover {
    background: rgba(199, 88, 42, 0.08);
    border-color: rgba(199, 88, 42, 0.55);
  }

  :global(html[data-theme="dark"]) .btn-discard:hover {
    background: rgba(255, 157, 120, 0.1);
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

  .btn-danger {
    background: #c7582a;
    color: #fff8f5;
    border-color: #c7582a;
  }

  .btn-danger:hover {
    background: #b5431b;
    border-color: #b5431b;
  }
</style>
