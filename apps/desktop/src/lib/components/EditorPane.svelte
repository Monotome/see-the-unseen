<script lang="ts">
  let {
    fileContent = $bindable(),
    editorElement = $bindable(),
    displayText,
    scrollTop,
    scrollLeft,
    words = 0,
    characters = 0,
    showWordCount = false,
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
    words?: number;
    characters?: number;
    showWordCount?: boolean;
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
    </div>
    {#if showWordCount}
      <span class="count-chip">{words} words &middot; {characters} chars</span>
    {/if}
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
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 0;
  }

  .count-chip {
    font-size: 0.76rem;
    color: rgba(27, 23, 18, 0.45);
    white-space: nowrap;
  }

  :global(html[data-theme="dark"]) .count-chip {
    color: rgba(243, 239, 228, 0.38);
  }

  .panel-label {
    margin: 0;
  }

  .panel-label {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: #8d5c3f;
  }

  :global(html[data-theme="dark"]) .panel-label {
    color: #d1a97d;
  }

  .editor-surface {
    position: relative;
    margin: 16px 20px 20px;
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
