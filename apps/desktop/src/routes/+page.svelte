<script lang="ts">
  import { onMount } from "svelte";
  import { TauriEvent, listen } from "@tauri-apps/api/event";
  import { CloseRequestedEvent, getCurrentWindow } from "@tauri-apps/api/window";
  import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
  import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { Store } from "@tauri-apps/plugin-store";
  import AppHeader from "$lib/components/AppHeader.svelte";
  import EditorPane from "$lib/components/EditorPane.svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import TabBar from "$lib/components/TabBar.svelte";
  import {
    createTab,
    defaultSettings,
    windowSizeOptions,
    type Settings,
    type Tab,
  } from "$lib/desktop-config";
  import { WINDOW_RADII, basename, buildMaskedText } from "$lib/masking";

  // --- Confirm modal state ---
  type ConfirmResult = "ok" | "discard" | "cancel";

  type ConfirmConfig = {
    title: string;
    message: string;
    okLabel: string;
    okVariant?: "primary" | "danger";
    discardLabel?: string;
    cancelLabel?: string;
    resolve: (result: ConfirmResult) => void;
  };

  let confirmState = $state<ConfirmConfig | null>(null);

  function showConfirm(opts: Omit<ConfirmConfig, "resolve">): Promise<ConfirmResult> {
    return new Promise((resolve) => {
      confirmState = { ...opts, resolve };
    });
  }

  // --- Global (window-level) state ---
  let settings = $state<Settings>({ ...defaultSettings });
  let isProtected = $state(true);
  let settingsOpen = $state(false);
  let systemPrefersDark = $state(false);
  let isComposing = $state(false);
  let hydrated = $state(false);

  // --- Tab state ---
  const initialTab = createTab();
  let tabs = $state<Tab[]>([initialTab]);
  let activeTabId = $state(initialTab.id);

  // --- DOM / external handles ---
  let editorElement = $state<HTMLTextAreaElement | null>(null);
  let settingsStore: Store | null = null;
  let appWindow: ReturnType<typeof getCurrentWindow> | null = null;

  // --- Active tab ---
  const activeTab = $derived(tabs.find((t) => t.id === activeTabId)!);

  // --- Derived display values ---
  const fileName = $derived(basename(activeTab.filePath));
  const activeTheme = $derived(
    settings.theme === "system" ? (systemPrefersDark ? "dark" : "light") : settings.theme,
  );
  const focusRadius = $derived(WINDOW_RADII[settings.windowSize]);
  const revealRange = $derived(
    isComposing
      ? {
          start: Math.min(activeTab.selectionStart, activeTab.selectionEnd),
          end: Math.max(activeTab.selectionStart, activeTab.selectionEnd),
        }
      : null,
  );
  const displayText = $derived.by(() =>
    buildMaskedText({
      text: activeTab.fileContent,
      cursorIndex: activeTab.selectionEnd,
      radius: focusRadius,
      isProtected,
      sessionSeed: activeTab.sessionSeed,
      revealRange,
    }),
  );
  const words = $derived(
    activeTab.fileContent.trim() ? activeTab.fileContent.trim().split(/\s+/).length : 0,
  );
  const characters = $derived(activeTab.fileContent.length);
  const protectionLabel = $derived(isProtected ? "Protected" : "Visible");
  const protectionTone = $derived<"danger" | "safe">(isProtected ? "danger" : "safe");
  const saveLabel = $derived(
    activeTab.saveState === "saving"
      ? "Saving"
      : activeTab.saveState === "saved"
        ? "Saved"
        : activeTab.saveState === "error"
          ? "Save failed"
          : activeTab.isDirty
            ? "Unsaved"
            : settings.autoSave
              ? "Auto-save ready"
              : "Idle",
  );

  // --- Editor helpers ---

  function focusEditor() {
    requestAnimationFrame(() => {
      editorElement?.focus();
    });
  }

  function syncEditorMetrics() {
    if (!editorElement) return;
    activeTab.selectionStart = editorElement.selectionStart ?? 0;
    activeTab.selectionEnd = editorElement.selectionEnd ?? activeTab.selectionStart;
    activeTab.scrollTop = editorElement.scrollTop;
    activeTab.scrollLeft = editorElement.scrollLeft;
  }

  function setTabContent(tab: Tab, content: string) {
    tab.fileContent = content;
    tab.isDirty = false;
    tab.saveState = "idle";
    tab.lastError = "";
  }

  function markDirty() {
    activeTab.isDirty = true;
    activeTab.saveState = "idle";
    activeTab.lastError = "";
    syncEditorMetrics();
  }

  // --- Tab management ---

  function addTab() {
    const tab = createTab();
    tabs.push(tab);
    switchToTab(tab.id);
  }

  function switchToTab(id: string) {
    if (id === activeTabId) return;
    activeTabId = id;
    requestAnimationFrame(() => {
      if (!editorElement) return;
      const tab = tabs.find((t) => t.id === id);
      if (!tab) return;
      editorElement.scrollTop = tab.scrollTop;
      editorElement.scrollLeft = tab.scrollLeft;
      editorElement.setSelectionRange(tab.selectionStart, tab.selectionEnd);
      editorElement.focus();
    });
  }

  async function closeTab(id: string) {
    const tabIndex = tabs.findIndex((t) => t.id === id);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];
    const needsConfirm = tab.isDirty && !(settings.autoSave && tab.filePath);

    if (needsConfirm) {
      const result = await showConfirm({
        title: "Close tab",
        message: `"${tab.filePath ? basename(tab.filePath) : "Untitled"}" has unsaved changes.`,
        okLabel: "Discard & Close",
        okVariant: "danger",
        cancelLabel: "Keep tab",
      });
      if (result !== "ok") return;
    }

    if (tabs.length === 1) {
      // Reset the last tab instead of removing it
      const fresh = createTab();
      tabs[0] = fresh;
      activeTabId = fresh.id;
      focusEditor();
      return;
    }

    if (id === activeTabId) {
      const nextIndex = tabIndex === tabs.length - 1 ? tabIndex - 1 : tabIndex + 1;
      activeTabId = tabs[nextIndex].id;
    }

    tabs.splice(tabIndex, 1);
    focusEditor();
  }

  // --- File operations ---

  async function maybeDiscardChanges(actionLabel: string): Promise<boolean> {
    if (!activeTab.isDirty || (settings.autoSave && activeTab.filePath)) {
      return true;
    }

    const result = await showConfirm({
      title: `${actionLabel} note`,
      message: "This note has unsaved changes. Continue and discard the current draft?",
      okLabel: "Discard changes",
      okVariant: "danger",
      cancelLabel: "Cancel",
    });
    return result === "ok";
  }

  async function saveFile(forceDialog = false): Promise<boolean> {
    const tab = activeTab;
    try {
      let targetPath = tab.filePath;

      if (!targetPath || forceDialog) {
        const selectedPath = await saveDialog({
          title: "Save note",
          defaultPath: targetPath ?? fileName,
          filters: [{ name: "Text", extensions: ["txt", "md", "text"] }],
        });

        if (!selectedPath) return false;
        targetPath = selectedPath;
        tab.filePath = selectedPath;
      }

      tab.saveState = "saving";
      await writeTextFile(targetPath, tab.fileContent);
      tab.isDirty = false;
      tab.saveState = "saved";
      tab.lastError = "";
      return true;
    } catch (error) {
      tab.saveState = "error";
      tab.lastError = error instanceof Error ? error.message : "Unable to save this note.";
      return false;
    }
  }

  async function openFile() {
    if (!(await maybeDiscardChanges("Open"))) return;

    try {
      const selected = await openDialog({
        title: "Open note",
        multiple: false,
        directory: false,
        filters: [{ name: "Text", extensions: ["txt", "md", "text"] }],
      });

      if (typeof selected !== "string") return;

      const contents = await readTextFile(selected);
      activeTab.filePath = selected;
      setTabContent(activeTab, contents);
      isProtected = true;
      focusEditor();
    } catch (error) {
      activeTab.lastError =
        error instanceof Error ? error.message : "Unable to open this file.";
    }
  }

  async function newFile() {
    if (!(await maybeDiscardChanges("New"))) return;

    activeTab.filePath = null;
    setTabContent(activeTab, "");
    isProtected = true;
    focusEditor();
  }

  function toggleProtection() {
    isProtected = !isProtected;
    focusEditor();
  }

  async function handleBeforeClose(event: CloseRequestedEvent) {
    const dirtyTabs = tabs.filter((t) => t.isDirty && !(settings.autoSave && t.filePath));
    if (dirtyTabs.length === 0) return;

    const names = dirtyTabs
      .map((t) => (t.filePath ? basename(t.filePath) : "Untitled"))
      .join(", ");

    const result = await showConfirm({
      title: "Close See the Unseen",
      message: `${dirtyTabs.length === 1 ? `"${names}" has` : `${dirtyTabs.length} notes have`} unsaved changes. Save before closing?`,
      okLabel: "Save & Close",
      okVariant: "primary",
      discardLabel: "Don't Save",
      cancelLabel: "Cancel",
    });

    // User cancelled → stay in app
    if (result === "cancel") {
      event.preventDefault();
      return;
    }

    // User chose Don't Save → let Tauri auto-destroy (no preventDefault)
    if (result === "discard") return;

    // User chose Save & Close → prevent auto-close, save, then destroy manually
    event.preventDefault();

    const previousTabId = activeTabId;

    for (const tab of dirtyTabs) {
      activeTabId = tab.id;
      const saved = await saveFile(false);

      if (!saved || tab.isDirty) {
        // Save was cancelled or failed → abort close, stay in app
        activeTabId = previousTabId;
        focusEditor();
        return;
      }
    }

    await appWindow?.destroy();
  }

  // --- Keyboard shortcuts ---

  function handleShortcuts(event: KeyboardEvent) {
    const usesCommand = event.ctrlKey || event.metaKey;
    if (!usesCommand) return;

    const lowerKey = event.key.toLowerCase();

    if (lowerKey === "s") {
      event.preventDefault();
      void saveFile(event.shiftKey);
      return;
    }

    if (lowerKey === "o") {
      event.preventDefault();
      void openFile();
      return;
    }

    if (lowerKey === "n") {
      event.preventDefault();
      void newFile();
      return;
    }

    if (lowerKey === "t") {
      event.preventDefault();
      addTab();
      return;
    }

    if (lowerKey === "w") {
      event.preventDefault();
      void closeTab(activeTabId);
      return;
    }

    if (lowerKey === "tab") {
      event.preventDefault();
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : (currentIndex + 1) % tabs.length;
      switchToTab(tabs[nextIndex].id);
      return;
    }

    if (lowerKey === ",") {
      event.preventDefault();
      settingsOpen = !settingsOpen;
      focusEditor();
      return;
    }

    if (event.shiftKey && lowerKey === "h") {
      event.preventDefault();
      toggleProtection();
    }
  }

  // --- Lifecycle ---

  onMount(() => {
    appWindow = getCurrentWindow();

    const cleanups: Array<() => void> = [];
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark = mediaQuery.matches;

    const handleThemeChange = (event: MediaQueryListEvent) => {
      systemPrefersDark = event.matches;
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    cleanups.push(() => mediaQuery.removeEventListener("change", handleThemeChange));

    window.addEventListener("keydown", handleShortcuts, { capture: true });
    cleanups.push(() =>
      window.removeEventListener("keydown", handleShortcuts, { capture: true }),
    );

    void (async () => {
      settingsStore = await Store.load("settings.json", {
        defaults: { settings: defaultSettings },
        autoSave: false,
      });

      const storedSettings = await settingsStore.get<Partial<Settings>>("settings");
      if (storedSettings) {
        settings = { ...defaultSettings, ...storedSettings };
      }

      const unlistenBlur = await listen(TauriEvent.WINDOW_BLUR, () => {
        if (settings.altTabProtect) {
          isProtected = true;
        }
      });
      cleanups.push(unlistenBlur);

      const unlistenClose = await appWindow!.onCloseRequested(handleBeforeClose);
      cleanups.push(unlistenClose);

      hydrated = true;
      focusEditor();
    })();

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  // --- Effects ---

  $effect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.title = `${fileName} - See the Unseen`;
  });

  $effect(() => {
    if (!hydrated || !settingsStore) return;

    const snapshot = { ...settings };
    void (async () => {
      await settingsStore?.set("settings", snapshot);
      await settingsStore?.save();
    })();
  });

  $effect(() => {
    if (!hydrated || !appWindow) return;
    void appWindow.setContentProtected(settings.screenshotProtect && isProtected);
  });

  $effect(() => {
    if (!hydrated || !settings.autoSave || !activeTab.filePath || !activeTab.isDirty) return;

    const timer = window.setTimeout(() => {
      void saveFile(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  });
</script>

<svelte:head>
  <meta name="description" content="Privacy-first desktop notes with a sliding protection window." />
</svelte:head>

<main class="shell">
  <section class="frame">
    <AppHeader
      {fileName}
      {words}
      {characters}
      isDirty={activeTab.isDirty}
      {protectionLabel}
      {protectionTone}
      {saveLabel}
      {isProtected}
      onNew={newFile}
      onOpen={openFile}
      onSave={() => void saveFile(false)}
      onToggleProtection={toggleProtection}
      onToggleSettings={() => (settingsOpen = !settingsOpen)}
    />

    <TabBar
      {tabs}
      {activeTabId}
      onTabSelect={switchToTab}
      onTabClose={(id) => void closeTab(id)}
      onNewTab={addTab}
    />

    <section class="workspace" class:workspace-full={!settingsOpen}>
      <EditorPane
        bind:fileContent={activeTab.fileContent}
        bind:editorElement
        {displayText}
        scrollTop={activeTab.scrollTop}
        scrollLeft={activeTab.scrollLeft}
        {focusRadius}
        onInput={markDirty}
        onSyncMetrics={syncEditorMetrics}
        onCompositionStart={() => {
          isComposing = true;
        }}
        onCompositionEnd={() => {
          isComposing = false;
          syncEditorMetrics();
        }}
      />

      {#if settingsOpen}
        <SettingsPanel
          bind:settings
          {settingsOpen}
          {windowSizeOptions}
          lastError={activeTab.lastError}
          onClose={() => {
            settingsOpen = false;
            focusEditor();
          }}
        />
      {/if}
    </section>
  </section>
</main>

{#if confirmState}
  <ConfirmModal
    title={confirmState.title}
    message={confirmState.message}
    okLabel={confirmState.okLabel}
    okVariant={confirmState.okVariant}
    discardLabel={confirmState.discardLabel}
    cancelLabel={confirmState.cancelLabel}
    onOk={() => { confirmState?.resolve("ok"); confirmState = null; }}
    onDiscard={() => { confirmState?.resolve("discard"); confirmState = null; }}
    onCancel={() => { confirmState?.resolve("cancel"); confirmState = null; }}
  />
{/if}

<style>
  :global(html) {
    color-scheme: light;
    font-family: "Segoe UI Variable", "Aptos", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(222, 85, 33, 0.16), transparent 30%),
      radial-gradient(circle at bottom right, rgba(26, 105, 92, 0.18), transparent 25%),
      #f3ecdf;
    color: #1b1712;
  }

  :global(html[data-theme="dark"]) {
    color-scheme: dark;
    background:
      radial-gradient(circle at top left, rgba(204, 125, 52, 0.24), transparent 32%),
      radial-gradient(circle at bottom right, rgba(37, 96, 102, 0.18), transparent 28%),
      #111614;
    color: #f3efe4;
  }

  :global(body) {
    margin: 0;
  }

  .shell {
    min-height: 100vh;
    padding: 24px;
    box-sizing: border-box;
  }

  .frame {
    min-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .workspace {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 18px;
  }

  .workspace-full {
    grid-template-columns: 1fr;
  }

  @media (max-width: 1080px) {
    .workspace {
      grid-template-columns: 1fr;
      display: grid;
    }

    .shell {
      padding: 16px;
    }

    .frame {
      min-height: calc(100vh - 32px);
    }
  }
</style>
