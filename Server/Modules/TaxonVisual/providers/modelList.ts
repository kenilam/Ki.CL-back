/** A comma-separated list of model names from the environment, trimmed and without repeats. */
export function parseModelList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return [...new Set(
    raw.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}
