/**
 * Parses a JSON string if it is provided.
 *
 * Returns `null` when the input is `null`, `undefined` or an empty string.
 * Otherwise it parses the string using `JSON.parse` and returns the parsed value.
 *
 * @throws SyntaxError when the input is not valid JSON.
 */
export function parseJsonIfPresent<T = unknown>(json: string | null | undefined): T | null {
  if (json == null || json.trim() === '') {
    return null;
  }

  return JSON.parse(json) as T;
}
