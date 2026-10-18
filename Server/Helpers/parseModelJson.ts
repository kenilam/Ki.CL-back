/**
 * The JSON object in a model's reply. Models wrap it in a ```json fence or
 * add a sentence around it, so this reads from the first `{` to the last `}`.
 * Null when there is no object or it does not parse.
 */
export function parseModelJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
