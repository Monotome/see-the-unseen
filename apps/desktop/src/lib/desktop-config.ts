import type { WindowSize } from "$lib/masking";

export type ThemeMode = "system" | "light" | "dark";
export type SaveState = "idle" | "saving" | "saved" | "error";

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
  theme: ThemeMode;
  windowSize: WindowSize;
};

export const defaultSettings: Settings = {
  altTabProtect: true,
  screenshotProtect: false,
  autoSave: true,
  theme: "system",
  windowSize: "medium",
};

export const windowSizeOptions = [
  { value: "tight", label: "Tight", hint: "Focuses on a very small window" },
  { value: "medium", label: "Medium", hint: "Balanced privacy while typing" },
  { value: "wide", label: "Wide", hint: "More context stays visible" },
] as const;
