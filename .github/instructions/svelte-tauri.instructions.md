---
description: "Use when writing Svelte components, TypeScript logic, or Rust/Tauri code for See the Unseen — a privacy-first Tauri v2 + Svelte 5 desktop notepad. Covers runes API, Tauri plugin patterns, component conventions, and Rust backend style."
applyTo: ["apps/desktop/src/**", "apps/desktop/src-tauri/src/**"]
---

# See the Unseen — Svelte 5 + Tauri v2 Guidelines

## Project Context

**See the Unseen** is a privacy-first desktop notepad. Text is masked everywhere except a small radius around the cursor — protecting against shoulder-surfing and screen recording.

- **Frontend**: Svelte 5 (runes API), SvelteKit, TypeScript, Vite
- **Backend**: Tauri v2, Rust — all features delegated to official Tauri plugins (no custom commands unless unavoidable)
- **Monorepo**: pnpm workspaces, single app at `apps/desktop/`

---

## Svelte 5 — Runes API

Always use the **runes API**. Never use Svelte 3/4 reactive syntax (`$:`, `export let`, `createEventDispatcher`).

### State

```svelte
<script lang="ts">
  let count = $state(0);
  let settings = $state<Settings>({ ...defaultSettings });
</script>
```

- Annotate type explicitly for object states: `$state<Settings>({...})`
- Use primitive initializers for simple values: `$state("")`, `$state(false)`

### Derived

```svelte
const fileName = $derived(basename(filePath));
// Complex logic:
const displayText = $derived.by(() => buildMaskedText({ ... }));
```

- Prefer `$derived` for single-expression computations
- Use `$derived.by()` only when logic requires multiple statements

### Effects

```svelte
$effect(() => {
  document.documentElement.dataset.theme = activeTheme;
});

// Cleanup inside effect:
$effect(() => {
  const timer = setTimeout(save, 1200);
  return () => clearTimeout(timer);
});
```

- Never perform async calls directly inside `$effect` — use `void asyncFn()` or extract to a helper
- Always return a cleanup function when the effect registers listeners or timers

### Props & Bindable

```svelte
let {
  fileContent = $bindable(),
  displayText,
  onInput,
}: {
  fileContent: string;
  displayText: string;
  onInput: (e: Event) => void;
} = $props();
```

- Destructure all props with `$props()` — inline full type annotation as an object literal
- Use `$bindable()` for props that the parent binds with `bind:`
- Callback props use `on*` prefix: `onInput`, `onSave`, `onToggleProtection`
- No default values for required props — rely on TypeScript to enforce them

### onMount & Cleanup

```typescript
import { onMount } from "svelte";

onMount(() => {
  const cleanups: Array<() => void> = [];

  // Collect unlisten/removeEventListener references
  cleanups.push(() => mediaQuery.removeEventListener("change", handler));

  return () => {
    for (const fn of cleanups) fn();
  };
});
```

Always collect cleanup functions into an array and iterate in the return callback.

---

## Tauri v2 — Plugin Patterns

**Prefer plugins over custom commands.** Only add Rust `#[tauri::command]` when no plugin covers the use case.

### Approved Plugins

| Plugin                      | Use For                            |
| --------------------------- | ---------------------------------- |
| `@tauri-apps/plugin-fs`     | Read/write files                   |
| `@tauri-apps/plugin-dialog` | Open/save/alert dialogs            |
| `@tauri-apps/plugin-store`  | JSON persistence (`settings.json`) |
| `@tauri-apps/api/event`     | Window & app events                |
| `@tauri-apps/api/window`    | Content protection, window control |

### File I/O

```typescript
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const content = await readTextFile(filePath);
await writeTextFile(filePath, content);
```

### Dialogs

```typescript
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";

const path = await openDialog({
  filters: [{ name: "Text", extensions: ["txt", "md"] }],
});
const savePath = await saveDialog({ defaultPath: filePath });
```

### Store (Settings Persistence)

```typescript
import { Store } from "@tauri-apps/plugin-store";

const store = await Store.load("settings.json", {
  defaults: { settings: defaultSettings },
  autoSave: false,
});
const stored = await store.get<Partial<Settings>>("settings");
await store.set("settings", updatedSettings);
await store.save();
```

- Always use `autoSave: false` and call `.save()` manually on user action
- Always use `get<Partial<T>>` — stored values may be partial from older versions

### Events

```typescript
import { listen, TauriEvent } from "@tauri-apps/api/event";

const unlisten = await listen(TauriEvent.WINDOW_BLUR, () => {
  if (settings.altTabProtect) isProtected = true;
});
// Store `unlisten` and call it during cleanup
```

### Window

```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();
await appWindow.setContentProtected(isProtected && settings.screenshotProtect);
```

---

## TypeScript Conventions

- Use `import type` for type-only imports
- Prefer string union types for state machines: `type SaveState = "idle" | "saving" | "saved" | "error"`
- Use `as const` on fixed option arrays/objects
- Colocate component prop types inline in `$props()` — no separate interface files per component
- Shared types and defaults go in `desktop-config.ts`

```typescript
// Error handling
try {
  await op();
} catch (error) {
  message = error instanceof Error ? error.message : "Unknown error";
}
```

---

## Naming Conventions

| Pattern                  | Convention               | Examples                                       |
| ------------------------ | ------------------------ | ---------------------------------------------- |
| Variables & state        | camelCase                | `fileContent`, `isProtected`, `isDirty`        |
| Constants (module-level) | UPPER_SNAKE_CASE         | `WINDOW_RADII`, `LETTER_WEIGHTS`               |
| Booleans                 | `is*` / `are*` / `can*`  | `isProtected`, `isDirty`, `isComposing`        |
| Callback props           | `on*`                    | `onSave`, `onInput`, `onToggleProtection`      |
| Event handlers           | `handle*`                | `handleShortcuts`, `handleThemeChange`         |
| Async functions          | descriptive verb phrases | `maybeDiscardChanges()`, `syncEditorMetrics()` |

---

## Rust / Tauri Backend

- Register plugins in `lib.rs` using the builder pattern
- Keep `main.rs` minimal — only calls `run()`
- Use `#[cfg_attr(mobile, tauri::mobile_entry_point)]` for mobile compatibility
- Do not add custom Tauri commands unless no plugin alternative exists

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## File Organization

```
apps/desktop/src/
├── lib/
│   ├── desktop-config.ts     # Shared types, defaults, constants
│   ├── masking.ts            # Pure algorithm functions
│   └── components/           # Svelte components
└── routes/
    ├── +layout.ts            # SvelteKit layout (SSR disabled)
    └── +page.svelte          # Main app entry
```

- Pure/stateless utility functions belong in `lib/*.ts`, not inside components
- Each component file is self-contained; avoid splitting a component across multiple files
