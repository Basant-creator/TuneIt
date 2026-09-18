/**
 * Combining-mark range used to strip diacritics after NFD normalization.
 *
 * Kept in its own module and built with `String.fromCharCode` so the pattern
 * survives any tooling that would otherwise rewrite the escape sequence into
 * literal combining characters — which renders as mojibake and is impossible to
 * review.
 */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
);

/** "Café Déjà" -> "Cafe Deja". */
export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '');
}
