<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { TauriEvent, listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { confirm, open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
  import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { Store } from "@tauri-apps/plugin-store";
  import AppHeader from "$lib/components/AppHeader.svelte";
  import EditorPane from "$lib/components/EditorPane.svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import {
    defaultSettings,
    windowSizeOptions,
    type SaveState,
    type Settings,
  } from "$lib/desktop-config";
  import { WINDOW_RADII, basename, buildMaskedText, type WindowSize } from "$lib/masking";

  const sessionSeed = Math.floor(Math.random() * 0x7fffffff);

  let settings = $state<Settings>({ ...defaultSettings });
  let isProtected = $state(true);
  let fileContent = $state("");
  let filePath = $state<string | null>(null);
  let isDirty = $state(false);
  let settingsOpen = $state(false);
  let selectionStart = $state(0);
  let selectionEnd = $state(0);
  let scrollTop = $state(0);
  let scrollLeft = $state(0);
  let systemPrefersDark = $state(false);
  let saveState = $state<SaveState>("idle");
  let isComposing = $state(false);
  let hydrated = $state(false);
  let lastError = $state("");

  let editorElement = $state<HTMLTextAreaElement | null>(null);
  let settingsStore: Store | null = null;
  let appWindow: { setContentProtected(protected_: boolean): Promise<void> } | null = null;

  const fileName = $derived(basename(filePath));
  const activeTheme = $derived(
    settings.theme === "system" ? (systemPrefersDark ? "dark" : "light") : settings.theme,
  );
  const focusRadius = $derived(WINDOW_RADII[settings.windowSize]);
  const revealRange = $derived(
    isComposing ? { start: Math.min(selectionStart, selectionEnd), end: Math.max(selectionStart, selectionEnd) } : null,
  );
  const displayText = $derived.by(() =>
    buildMaskedText({
      text: fileContent,
      cursorIndex: selectionEnd,
      radius: focusRadius,
      isProtected,
      sessionSeed,
      revealRange,
    }),
  );
  const words = $derived(fileContent.trim() ? fileContent.trim().split(/\s+/).length : 0);
  const characters = $derived(fileContent.length);
  const protectionLabel = $derived(isProtected ? "Protected" : "Visible");
  const protectionTone = $derived(isProtected ? "danger" : "safe");
  const saveLabel = $derived(
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : isDirty
            ? "Unsaved"
            : settings.autoSave
              ? "Auto-save ready"
              : "Idle",
  );

  function focusEditor() {
    requestAnimationFrame(() => {
      editorElement?.focus();
    });
  }

  function syncEditorMetrics() {
    if (!editorElement) {
      return;
    }

    selectionStart = editorElement.selectionStart ?? 0;
    selectionEnd = editorElement.selectionEnd ?? selectionStart;
    scrollTop = editorElement.scrollTop;
    scrollLeft = editorElement.scrollLeft;
  }

  function setEditorContent(nextContent: string) {
    fileContent = nextContent;
    isDirty = false;
    saveState = "idle";
    lastError = "";
    syncEditorMetrics();
  }

  function markDirty() {
    isDirty = true;
    saveState = "idle";
    lastError = "";
    syncEditorMetrics();
  }

  async function maybeDiscardChanges(actionLabel: string): Promise<boolean> {
    if (!isDirty || (settings.autoSave && filePath)) {
      return true;
    }

    return confirm(
      "This note has unsaved changes. Continue and discard the current draft?",
      {
        title: `${actionLabel} note`,
        kind: "warning",
      },
    );
  }

  async function saveFile(forceDialog = false): Promise<boolean> {
    try {
      let targetPath = filePath;

      if (!targetPath || forceDialog) {
        const selectedPath = await saveDialog({
          title: "Save note",
          defaultPath: targetPath ?? fileName,
          filters: [{ name: "Text", extensions: ["txt", "md", "text"] }],
        });

        if (!selectedPath) {
          return false;
        }

        targetPath = selectedPath;
        filePath = selectedPath;
      }

      saveState = "saving";
      await writeTextFile(targetPath, fileContent);
      isDirty = false;
      saveState = "saved";
      lastError = "";
      return true;
    } catch (error) {
      saveState = "error";
      lastError = error instanceof Error ? error.message : "Unable to save this note.";
      return false;
    }
  }

  async function openFile() {
    if (!(await maybeDiscardChanges("Open"))) {
      return;
    }

    try {
      const selected = await openDialog({
        title: "Open note",
        multiple: false,
        directory: false,
        filters: [{ name: "Text", extensions: ["txt", "md", "text"] }],
      });

      if (typeof selected !== "string") {
        return;
      }

      const contents = await readTextFile(selected);
      filePath = selected;
      setEditorContent(contents);
      isProtected = true;
      focusEditor();
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unable to open this file.";
    }
  }

  async function newFile() {
    if (!(await maybeDiscardChanges("New"))) {
      return;
    }

    filePath = null;
    setEditorContent("");
    isProtected = true;
    focusEditor();
  }

  function toggleProtection() {
    isProtected = !isProtected;
    focusEditor();
  }

  function handleShortcuts(event: KeyboardEvent) {
    const usesCommand = event.ctrlKey || event.metaKey;

    if (!usesCommand) {
      return;
    }

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
    cleanups.push(() => window.removeEventListener("keydown", handleShortcuts, { capture: true }));

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

      hydrated = true;
      focusEditor();
    })();

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  });

  $effect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.title = `${fileName} - See the Unseen`;
  });

  $effect(() => {
    if (!hydrated || !settingsStore) {
      return;
    }

    const snapshot = { ...settings };
    void (async () => {
      await settingsStore?.set("settings", snapshot);
      await settingsStore?.save();
    })();
  });

  $effect(() => {
    if (!hydrated || !appWindow) {
      return;
    }

    void appWindow.setContentProtected(settings.screenshotProtect && isProtected);
  });

  $effect(() => {
    if (!hydrated || !settings.autoSave || !filePath || !isDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveFile(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
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
      {isDirty}
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

    <section class="workspace" class:workspace-full={!settingsOpen}>
      <EditorPane
        bind:fileContent
        bind:editorElement
        {displayText}
        {scrollTop}
        {scrollLeft}
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
          {lastError}
          onClose={() => {
            settingsOpen = false;
            focusEditor();
          }}
        />
      {/if}
    </section>
  </section>
</main>

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
