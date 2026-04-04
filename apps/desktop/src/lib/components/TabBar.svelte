<script lang="ts">
  import { basename } from "$lib/masking";
  import type { Tab } from "$lib/desktop-config";

  let {
    tabs,
    activeTabId,
    onTabSelect,
    onTabClose,
    onNewTab,
  }: {
    tabs: Tab[];
    activeTabId: string;
    onTabSelect: (id: string) => void;
    onTabClose: (id: string) => void;
    onNewTab: () => void;
  } = $props();

  function tabLabel(filePath: string | null): string {
    if (!filePath) return "Untitled";
    return basename(filePath);
  }
</script>

<div class="tabbar" role="tablist" aria-label="Open notes">
  {#each tabs as tab (tab.id)}
    <div
      class="tab"
      class:tab-active={tab.id === activeTabId}
      role="tab"
      aria-selected={tab.id === activeTabId}
      tabindex="0"
      onclick={() => onTabSelect(tab.id)}
      onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onTabSelect(tab.id)}
    >
      <span class="tab-label">{tabLabel(tab.filePath)}</span>
      {#if tab.isDirty}
        <span class="dirty-dot" aria-label="unsaved changes"></span>
      {/if}
      <button
        type="button"
        class="tab-close"
        aria-label="Close tab"
        onclick={(e) => {
          e.stopPropagation();
          onTabClose(tab.id);
        }}
      >×</button>
    </div>
  {/each}

  <button type="button" class="tab-new" aria-label="New tab" onclick={onNewTab}>+</button>
</div>

<style>
  .tabbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabbar::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0.52rem 0.8rem 0.52rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(27, 23, 18, 0.12);
    background: rgba(255, 250, 243, 0.52);
    color: rgba(27, 23, 18, 0.6);
    font-size: 0.88rem;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }

  :global(html[data-theme="dark"]) .tab {
    border-color: rgba(243, 239, 228, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(243, 239, 228, 0.5);
  }

  .tab:hover {
    border-color: rgba(205, 98, 38, 0.4);
    color: inherit;
  }

  .tab-active {
    border-color: rgba(199, 88, 42, 0.5);
    background: rgba(255, 250, 243, 0.88);
    color: #1b1712;
    font-weight: 500;
  }

  :global(html[data-theme="dark"]) .tab-active {
    border-color: rgba(255, 157, 120, 0.45);
    background: rgba(255, 255, 255, 0.07);
    color: #f3efe4;
  }

  .tab-label {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c7582a;
    flex-shrink: 0;
  }

  :global(html[data-theme="dark"]) .dirty-dot {
    background: #ff9d78;
  }

  .tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 140ms ease, background 140ms ease;
    flex-shrink: 0;
  }

  .tab-close:hover {
    opacity: 1;
    background: rgba(199, 88, 42, 0.18);
  }

  :global(html[data-theme="dark"]) .tab-close:hover {
    background: rgba(255, 157, 120, 0.18);
  }

  .tab-new {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px dashed rgba(27, 23, 18, 0.22);
    background: transparent;
    color: rgba(27, 23, 18, 0.5);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      border-color 140ms ease,
      color 140ms ease,
      background 140ms ease;
  }

  :global(html[data-theme="dark"]) .tab-new {
    border-color: rgba(243, 239, 228, 0.2);
    color: rgba(243, 239, 228, 0.45);
  }

  .tab-new:hover {
    border-color: rgba(205, 98, 38, 0.55);
    color: #c7582a;
    background: rgba(199, 88, 42, 0.08);
  }

  :global(html[data-theme="dark"]) .tab-new:hover {
    border-color: rgba(255, 157, 120, 0.5);
    color: #ff9d78;
    background: rgba(255, 157, 120, 0.08);
  }
</style>
