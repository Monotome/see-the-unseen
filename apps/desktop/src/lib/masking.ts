export type WindowSize = "tight" | "medium" | "wide";

export const WINDOW_RADII: Record<WindowSize, number> = {
  tight: 10,
  medium: 20,
  wide: 35,
};

const LETTER_WEIGHTS = [
  ["e", 12.02],
  ["t", 9.1],
  ["a", 8.12],
  ["o", 7.68],
  ["i", 7.31],
  ["n", 6.95],
  ["s", 6.28],
  ["r", 6.02],
  ["h", 5.92],
  ["d", 4.32],
  ["l", 3.98],
  ["u", 2.88],
  ["c", 2.71],
  ["m", 2.61],
  ["f", 2.3],
  ["y", 2.11],
  ["w", 2.09],
  ["g", 2.03],
  ["p", 1.82],
  ["b", 1.49],
  ["v", 1.11],
  ["k", 0.69],
  ["x", 0.17],
  ["q", 0.11],
  ["j", 0.1],
  ["z", 0.07],
] as const;

const PUNCTUATION = [".", ",", ";", ":", "!", "?", "-", "'", "\"", "(", ")"];
const DIGITS = "0123456789";
const LETTER_TOTAL = LETTER_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);

function hash(seed: number, index: number, salt: number): number {
  let value = seed ^ Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function pickWeightedLetter(seed: number, index: number): string {
  const target = (hash(seed, index, 17) / 0xffffffff) * LETTER_TOTAL;
  let cumulative = 0;

  for (const [letter, weight] of LETTER_WEIGHTS) {
    cumulative += weight;
    if (target <= cumulative) {
      return letter;
    }
  }

  return "e";
}

function maskChar(char: string, seed: number, index: number): string {
  if (/\s/.test(char)) {
    return char;
  }

  if (/[a-z]/i.test(char)) {
    const letter = pickWeightedLetter(seed, index);
    return char === char.toUpperCase() ? letter.toUpperCase() : letter;
  }

  if (/\d/.test(char)) {
    return DIGITS[hash(seed, index, 29) % DIGITS.length];
  }

  if (/[-!?,.;:'"()\[\]{}]/.test(char)) {
    return PUNCTUATION[hash(seed, index, 43) % PUNCTUATION.length];
  }

  return pickWeightedLetter(seed, index);
}

export function buildMaskedText(options: {
  text: string;
  cursorIndex: number;
  radius: number;
  isProtected: boolean;
  sessionSeed: number;
  revealRange?: { start: number; end: number } | null;
}): string {
  const { text, cursorIndex, radius, isProtected, sessionSeed, revealRange = null } = options;

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

    masked += inFocusWindow || inRevealRange ? text[index] : maskChar(text[index], sessionSeed, index);
  }

  return masked;
}

export function basename(path: string | null): string {
  if (!path) {
    return "Untitled.txt";
  }

  return path.split(/[/\\]/).filter(Boolean).at(-1) ?? path;
}