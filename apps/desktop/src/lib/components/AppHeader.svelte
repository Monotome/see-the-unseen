<script lang="ts">
  let {
    fileName,
    words,
    characters,
    isDirty,
    protectionLabel,
    protectionTone,
    saveLabel,
    isProtected,
    onNew,
    onOpen,
    onSave,
    onToggleProtection,
    onToggleSettings,
  }: {
    fileName: string;
    words: number;
    characters: number;
    isDirty: boolean;
    protectionLabel: string;
    protectionTone: "danger" | "safe";
    saveLabel: string;
    isProtected: boolean;
    onNew: () => void;
    onOpen: () => void;
    onSave: () => void;
    onToggleProtection: () => void;
    onToggleSettings: () => void;
  } = $props();
</script>

<header class="topbar">
  <div class="headline">
    <p class="eyebrow">Privacy notepad</p>
    <div class="title-row">
      <h1>See the Unseen</h1>
      {#if isDirty}
        <span class="dirty-pill">dirty</span>
      {/if}
    </div>
    <p class="file-meta">{fileName} · {words} words · {characters} chars</p>
  </div>

  <div class="action-strip">
    <span class={`status-pill ${protectionTone}`}>{protectionLabel}</span>
    <span class="status-pill neutral">{saveLabel}</span>
    <button type="button" class="ghost" onclick={onNew}>New</button>
    <button type="button" class="ghost" onclick={onOpen}>Open</button>
    <button type="button" class="ghost" onclick={onSave}>Save</button>
    <button type="button" class:primary={!isProtected} class:danger={isProtected} onclick={onToggleProtection}>
      {isProtected ? "Reveal" : "Protect"}
    </button>
    <button type="button" class="ghost" onclick={onToggleSettings}>Settings</button>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 22px 24px;
    border: 1px solid rgba(27, 23, 18, 0.12);
    border-radius: 24px;
    background: rgba(255, 250, 243, 0.72);
    backdrop-filter: blur(18px);
    box-shadow: 0 24px 60px rgba(83, 52, 28, 0.12);
  }

  :global(html[data-theme="dark"]) .topbar {
    border-color: rgba(243, 239, 228, 0.08);
    background: rgba(21, 27, 24, 0.82);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  .headline {
    display: grid;
    gap: 6px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: #8d5c3f;
  }

  :global(html[data-theme="dark"]) .eyebrow {
    color: #d1a97d;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(1.8rem, 2vw, 2.6rem);
    line-height: 1;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .file-meta {
    color: rgba(27, 23, 18, 0.72);
  }

  :global(html[data-theme="dark"]) .file-meta {
    color: rgba(243, 239, 228, 0.7);
  }

  .action-strip {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  button {
    font: inherit;
    border-radius: 999px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: rgba(255, 252, 248, 0.82);
    color: inherit;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
    padding: 0.8rem 1.1rem;
    cursor: pointer;
  }

  :global(html[data-theme="dark"]) button {
    border-color: rgba(243, 239, 228, 0.12);
    background: rgba(255, 255, 255, 0.04);
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(205, 98, 38, 0.55);
  }

  .ghost {
    background: transparent;
  }

  .primary {
    background: #266b5a;
    color: #f5f1e9;
    border-color: #266b5a;
  }

  .danger {
    background: #c7582a;
    color: #fff8f5;
    border-color: #c7582a;
  }

  .status-pill,
  .dirty-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.56rem 0.92rem;
    font-size: 0.9rem;
  }

  .status-pill.neutral,
  .dirty-pill {
    background: rgba(27, 23, 18, 0.06);
  }

  .status-pill.safe {
    background: rgba(38, 107, 90, 0.16);
    color: #266b5a;
  }

  .status-pill.danger {
    background: rgba(199, 88, 42, 0.16);
    color: #b5431b;
  }

  :global(html[data-theme="dark"]) .status-pill.neutral,
  :global(html[data-theme="dark"]) .dirty-pill {
    background: rgba(243, 239, 228, 0.08);
  }

  :global(html[data-theme="dark"]) .status-pill.safe {
    color: #7ccfb9;
    background: rgba(124, 207, 185, 0.16);
  }

  :global(html[data-theme="dark"]) .status-pill.danger {
    color: #ff9d78;
    background: rgba(255, 157, 120, 0.14);
  }

  @media (max-width: 1080px) {
    .topbar {
      display: grid;
      grid-template-columns: 1fr;
    }

    .action-strip {
      justify-content: flex-start;
    }
  }
</style>
