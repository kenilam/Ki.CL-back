import { runProviderFailover } from 'server/DataSources/AI/failover.js';
import { ProviderLimitError } from 'server/DataSources/AI/providerLimitError.js';
import { chatGemini, isGeminiTextConfigured, resolveGeminiTextModels } from 'server/DataSources/AI/text/gemini.js';
import { chatGroq, isGroqTextConfigured, resolveGroqTextModel } from 'server/DataSources/AI/text/groq.js';
import { chatOpenAi, isOpenAiTextConfigured } from 'server/DataSources/AI/text/openai.js';
import type { TextChatOptions } from 'server/DataSources/AI/text/types.js';

// Large enough for a whole namespace in one request, since free tiers count requests. `design-docs`, the largest, is about 100,000.
const CHUNK_CHARACTERS = 120_000;
// gpt-4o-mini's most. Gemini and Groq allow 65,536, and Groq adds its reasoning headroom to what it's asked for.
const OPENAI_MAX_TOKENS = 16_384;

const RATE_LIMIT_WAIT_MS = 60_000;
const RATE_LIMIT_WAITS = 3;

const PLURAL = /_(zero|one|two|few|many|other)$/;
const TOKEN = /\{\{\s*\w+\s*\}\}|\$t\([^)]*\)|\{\w+\}|`[^`]*`|\]\([^)]*\)|\*\*|<\/?[\w-]+\s*\/?>/g;

function system(acceptLanguage: string, namespace: string, prompt = ''): string {
  const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(acceptLanguage);

  return [
    `You translate the interface text of the website ki-cl.com from English into ${name} (${acceptLanguage}).`,
    `You get a JSON object of the "${namespace}" namespace: field names and their English strings. A field's name says where the string appears, for example action_ is a button, label_ a form label and error_ an error message.`,
    'Answer with one JSON object with exactly the same field names and the translated strings, and nothing else.',
    'Keep the tone plain and direct, and about as short as the English.',
    'Copy these exactly as they are and translate only the words around them: {{name}} placeholders, $t(key) references, {name} markers, `code` in backticks, the (url) of a [link](url), ** for bold, and <tags>.',
    `A field ending in _zero, _one, _two, _few, _many or _other is one plural form of a string, picked by {{count}}. Write the form for that CLDR plural category in ${name}. Its English is the nearest English form.`,
    'Leave names of products, people and code as they are, for example Ki.CL, GitHub and React.',
    `Use ${name} punctuation.`,
    prompt,
  ]
    .filter((line) => {
      return line !== '';
    })
    .join('\n');
}

function tokens(text: string, plural: boolean): string {
  return (text.match(TOKEN) ?? [])
    .map((token) => {
      return token.replace(/\s+/g, '');
    })
    .filter((token) => {
      return !(plural && token === '{{count}}');
    })
    .sort()
    .join(' ');
}

function parse(reply: string): Record<string, unknown> {
  const json = reply.replace(/^```(?:json)?\s*|\s*```$/g, '');
  const parsed: unknown = JSON.parse(json);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The model did not answer with a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

async function ask(
  acceptLanguage: string,
  namespace: string,
  strings: Record<string, string>,
  prompt?: string,
): Promise<Record<string, unknown>> {
  const options: TextChatOptions = {
    system: system(acceptLanguage, namespace, prompt),
    user: JSON.stringify(strings, null, 2),
    maxTokens: 60_000,
    temperature: 0.2,
  };

  const reply = await runProviderFailover(
    [
      ...resolveGeminiTextModels().map((model) => {
        return {
          name: `gemini:${model}`,
          isConfigured: isGeminiTextConfigured,
          run: () => {
            return chatGemini({ ...options, model });
          },
        };
      }),
      {
        name: 'openai:gpt-4o-mini',
        isConfigured: isOpenAiTextConfigured,
        run: () => {
          return chatOpenAi({ ...options, maxTokens: OPENAI_MAX_TOKENS });
        },
      },
      {
        name: `groq:${resolveGroqTextModel()}`,
        isConfigured: isGroqTextConfigured,
        run: () => {
          return chatGroq(options);
        },
      },
    ],
    'translation',
  );

  return parse(reply);
}

function check(strings: Record<string, string>, answer: Record<string, unknown>): Map<string, string> {
  const valid = new Map<string, string>();

  for (const [field, english] of Object.entries(strings)) {
    const translated = answer[field];

    if (typeof translated !== 'string' || translated.trim() === '') {
      continue;
    }

    const plural = PLURAL.test(field);

    if (tokens(translated, plural) === tokens(english, plural)) {
      valid.set(field, translated);
    }
  }

  return valid;
}

function chunk(strings: Map<string, string>): Record<string, string>[] {
  const chunks: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let size = 0;

  for (const [field, english] of strings) {
    if (size > 0 && size + english.length > CHUNK_CHARACTERS) {
      chunks.push(current);
      current = {};
      size = 0;
    }

    current[field] = english;
    size += english.length;
  }

  if (size > 0) {
    chunks.push(current);
  }

  return chunks;
}

export async function translateWithModel(
  acceptLanguage: string,
  namespace: string,
  strings: Map<string, string>,
  prompt?: string,
): Promise<{ translated: Map<string, string>; failed: string[]; limited: boolean }> {
  const translated = new Map<string, string>();
  let limited = false;

  const parts = chunk(strings);

  for (const part of parts) {
    let pending = part;
    let waits = 0;

    for (let attempt = 0; attempt < 2 && Object.keys(pending).length > 0; attempt += 1) {
      let answer: Record<string, unknown> = {};

      try {
        answer = await ask(acceptLanguage, namespace, pending, prompt);
      } catch (error) {
        if (error instanceof ProviderLimitError) {
          if (error.retryable && waits < RATE_LIMIT_WAITS) {
            waits += 1;
            attempt -= 1;
            console.log(`${acceptLanguage}/${namespace}: waiting a minute for the rate limit.`);
            await new Promise((resolve) => {
              setTimeout(resolve, RATE_LIMIT_WAIT_MS);
            });
            continue;
          }

          limited = true;
          break;
        }

        console.warn(`${acceptLanguage}/${namespace}: ${error instanceof Error ? error.message : String(error)}`);

        // A reply cut off at the model's output limit isn't valid JSON, so this part goes again in two halves.
        const fields = Object.entries(pending);

        if (error instanceof SyntaxError && fields.length > 1) {
          const middle = Math.ceil(fields.length / 2);

          parts.push(Object.fromEntries(fields.slice(0, middle)), Object.fromEntries(fields.slice(middle)));
          pending = {};
        }
      }

      const valid = check(pending, answer);

      for (const [field, value] of valid) {
        translated.set(field, value);
      }

      pending = Object.fromEntries(
        Object.entries(pending).filter(([field]) => {
          return !valid.has(field);
        }),
      );
    }

    if (limited) {
      break;
    }
  }

  const failed = [...strings.keys()].filter((field) => {
    return !translated.has(field);
  });

  return { translated, failed, limited };
}
