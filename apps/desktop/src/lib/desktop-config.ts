import type { WindowSize } from "$lib/masking";

export type ThemeMode = "system" | "light" | "dark";
export type SaveState = "idle" | "saving" | "saved" | "error";

export type HotkeyAction =
  | "save"
  | "saveAs"
  | "open"
  | "new"
  | "newTab"
  | "closeTab"
  | "nextTab"
  | "prevTab"
  | "toggleSettings"
  | "toggleProtection";

export type HotkeyBinding = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
};

export type HotkeyMap = Record<HotkeyAction, HotkeyBinding>;

export const ACTION_LABELS: Record<HotkeyAction, string> = {
  save: "Save",
  saveAs: "Save As…",
  open: "Open file",
  new: "New note",
  newTab: "New tab",
  closeTab: "Close tab",
  nextTab: "Next tab",
  prevTab: "Previous tab",
  toggleSettings: "Settings",
  toggleProtection: "Toggle protection",
};

export const defaultHotkeys: HotkeyMap = {
  save: { key: "s", ctrl: true, shift: false, alt: false },
  saveAs: { key: "s", ctrl: true, shift: true, alt: false },
  open: { key: "o", ctrl: true, shift: false, alt: false },
  new: { key: "n", ctrl: true, shift: false, alt: false },
  newTab: { key: "t", ctrl: true, shift: false, alt: false },
  closeTab: { key: "w", ctrl: true, shift: false, alt: false },
  nextTab: { key: "tab", ctrl: true, shift: false, alt: false },
  prevTab: { key: "tab", ctrl: true, shift: true, alt: false },
  toggleSettings: { key: ",", ctrl: true, shift: false, alt: false },
  toggleProtection: { key: "h", ctrl: true, shift: true, alt: false },
};

export type Tab = {
  id: string;
  fileContent: string;
  filePath: string | null;
  isDirty: boolean;
  saveState: SaveState;
  selectionStart: number;
  selectionEnd: number;
  scrollTop: number;
  scrollLeft: number;
  lastError: string;
  sessionSeed: number;
};

export function createTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: crypto.randomUUID(),
    fileContent: "",
    filePath: null,
    isDirty: false,
    saveState: "idle",
    selectionStart: 0,
    selectionEnd: 0,
    scrollTop: 0,
    scrollLeft: 0,
    lastError: "",
    sessionSeed: Math.floor(Math.random() * 0x7fffffff),
    ...overrides,
  };
}

export type Settings = {
  altTabProtect: boolean;
  screenshotProtect: boolean;
  autoSave: boolean;
  showWordCount: boolean;
  theme: ThemeMode;
  windowSize: WindowSize;
  hotkeys: HotkeyMap;
};

export const defaultSettings: Settings = {
  altTabProtect: true,
  screenshotProtect: false,
  autoSave: true,
  showWordCount: false,
  theme: "system",
  windowSize: "medium",
  hotkeys: defaultHotkeys,
};

export const windowSizeOptions = [
  { value: "tight", label: "Tight", hint: "Focuses on a very small window" },
  { value: "medium", label: "Medium", hint: "Balanced privacy while typing" },
  { value: "wide", label: "Wide", hint: "More context stays visible" },
] as const;
