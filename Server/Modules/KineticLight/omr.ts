import * as v from 'valibot';

const DEFAULT_URL = 'http://localhost:3400';
const TIMEOUT_MS = 180_000;
const IDENTITY_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';

const SheetSchema = v.object({
  lines: v.array(v.pipe(v.number(), v.integer(), v.minValue(1))),
  musicxml: v.pipe(v.string(), v.minLength(1)),
  notes: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export type Sheet = v.InferOutput<typeof SheetSchema>;

function omrUrl(): string {
  return process.env.KINETIC_LIGHT_OMR_URL?.trim() || DEFAULT_URL;
}

async function authorization(url: string): Promise<Record<string, string>> {
  if (!url.startsWith('https://')) {
    return {};
  }

  const response = await fetch(`${IDENTITY_URL}?audience=${encodeURIComponent(url)}`, {
    headers: { 'Metadata-Flavor': 'Google' },
  });

  if (!response.ok) {
    throw new Error(`No ID token for the sheet reader: ${response.status}`);
  }

  return { Authorization: `Bearer ${await response.text()}` };
}

export async function readNotes(bytes: Buffer, mime: string): Promise<Sheet | null> {
  const url = omrUrl();
  const response = await fetch(`${url}/read`, {
    method: 'POST',
    headers: { 'Content-Type': mime, ...(await authorization(url)) },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.status === 422) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`The sheet reader answered ${response.status}`);
  }

  return v.parse(SheetSchema, await response.json());
}
