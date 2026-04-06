<script lang="ts">
  import { onMount } from "svelte";
  import { TauriEvent, listen } from "@tauri-apps/api/event";
  import { CloseRequestedEvent, getCurrentWindow } from "@tauri-apps/api/window";
  import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
  import { readTextFile, writeTextFile, readFile, writeFile } from "@tauri-apps/plugin-fs";
  import { invoke } from "@tauri-apps/api/core";
  import { Store } from "@tauri-apps/plugin-store";
  import AppHeader from "$lib/components/AppHeader.svelte";
  import EditorPane from "$lib/components/EditorPane.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import PasswordModal from "$lib/components/PasswordModal.svelte";
  import TabBar from "$lib/components/TabBar.svelte";
  import {
    createTab,
    defaultHotkeys,
    defaultSettings,
    maskPersonaOptions,
    windowSizeOptions,
    type HotkeyBinding,
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

  // --- Password modal state ---
  type PasswordConfig = {
    mode: "encrypt" | "decrypt";
    filename: string;
    submit: (password: string) => Promise<void>;
    resolve: (password: string | null) => void;
  };

  let passwordState = $state<PasswordConfig | null>(null);

  function showPasswordModal(opts: Omit<PasswordConfig, "resolve">): Promise<string | null> {
    return new Promise((resolve) => {
      passwordState = { ...opts, resolve };
    });
  }

  async function handlePasswordConfirm(password: string) {
    const state = passwordState;
    if (!state) return;

    await state.submit(password);
    state.resolve(password);
    passwordState = null;
  }

  function handlePasswordCancel() {
    passwordState?.resolve(null);
    passwordState = null;
  }

  // --- Global (window-level) state ---
  let settings = $state<Settings>({ ...defaultSettings });
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
      isProtected: activeTab.isProtected,
      sessionSeed: activeTab.sessionSeed,
      persona: settings.maskPersona,
      revealRange,
    }),
  );
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

  const words = $derived(
    activeTab.fileContent.trim() === ""
      ? 0
      : activeTab.fileContent.trim().split(/\s+/).length,
  );
  const characters = $derived(activeTab.fileContent.length);

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
    tab.isProtected = true;
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
        filters: [
          { name: "Text", extensions: ["txt", "md", "text"] },
          { name: "Encrypted Note", extensions: ["stn"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (typeof selected !== "string") return;

      if (selected.endsWith(".stn")) {
        const rawBytes = await readFile(selected);
        await showPasswordModal({
          mode: "decrypt",
          filename: basename(selected),
          submit: async (password) => {
            const plaintext: string = await invoke("decrypt_content", {
              password,
              data: Array.from(rawBytes),
            });
            activeTab.filePath = selected;
            activeTab.encryptionPassword = password;
            setTabContent(activeTab, plaintext);
            focusEditor();
          },
        });
      } else {
        const contents = await readTextFile(selected);
        activeTab.filePath = selected;
        setTabContent(activeTab, contents);
      }

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
    focusEditor();
  }

  async function saveEncryptedFile(forceDialog = false): Promise<boolean> {
    const tab = activeTab;
    try {
      let targetPath = tab.filePath;

      if (!targetPath || forceDialog || !targetPath.endsWith(".stn")) {
        const selectedPath = await saveDialog({
          title: "Save encrypted note",
          defaultPath: targetPath?.replace(/\.[^.]+$/, "") ?? "Untitled",
          filters: [{ name: "Encrypted Note", extensions: ["stn"] }],
        });
        if (!selectedPath) return false;
        targetPath = selectedPath;
      }

      // Use cached session password to avoid re-prompting on every Ctrl+S
      let password = tab.encryptionPassword;
      if (!password) {
        password = await showPasswordModal({
          mode: "encrypt",
          filename: basename(targetPath),
          submit: async () => {},
        });
        if (!password) return false;
      }

      tab.saveState = "saving";
      const encryptedBytes: number[] = await invoke("encrypt_content", {
        password,
        plaintext: tab.fileContent,
      });
      await writeFile(targetPath, new Uint8Array(encryptedBytes));
      tab.filePath = targetPath;
      tab.encryptionPassword = password;
      tab.isDirty = false;
      tab.saveState = "saved";
      tab.lastError = "";
      return true;
    } catch (error) {
      tab.saveState = "error";
      tab.lastError = error instanceof Error ? error.message : "Unable to encrypt this note.";
      return false;
    }
  }

  async function panicMask() {
    for (const tab of tabs) {
      tab.isProtected = true;
    }
    settingsOpen = false;

    try {
      await appWindow?.hide();
    } catch (error) {
      activeTab.lastError = error instanceof Error ? error.message : "Unable to hide this window.";
    }
  }

  function toggleProtection() {
    activeTab.isProtected = !activeTab.isProtected;
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

  function matchesHotkey(event: KeyboardEvent, b: HotkeyBinding): boolean {
    return (
      event.key.toLowerCase() === b.key &&
      (event.ctrlKey || event.metaKey) === b.ctrl &&
      event.shiftKey === b.shift &&
      event.altKey === b.alt
    );
  }

  function handleShortcuts(event: KeyboardEvent) {
    const hk = settings.hotkeys;

    if (matchesHotkey(event, hk.saveAs)) {
      event.preventDefault();
      void saveFile(true);
      return;
    }

    if (matchesHotkey(event, hk.save)) {
      event.preventDefault();
      if (activeTab.filePath?.endsWith(".stn")) {
        void saveEncryptedFile(false);
      } else {
        void saveFile(false);
      }
      return;
    }

    if (matchesHotkey(event, hk.saveEncrypted)) {
      event.preventDefault();
      void saveEncryptedFile(true);
      return;
    }

    if (matchesHotkey(event, hk.panicMask)) {
      event.preventDefault();
      void panicMask();
      return;
    }

    if (matchesHotkey(event, hk.open)) {
      event.preventDefault();
      void openFile();
      return;
    }

    if (matchesHotkey(event, hk.new)) {
      event.preventDefault();
      void newFile();
      return;
    }

    if (matchesHotkey(event, hk.newTab)) {
      event.preventDefault();
      addTab();
      return;
    }

    if (matchesHotkey(event, hk.closeTab)) {
      event.preventDefault();
      void closeTab(activeTabId);
      return;
    }

    if (matchesHotkey(event, hk.nextTab)) {
      event.preventDefault();
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      switchToTab(tabs[(currentIndex + 1) % tabs.length].id);
      return;
    }

    if (matchesHotkey(event, hk.prevTab)) {
      event.preventDefault();
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      switchToTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
      return;
    }

    if (matchesHotkey(event, hk.toggleSettings)) {
      event.preventDefault();
      settingsOpen = !settingsOpen;
      if (!settingsOpen) focusEditor();
      return;
    }

    if (matchesHotkey(event, hk.toggleProtection)) {
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
        settings = {
          ...defaultSettings,
          ...storedSettings,
          hotkeys: { ...defaultHotkeys, ...storedSettings.hotkeys },
        };
      }

      const unlistenBlur = await listen(TauriEvent.WINDOW_BLUR, () => {
        if (settings.altTabProtect) {
          activeTab.isProtected = true;
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
    void appWindow.setContentProtected(settings.screenshotProtect && activeTab.isProtected);
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
      {saveLabel}
      onNew={newFile}
      onOpen={openFile}
      onSave={() => void (activeTab.filePath?.endsWith(".stn") ? saveEncryptedFile(false) : saveFile(false))}
      onSaveEncrypted={() => void saveEncryptedFile(true)}
      onToggleSettings={() => (settingsOpen = !settingsOpen)}
    />

    <TabBar
      {tabs}
      {activeTabId}
      onTabSelect={switchToTab}
      onTabClose={(id) => void closeTab(id)}
      onNewTab={addTab}
    />

    <section class="workspace">
      <EditorPane
        bind:fileContent={activeTab.fileContent}
        bind:editorElement
        {displayText}
        scrollTop={activeTab.scrollTop}
        scrollLeft={activeTab.scrollLeft}
        isProtected={activeTab.isProtected}
        {words}
        {characters}
        showWordCount={settings.showWordCount}
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


    </section>
  </section>
</main>

{#if settingsOpen}
  <SettingsModal
    bind:settings
    {windowSizeOptions}
    {maskPersonaOptions}
    lastError={activeTab.lastError}
    onClose={() => {
      settingsOpen = false;
      focusEditor();
    }}
  />
{/if}

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

{#if passwordState}
  <PasswordModal
    mode={passwordState.mode}
    filename={passwordState.filename}
    onConfirm={handlePasswordConfirm}
    onCancel={handlePasswordCancel}
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
    grid-template-columns: 1fr;
    gap: 18px;
  }

  @media (max-width: 1080px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .shell {
      padding: 16px;
    }

    .frame {
      min-height: calc(100vh - 32px);
    }
  }
</style>
