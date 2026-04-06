<script lang="ts">
  let {
    saveLabel,
    onNew,
    onOpen,
    onSave,
    onToggleSettings,
  }: {
    saveLabel: string;
    onNew: () => void;
    onOpen: () => void;
    onSave: () => void;
    onToggleSettings: () => void;
  } = $props();

  let menuOpen = $state(false);

  function closeMenu() {
    menuOpen = false;
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      closeMenu();
    }
  }

  function handleMenuItemClick(action: () => void) {
    closeMenu();
    action();
  }
</script>

<header class="topbar">
  <div class="headline">
    <p class="eyebrow">Privacy notepad</p>
    <h1>See the Unseen</h1>
  </div>

  <div class="action-strip">
    <span class="status-pill neutral">{saveLabel}</span>

    <div class="menu-anchor">
      <button
        type="button"
        class="ghost hamburger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Open menu"
        onclick={() => (menuOpen = !menuOpen)}
        onkeydown={handleMenuKeydown}
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>

      {#if menuOpen}
        <div
          class="backdrop"
          role="presentation"
          onclick={closeMenu}
          onkeydown={handleMenuKeydown}
        ></div>

        <div class="dropdown" role="menu" tabindex="-1" onkeydown={handleMenuKeydown}>
          <button
            type="button"
            role="menuitem"
            class="menu-item"
            onclick={() => handleMenuItemClick(onNew)}
          >
            <span class="item-label">New note</span>
            <kbd>Ctrl+N</kbd>
          </button>
          <button
            type="button"
            role="menuitem"
            class="menu-item"
            onclick={() => handleMenuItemClick(onOpen)}
          >
            <span class="item-label">Open…</span>
            <kbd>Ctrl+O</kbd>
          </button>
          <button
            type="button"
            role="menuitem"
            class="menu-item"
            onclick={() => handleMenuItemClick(onSave)}
          >
            <span class="item-label">Save</span>
            <kbd>Ctrl+S</kbd>
          </button>
          <div class="menu-divider" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="menu-item"
            onclick={() => handleMenuItemClick(onToggleSettings)}
          >
            <span class="item-label">Settings</span>
            <kbd>Ctrl+,</kbd>
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .topbar {
    position: relative;
    z-index: 20;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 20px;
    padding: 18px 20px;
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
    gap: 4px;
    min-width: 0;
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
    font-size: clamp(1.65rem, 1.9vw, 2.35rem);
    line-height: 1;
    min-width: 0;
  }

  .action-strip {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: nowrap;
    justify-self: end;
    white-space: nowrap;
  }

  /* Save status pill */
  .status-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.48rem 0.82rem;
    font-size: 0.86rem;
    white-space: nowrap;
  }

  .status-pill.neutral {
    background: rgba(27, 23, 18, 0.06);
  }

  :global(html[data-theme="dark"]) .status-pill.neutral {
    background: rgba(243, 239, 228, 0.08);
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
    padding: 0.68rem 0.95rem;
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

  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 12px;
  }

  .bar {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
  }

  /* Menu anchor for dropdown positioning */
  .menu-anchor {
    position: relative;
  }

  /* Transparent backdrop for click-outside */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
  }

  /* Dropdown panel */
  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 31;
    min-width: 200px;
    padding: 6px;
    border-radius: 16px;
    border: 1px solid rgba(27, 23, 18, 0.12);
    background: rgba(255, 250, 243, 0.97);
    backdrop-filter: blur(24px);
    box-shadow:
      0 8px 32px rgba(83, 52, 28, 0.16),
      0 2px 8px rgba(83, 52, 28, 0.08);
    animation: drop-in 140ms ease;
  }

  :global(html[data-theme="dark"]) .dropdown {
    border-color: rgba(243, 239, 228, 0.1);
    background: rgba(24, 30, 27, 0.97);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.36),
      0 2px 8px rgba(0, 0, 0, 0.2);
  }

  @keyframes drop-in {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    width: 100%;
    padding: 0.62rem 0.9rem;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .menu-item:hover {
    transform: none;
    border-color: transparent;
    background: rgba(27, 23, 18, 0.06);
  }

  :global(html[data-theme="dark"]) .menu-item:hover {
    background: rgba(243, 239, 228, 0.08);
  }

  .item-label {
    flex: 1;
  }

  kbd {
    font-family: inherit;
    font-size: 0.78rem;
    color: rgba(27, 23, 18, 0.5);
    background: rgba(27, 23, 18, 0.06);
    padding: 0.18rem 0.45rem;
    border-radius: 6px;
    white-space: nowrap;
  }

  :global(html[data-theme="dark"]) kbd {
    color: rgba(243, 239, 228, 0.45);
    background: rgba(243, 239, 228, 0.08);
  }

  .menu-divider {
    height: 1px;
    margin: 4px 6px;
    background: rgba(27, 23, 18, 0.08);
  }

  :global(html[data-theme="dark"]) .menu-divider {
    background: rgba(243, 239, 228, 0.08);
  }

  @media (max-width: 1080px) {
    .topbar {
      gap: 16px;
      padding: 16px 18px;
    }

    h1 {
      font-size: clamp(1.45rem, 4.2vw, 2rem);
    }
  }

  @media (max-width: 720px) {
    .topbar {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }

    .action-strip {
      gap: 8px;
    }

    .status-pill {
      padding: 0.42rem 0.68rem;
      font-size: 0.8rem;
    }
  }
</style>
