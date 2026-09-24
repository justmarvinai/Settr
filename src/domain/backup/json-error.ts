/**
 * Where a JSON text stops being valid, as line and column (1-based), for the import's error message
 * (IMPORT_EXPORT.md §4 step 2). Browsers word JSON.parse errors differently and WebKit gives no
 * position at all, so this scans the text itself. Only called after JSON.parse has failed.
 */

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
const HEX4 = /^[\dA-Fa-f]{4}$/;
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

/** Index of the first character that makes `text` invalid JSON, or -1 when it's valid. */
export function jsonErrorIndex(text: string): number {
  const n = text.length;
  let i = 0;
  // Open containers; iterative, so a deeply nested file can't overflow the stack.
  const stack: ('{' | '[')[] = [];

  const skipWhitespace = () => {
    while (i < n && WHITESPACE.has(text.charAt(i))) i++;
  };

  /** At an opening quote; true when the string closes. On false, `i` points at the problem. */
  const scanString = (): boolean => {
    i++;
    while (i < n) {
      const c = text.charAt(i);
      if (c === '"') {
        i++;
        return true;
      }
      if (c === '\\') {
        const escaped = text.charAt(i + 1);
        if (escaped === 'u') {
          if (!HEX4.test(text.slice(i + 2, i + 6))) return false;
          i += 6;
        } else if (ESCAPES.has(escaped)) {
          i += 2;
        } else {
          return false;
        }
        continue;
      }
      if (c.charCodeAt(0) < 0x20) return false;
      i++;
    }
    return false;
  };

  const scanDigits = (): boolean => {
    if (!isDigit(text[i])) return false;
    while (isDigit(text[i])) i++;
    return true;
  };

  const scanNumber = (): boolean => {
    if (text[i] === '-') i++;
    if (text[i] === '0') i++;
    else if (!scanDigits()) return false;
    if (text[i] === '.') {
      i++;
      if (!scanDigits()) return false;
    }
    if (text[i] === 'e' || text[i] === 'E') {
      i++;
      if (text[i] === '+' || text[i] === '-') i++;
      if (!scanDigits()) return false;
    }
    return true;
  };

  let state: 'value' | 'key' | 'after' = 'value';
  for (;;) {
    skipWhitespace();
    const c = text[i];
    if (state === 'value') {
      if (c === '{' || c === '[') {
        i++;
        skipWhitespace();
        if (text[i] === (c === '{' ? '}' : ']')) {
          i++;
          state = 'after';
        } else {
          stack.push(c);
          state = c === '{' ? 'key' : 'value';
        }
      } else if (c === '"') {
        if (!scanString()) return i;
        state = 'after';
      } else if (c === '-' || isDigit(c)) {
        if (!scanNumber()) return i;
        state = 'after';
      } else {
        const literal = ['true', 'false', 'null'].find((word) => text.startsWith(word, i));
        if (!literal) return i;
        i += literal.length;
        state = 'after';
      }
    } else if (state === 'key') {
      if (c !== '"' || !scanString()) return i;
      skipWhitespace();
      if (text[i] !== ':') return i;
      i++;
      state = 'value';
    } else {
      const open = stack.at(-1);
      if (!open) return i === n ? -1 : i;
      if (c === ',') {
        i++;
        state = open === '{' ? 'key' : 'value';
      } else if (c === (open === '{' ? '}' : ']')) {
        i++;
        stack.pop();
      } else {
        return i;
      }
    }
  }
}

/** 1-based line and column of an index (the end of the text counts as a position too). */
export function lineColumnAt(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: index - lineStart + 1 };
}
