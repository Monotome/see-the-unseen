<script lang="ts">
  let {
    fileContent = $bindable(),
    editorElement = $bindable(),
    displayText,
    scrollTop,
    scrollLeft,
    focusRadius,
    onInput,
    onSyncMetrics,
    onCompositionStart,
    onCompositionEnd,
  }: {
    fileContent: string;
    editorElement: HTMLTextAreaElement | null;
    displayText: string;
    scrollTop: number;
    scrollLeft: number;
    focusRadius: number;
    onInput: () => void;
    onSyncMetrics: () => void;
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  } = $props();
</script>

<div class="editor-card">
  <div class="editor-toolbar">
    <div>
      <p class="panel-label">Masked editor</p>
      <p class="panel-copy">Hotkeys: Ctrl+Shift+H toggle privacy, Ctrl+, open settings, Ctrl+Shift+S save as.</p>
    </div>
    <div class="window-chip">Window {focusRadius * 2} chars</div>
  </div>

  <div class="editor-surface">
    <div
      class="editor-overlay"
      aria-hidden="true"
      style={`transform: translate(${-scrollLeft}px, ${-scrollTop}px);`}
    >
      {#if fileContent}
        {displayText}
      {:else}
        <span class="placeholder">Start typing. Everyone nearby sees ordinary-looking text, while your real note stays readable only around the caret.</span>
      {/if}
    </div>

    <textarea
      bind:this={editorElement}
      bind:value={fileContent}
      class="editor-input"
      spellcheck={false}
      autocomplete="off"
      aria-label="Protected note editor"
      placeholder=""
      oninput={onInput}
      onkeyup={onSyncMetrics}
      onmouseup={onSyncMetrics}
      onselect={onSyncMetrics}
      onclick={onSyncMetrics}
      onscroll={onSyncMetrics}
      onfocus={onSyncMetrics}
      oncompositionstart={onCompositionStart}
      oncompositionend={onCompositionEnd}
    ></textarea>
  </div>
</div>

<style>
  .editor-card {
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(27, 23, 18, 0.12);
    border-radius: 28px;
    background: rgba(255, 250, 243, 0.74);
    backdrop-filter: blur(18px);
  }

  :global(html[data-theme="dark"]) .editor-card {
    border-color: rgba(243, 239, 228, 0.08);
    background: rgba(21, 27, 24, 0.82);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px 0;
  }

  .panel-label,
  .panel-copy {
    margin: 0;
  }

  .panel-label {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: #8d5c3f;
  }

  .panel-copy {
    color: rgba(27, 23, 18, 0.72);
  }

  :global(html[data-theme="dark"]) .panel-label {
    color: #d1a97d;
  }

  :global(html[data-theme="dark"]) .panel-copy {
    color: rgba(243, 239, 228, 0.7);
  }

  .window-chip {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.56rem 0.92rem;
    font-size: 0.9rem;
    background: rgba(27, 23, 18, 0.06);
  }

  :global(html[data-theme="dark"]) .window-chip {
    background: rgba(243, 239, 228, 0.08);
  }

  .editor-surface {
    position: relative;
    margin: 18px 24px 24px;
    min-height: 0;
    flex: 1;
    border-radius: 22px;
    border: 1px solid rgba(27, 23, 18, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.34), transparent),
      rgba(255, 255, 255, 0.54);
    overflow: hidden;
  }

  :global(html[data-theme="dark"]) .editor-surface {
    border-color: rgba(243, 239, 228, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
      rgba(8, 11, 10, 0.42);
  }

  .editor-overlay,
  .editor-input {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: 28px 30px 44px;
    font-family: "Cascadia Code", "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 1rem;
    line-height: 1.72;
    letter-spacing: 0.01em;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    tab-size: 2;
  }

  .editor-overlay {
    pointer-events: none;
    color: inherit;
  }

  .placeholder {
    color: rgba(27, 23, 18, 0.44);
  }

  :global(html[data-theme="dark"]) .placeholder {
    color: rgba(243, 239, 228, 0.38);
  }

  .editor-input {
    border: 0;
    resize: none;
    background: transparent;
    color: transparent;
    caret-color: #c7582a;
    outline: none;
    overflow: auto;
  }

  :global(html[data-theme="dark"]) .editor-input {
    caret-color: #ff9d78;
  }
</style>
