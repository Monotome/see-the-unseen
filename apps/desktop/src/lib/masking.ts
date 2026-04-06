export type WindowSize = "tight" | "medium" | "wide";
export type MaskPersona = "english" | "lorem" | "code" | "finance";

export const WINDOW_RADII: Record<WindowSize, number> = {
  tight: 10,
  medium: 20,
  wide: 35,
};

// ---------- shared deterministic hash ----------

function hash(seed: number, index: number, salt: number): number {
  let value = seed ^ Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

// ---------- english persona ----------

const ENGLISH_WEIGHTS = [
  ["e", 12.02], ["t", 9.1],  ["a", 8.12], ["o", 7.68], ["i", 7.31],
  ["n", 6.95],  ["s", 6.28], ["r", 6.02], ["h", 5.92], ["d", 4.32],
  ["l", 3.98],  ["u", 2.88], ["c", 2.71], ["m", 2.61], ["f", 2.3],
  ["y", 2.11],  ["w", 2.09], ["g", 2.03], ["p", 1.82], ["b", 1.49],
  ["v", 1.11],  ["k", 0.69], ["x", 0.17], ["q", 0.11], ["j", 0.1],
  ["z", 0.07],
] as const;
const ENGLISH_TOTAL = ENGLISH_WEIGHTS.reduce((s, [, w]) => s + w, 0);
const ENGLISH_PUNCTUATION = [".", ",", ";", ":", "!", "?", "-", "'", "\"", "(", ")"];
const DIGITS = "0123456789";

function pickEnglishLetter(seed: number, index: number): string {
  const target = (hash(seed, index, 17) / 0xffffffff) * ENGLISH_TOTAL;
  let cumulative = 0;
  for (const [letter, weight] of ENGLISH_WEIGHTS) {
    cumulative += weight;
    if (target <= cumulative) return letter;
  }
  return "e";
}

function maskEnglish(char: string, seed: number, index: number): string {
  if (/\s/.test(char)) return char;
  if (/[a-z]/i.test(char)) {
    const l = pickEnglishLetter(seed, index);
    return char === char.toUpperCase() ? l.toUpperCase() : l;
  }
  if (/\d/.test(char)) return DIGITS[hash(seed, index, 29) % DIGITS.length];
  if (/[-!?,.;:'"()\[\]{}]/.test(char))
    return ENGLISH_PUNCTUATION[hash(seed, index, 43) % ENGLISH_PUNCTUATION.length];
  return pickEnglishLetter(seed, index);
}

// ---------- lorem persona ----------
// Heavy on l/o/r/e/m/i/p/s/u/t to mimic Latin placeholder text

const LOREM_WEIGHTS = [
  ["l", 9.0],  ["o", 8.5],  ["r", 7.8],  ["e", 7.5],  ["m", 7.0],
  ["i", 6.8],  ["p", 6.2],  ["s", 5.9],  ["u", 5.5],  ["t", 5.0],
  ["a", 4.5],  ["c", 3.8],  ["d", 3.2],  ["n", 3.0],  ["g", 2.4],
  ["f", 1.8],  ["v", 1.5],  ["b", 1.2],  ["q", 1.0],  ["h", 0.8],
] as const;
const LOREM_TOTAL = LOREM_WEIGHTS.reduce((s, [, w]) => s + w, 0);
const LOREM_PUNCTUATION = [".", ",", ";", ":", "-"];

function pickLoremLetter(seed: number, index: number): string {
  const target = (hash(seed, index, 31) / 0xffffffff) * LOREM_TOTAL;
  let cumulative = 0;
  for (const [letter, weight] of LOREM_WEIGHTS) {
    cumulative += weight;
    if (target <= cumulative) return letter;
  }
  return "l";
}

function maskLorem(char: string, seed: number, index: number): string {
  if (/\s/.test(char)) return char;
  if (/[a-z]/i.test(char)) {
    const l = pickLoremLetter(seed, index);
    return char === char.toUpperCase() ? l.toUpperCase() : l;
  }
  if (/\d/.test(char)) return DIGITS[hash(seed, index, 37) % DIGITS.length];
  if (/[-!?,.;:'"()\[\]{}]/.test(char))
    return LOREM_PUNCTUATION[hash(seed, index, 53) % LOREM_PUNCTUATION.length];
  return pickLoremLetter(seed, index);
}

// ---------- code persona ----------
// Mix of identifiers, operators and brackets - looks like source code

const CODE_LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_DIGITS = "0123456789";
const CODE_SYMBOLS = "(){};=><._/+-*&|!?:";

function maskCode(char: string, seed: number, index: number): string {
  if (/\s/.test(char)) return char;
  // Uppercase letters → uppercase identifier chars; lowercase → lowercase
  if (/[A-Z]/.test(char)) {
    const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    return pool[hash(seed, index, 61) % pool.length];
  }
  if (/[a-z]/.test(char)) {
    return CODE_LETTERS[hash(seed, index, 67) % CODE_LETTERS.length];
  }
  if (/\d/.test(char)) return CODE_DIGITS[hash(seed, index, 71) % CODE_DIGITS.length];
  if (/[-!?,.;:'"()\[\]{}=<>/*&|+]/.test(char))
    return CODE_SYMBOLS[hash(seed, index, 79) % CODE_SYMBOLS.length];
  return CODE_LETTERS[hash(seed, index, 83) % CODE_LETTERS.length];
}

// ---------- finance persona ----------
// Heavy digits, percentage signs, currency and separators - looks like a spreadsheet

const FINANCE_DIGITS = "0123456789";
const FINANCE_PUNCT = [",", ".", "%", "$", "-", "+"];

function maskFinance(char: string, seed: number, index: number): string {
  if (/\s/.test(char)) return char;
  // Letters → mostly digits, occasionally a currency symbol
  if (/[a-z]/i.test(char)) {
    const r = hash(seed, index, 89) % 10;
    if (r < 7) return FINANCE_DIGITS[hash(seed, index, 97) % FINANCE_DIGITS.length];
    return FINANCE_PUNCT[hash(seed, index, 101) % FINANCE_PUNCT.length];
  }
  if (/\d/.test(char)) return FINANCE_DIGITS[hash(seed, index, 103) % FINANCE_DIGITS.length];
  if (/[-!?,.;:'"()\[\]{}]/.test(char))
    return FINANCE_PUNCT[hash(seed, index, 107) % FINANCE_PUNCT.length];
  return FINANCE_DIGITS[hash(seed, index, 109) % FINANCE_DIGITS.length];
}

// ---------- dispatcher ----------

function maskChar(char: string, seed: number, index: number, persona: MaskPersona): string {
  switch (persona) {
    case "lorem":   return maskLorem(char, seed, index);
    case "code":    return maskCode(char, seed, index);
    case "finance": return maskFinance(char, seed, index);
    default:        return maskEnglish(char, seed, index);
  }
}

export function buildMaskedText(options: {
  text: string;
  cursorIndex: number;
  radius: number;
  isProtected: boolean;
  sessionSeed: number;
  persona?: MaskPersona;
  revealRange?: { start: number; end: number } | null;
}): string {
  const { text, cursorIndex, radius, isProtected, sessionSeed, persona = "english", revealRange = null } = options;

  if (!text || !isProtected) {
    return text;
  }

  const safeCursorIndex = Math.max(0, Math.min(cursorIndex, text.length));
  const start = Math.max(0, safeCursorIndex - radius);
  const end = Math.min(text.length, safeCursorIndex + radius);
  let masked = "";

  for (let index = 0; index < text.length; index += 1) {
    const inFocusWindow = index >= start && index < end;
    const inRevealRange =
      revealRange !== null && index >= revealRange.start && index < revealRange.end;

    masked += inFocusWindow || inRevealRange
      ? text[index]
      : maskChar(text[index], sessionSeed, index, persona);
  }

  return masked;
}

export function basename(path: string | null): string {
  if (!path) {
    return "Untitled.txt";
  }

  return path.split(/[/\\]/).filter(Boolean).at(-1) ?? path;
}
