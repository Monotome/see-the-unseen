<script lang="ts">
  import { onMount } from "svelte";
  import type { MaskPersona, WindowSize } from "$lib/masking";
  import {
    ACTION_LABELS,
    defaultHotkeys,
    type HotkeyAction,
    type HotkeyBinding,
    type Settings,
  } from "$lib/desktop-config";

  let {
    settings = $bindable(),
    windowSizeOptions,
    maskPersonaOptions,
    lastError,
    onClose,
  }: {
    settings: Settings;
    windowSizeOptions: ReadonlyArray<{ value: WindowSize; label: string; hint: string }>;
    maskPersonaOptions: ReadonlyArray<{ value: MaskPersona; label: string; hint: string }>;
    lastError: string;
    onClose: () => void;
  } = $props();

  let recordingAction = $state<HotkeyAction | null>(null);

  const ORDERED_ACTIONS: HotkeyAction[] = [
    "save",
    "saveAs",
    "open",
    "new",
    "newTab",
    "closeTab",
    "nextTab",
    "prevTab",
    "saveEncrypted",
    "toggleProtection",
    "panicMask",
    "toggleSettings",
  ];

  function formatBinding(b: HotkeyBinding): string {
    const parts: string[] = [];
    if (b.ctrl) parts.push("Ctrl");
    if (b.alt) parts.push("Alt");
    if (b.shift) parts.push("Shift");
    const display = b.key === " " ? "Space" : b.key.length === 1 ? b.key.toUpperCase() : capitalize(b.key);
    parts.push(display);
    return parts.join("+");
  }

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function startRecording(action: HotkeyAction) {
    recordingAction = action;
  }

  function cancelRecording() {
    recordingAction = null;
  }

  function resetBinding(action: HotkeyAction) {
    settings.hotkeys = { ...settings.hotkeys, [action]: { ...defaultHotkeys[action] } };
  }

  function handleKeyCapture(event: KeyboardEvent) {
    if (!recordingAction) return;

    // Escape cancels recording (does not close modal)
    if (event.key === "Escape") {
      event.stopPropagation();
      cancelRecording();
      return;
    }

    // Ignore modifier-only keypresses
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const binding: HotkeyBinding = {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
    };

    settings.hotkeys = { ...settings.hotkeys, [recordingAction]: binding };
    recordingAction = null;
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && !recordingAction) {
      onClose();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyCapture, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyCapture, { capture: true });
  });
</script>

<div
  class="modal-backdrop"
  role="presentation"
  onclick={(e) => { if (e.target === e.currentTarget && !recordingAction) onClose(); }}
  onkeydown={handleBackdropKeydown}
>
  <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="modal-head">
      <div>
        <p class="eyebrow">Configuration</p>
        <h2 id="settings-title">Settings</h2>
      </div>
      <button type="button" class="ghost compact" onclick={onClose}>Close</button>
    </div>

    <div class="settings-body">
      <!-- Protection -->
      <section class="settings-section">
        <h3 class="section-title">Protection</h3>

        <label class="toggle-row">
          <div>
            <strong>Auto-protect on app blur</strong>
            <p>Alt-tab immediately forces protection back on.</p>
          </div>
          <input type="checkbox" bind:checked={settings.altTabProtect} />
        </label>

        <label class="toggle-row">
          <div>
            <strong>Block screenshots while protected</strong>
            <p>Uses the native window capture protection offered by Tauri.</p>
          </div>
          <input type="checkbox" bind:checked={settings.screenshotProtect} />
        </label>
      </section>

      <!-- Editor -->
      <section class="settings-section">
        <h3 class="section-title">Editor</h3>

        <label class="toggle-row">
          <div>
            <strong>Auto-save opened files</strong>
            <p>Debounced write-back runs after 1.2 seconds of inactivity.</p>
          </div>
          <input type="checkbox" bind:checked={settings.autoSave} />
        </label>

        <label class="toggle-row">
          <div>
            <strong>Show word &amp; character count</strong>
            <p>Displays word and character count below the editor toolbar.</p>
          </div>
          <input type="checkbox" bind:checked={settings.showWordCount} />
        </label>

        <div class="field-group">
          <label for="window-size">Visible window around the caret</label>
          <select id="window-size" bind:value={settings.windowSize}>
            {#each windowSizeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <p class="helper-copy">
            {windowSizeOptions.find((o) => o.value === settings.windowSize)?.hint}
          </p>
        </div>

        <div class="field-group">
          <label for="mask-persona">Masking persona</label>
          <select id="mask-persona" bind:value={settings.maskPersona}>
            {#each maskPersonaOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <p class="helper-copy">
            {maskPersonaOptions.find((o) => o.value === settings.maskPersona)?.hint}
          </p>
        </div>

        <div class="field-group">
          <label for="theme-mode">Theme</label>
          <select id="theme-mode" bind:value={settings.theme}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </section>

      <!-- Keyboard shortcuts -->
      <section class="settings-section">
        <h3 class="section-title">Keyboard shortcuts</h3>
        <p class="section-hint">Click "Change" then press your desired key combo. Escape cancels.</p>

        <div class="hotkey-list">
          {#each ORDERED_ACTIONS as action}
            {@const binding = settings.hotkeys[action]}
            {@const isRecording = recordingAction === action}

            <div class="hotkey-row" class:recording={isRecording}>
              <span class="hotkey-label">{ACTION_LABELS[action]}</span>
              <div class="hotkey-controls">
                {#if isRecording}
                  <span class="recording-chip">Press any combo…</span>
                  <button type="button" class="ghost compact" onclick={cancelRecording}>
                    Cancel
                  </button>
                {:else}
                  <kbd class="binding-chip">{formatBinding(binding)}</kbd>
                  <button type="button" class="ghost compact" onclick={() => startRecording(action)}>
                    Change
                  </button>
                  <button type="button" class="ghost compact muted" onclick={() => resetBinding(action)}>
                    Reset
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <p class="callout-text">
          Some key combos (e.g. Ctrl+Tab) may be reserved by your OS or browser.
        </p>
      </section>

      {#if lastError}
        <div class="error-box">{lastError}</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(27, 23, 18, 0.48);
    backdrop-filter: blur(6px);
    padding: 24px;
  }

  :global(html[data-theme="dark"]) .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }

  .modal-panel {
    width: 100%;
    max-width: 560px;
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(27, 23, 18, 0.12);
    border-radius: 28px;
    background: rgba(255, 250, 243, 0.97);
    backdrop-filter: blur(24px);
    box-shadow: 0 32px 80px rgba(83, 52, 28, 0.2);
    overflow: hidden;
    animation: panel-in 180ms ease;
  }

  :global(html[data-theme="dark"]) .modal-panel {
    border-color: rgba(243, 239, 228, 0.08);
    background: rgba(21, 27, 24, 0.97);
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 24px 0;
    flex-shrink: 0;
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

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.45rem;
    line-height: 1.1;
  }

  .settings-body {
    overflow-y: auto;
    padding: 20px 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-title {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(27, 23, 18, 0.5);
    margin-bottom: 2px;
  }

  :global(html[data-theme="dark"]) .section-title {
    color: rgba(243, 239, 228, 0.45);
  }

  .section-hint {
    font-size: 0.84rem;
    color: rgba(27, 23, 18, 0.6);
    margin-top: -4px;
  }

  :global(html[data-theme="dark"]) .section-hint {
    color: rgba(243, 239, 228, 0.5);
  }

  .toggle-row,
  .field-group {
    padding: 16px 18px;
    border-radius: 18px;
    background: rgba(27, 23, 18, 0.04);
  }

  :global(html[data-theme="dark"]) .toggle-row,
  :global(html[data-theme="dark"]) .field-group {
    background: rgba(243, 239, 228, 0.04);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
  }

  .toggle-row strong {
    display: block;
    margin-bottom: 3px;
  }

  .toggle-row p,
  .helper-copy {
    font-size: 0.84rem;
    color: rgba(27, 23, 18, 0.6);
    margin: 0;
  }

  :global(html[data-theme="dark"]) .toggle-row p,
  :global(html[data-theme="dark"]) .helper-copy {
    color: rgba(243, 239, 228, 0.55);
  }

  .field-group {
    display: grid;
    gap: 10px;
  }

  .field-group select {
    font: inherit;
    width: 100%;
    padding: 0.82rem 1rem;
    border-radius: 12px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: rgba(255, 252, 248, 0.82);
    color: inherit;
    appearance: none;
  }

  :global(html[data-theme="dark"]) .field-group select {
    border-color: rgba(243, 239, 228, 0.12);
    background: rgba(255, 255, 255, 0.04);
  }

  .field-group option {
    color: #1b1712;
    background: #f3ecdf;
  }

  /* Hotkey list */
  .hotkey-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hotkey-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(27, 23, 18, 0.03);
    transition: background 120ms ease;
  }

  .hotkey-row.recording {
    background: rgba(199, 88, 42, 0.06);
  }

  :global(html[data-theme="dark"]) .hotkey-row {
    background: rgba(243, 239, 228, 0.03);
  }

  :global(html[data-theme="dark"]) .hotkey-row.recording {
    background: rgba(255, 157, 120, 0.08);
  }

  .hotkey-label {
    font-size: 0.9rem;
    flex: 1;
  }

  .hotkey-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .binding-chip {
    font-family: inherit;
    font-size: 0.8rem;
    padding: 0.22rem 0.55rem;
    border-radius: 8px;
    background: rgba(27, 23, 18, 0.07);
    color: rgba(27, 23, 18, 0.7);
    white-space: nowrap;
  }

  :global(html[data-theme="dark"]) .binding-chip {
    background: rgba(243, 239, 228, 0.1);
    color: rgba(243, 239, 228, 0.65);
  }

  .recording-chip {
    font-size: 0.82rem;
    color: #c7582a;
    font-style: italic;
  }

  :global(html[data-theme="dark"]) .recording-chip {
    color: #ff9d78;
  }

  .callout-text {
    font-size: 0.8rem;
    color: rgba(27, 23, 18, 0.45);
    padding: 0 2px;
  }

  :global(html[data-theme="dark"]) .callout-text {
    color: rgba(243, 239, 228, 0.38);
  }

  .error-box {
    padding: 14px 18px;
    border-radius: 16px;
    background: rgba(199, 88, 42, 0.08);
    color: #b5431b;
    font-size: 0.9rem;
  }

  :global(html[data-theme="dark"]) .error-box {
    color: #ff9d78;
    background: rgba(255, 157, 120, 0.1);
  }

  /* Buttons */
  button {
    font: inherit;
    border-radius: 12px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: rgba(255, 252, 248, 0.82);
    color: inherit;
    padding: 0.42rem 0.78rem;
    font-size: 0.84rem;
    cursor: pointer;
    transition:
      background 120ms ease,
      border-color 120ms ease;
  }

  :global(html[data-theme="dark"]) button {
    border-color: rgba(243, 239, 228, 0.12);
    background: rgba(255, 255, 255, 0.04);
  }

  button:hover {
    border-color: rgba(205, 98, 38, 0.45);
  }

  .ghost {
    background: transparent;
  }

  .compact {
    padding: 0.38rem 0.7rem;
    border-radius: 10px;
  }

  .muted {
    color: rgba(27, 23, 18, 0.5);
    font-size: 0.8rem;
  }

  :global(html[data-theme="dark"]) .muted {
    color: rgba(243, 239, 228, 0.4);
  }
</style>
