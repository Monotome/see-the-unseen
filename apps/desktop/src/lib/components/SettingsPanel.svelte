<script lang="ts">
  import type { Settings } from "$lib/desktop-config";
  import type { WindowSize } from "$lib/masking";

  let {
    settings = $bindable(),
    settingsOpen,
    windowSizeOptions,
    lastError,
    onClose,
  }: {
    settings: Settings;
    settingsOpen: boolean;
    windowSizeOptions: ReadonlyArray<{ value: WindowSize; label: string; hint: string }>;
    lastError: string;
    onClose: () => void;
  } = $props();
</script>

<aside class:open={settingsOpen} class="settings-panel">
  <div class="settings-head">
    <div>
      <p class="panel-label">Protection settings</p>
      <h2>How the note behaves</h2>
    </div>
    <button type="button" class="ghost compact" onclick={onClose}>Close</button>
  </div>

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

  <label class="toggle-row">
    <div>
      <strong>Auto-save opened files</strong>
      <p>Debounced write-back runs after 1.2 seconds of inactivity.</p>
    </div>
    <input type="checkbox" bind:checked={settings.autoSave} />
  </label>

  <div class="field-group">
    <label for="window-size">Visible window around the caret</label>
    <select id="window-size" bind:value={settings.windowSize}>
      {#each windowSizeOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <p class="helper-copy">{windowSizeOptions.find((option) => option.value === settings.windowSize)?.hint}</p>
  </div>

  <div class="field-group">
    <label for="theme-mode">Theme</label>
    <select id="theme-mode" bind:value={settings.theme}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>

  <div class="callout">
    <strong>File behavior</strong>
    <p>Saved notes stay plain text. Whenever you reopen one, the editor starts in protected mode again.</p>
  </div>

  {#if lastError}
    <div class="error-box">{lastError}</div>
  {/if}
</aside>

<style>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 24px 24px;
    border: 1px solid rgba(27, 23, 18, 0.12);
    border-radius: 28px;
    background: rgba(255, 250, 243, 0.74);
    backdrop-filter: blur(18px);
  }

  :global(html[data-theme="dark"]) .settings-panel {
    border-color: rgba(243, 239, 228, 0.08);
    background: rgba(21, 27, 24, 0.82);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  .settings-panel:not(.open) {
    opacity: 0.96;
  }

  .settings-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.35rem;
  }

  .panel-label {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: #8d5c3f;
  }

  :global(html[data-theme="dark"]) .panel-label {
    color: #d1a97d;
  }

  .toggle-row,
  .field-group,
  .callout,
  .error-box {
    padding: 18px;
    border-radius: 20px;
    background: rgba(27, 23, 18, 0.04);
  }

  :global(html[data-theme="dark"]) .toggle-row,
  :global(html[data-theme="dark"]) .field-group,
  :global(html[data-theme="dark"]) .callout,
  :global(html[data-theme="dark"]) .error-box {
    background: rgba(243, 239, 228, 0.04);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .toggle-row p,
  .helper-copy,
  .callout p {
    color: rgba(27, 23, 18, 0.72);
  }

  :global(html[data-theme="dark"]) .toggle-row p,
  :global(html[data-theme="dark"]) .helper-copy,
  :global(html[data-theme="dark"]) .callout p {
    color: rgba(243, 239, 228, 0.7);
  }

  .field-group {
    display: grid;
    gap: 10px;
  }

  .field-group select,
  button {
    font: inherit;
  }

  .field-group select,
  button {
    border-radius: 18px;
    border: 1px solid rgba(27, 23, 18, 0.14);
    background: rgba(255, 252, 248, 0.82);
    color: inherit;
  }

  :global(html[data-theme="dark"]) .field-group select,
  :global(html[data-theme="dark"]) button {
    border-color: rgba(243, 239, 228, 0.12);
    background: rgba(255, 255, 255, 0.04);
  }

  .field-group select {
    width: 100%;
    padding: 0.9rem 1rem;
    appearance: none;
  }

  button {
    padding: 0.62rem 0.9rem;
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1.1;
  }

  .ghost {
    background: transparent;
  }

  .compact {
    min-height: 40px;
    border-radius: 16px;
    padding-inline: 0.85rem;
  }

  .field-group label,
  .toggle-row strong,
  .callout strong,
  h2 {
    color: inherit;
  }

  .field-group select {
    color: inherit;
  }

  .field-group option {
    color: #1b1712;
    background: #f3ecdf;
  }

  :global(html[data-theme="dark"]) .field-group option {
    color: #1b1712;
    background: #f3ecdf;
  }

  .callout strong,
  .toggle-row strong {
    display: block;
    margin-bottom: 4px;
  }

  .error-box {
    color: #b5431b;
  }

  :global(html[data-theme="dark"]) .error-box {
    color: #ff9d78;
  }
</style>
