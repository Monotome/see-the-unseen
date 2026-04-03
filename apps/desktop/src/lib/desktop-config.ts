import type { WindowSize } from "$lib/masking";

export type ThemeMode = "system" | "light" | "dark";
export type SaveState = "idle" | "saving" | "saved" | "error";

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
