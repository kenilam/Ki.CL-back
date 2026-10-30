import { runProviderFailover } from 'server/DataSources/AI/failover.js';
import { ProviderLimitError } from 'server/DataSources/AI/providerLimitError.js';
import { chatGemini, isGeminiTextConfigured, resolveGeminiTextModels } from 'server/DataSources/AI/text/gemini.js';
import { chatGroq, isGroqTextConfigured, resolveGroqTextModel } from 'server/DataSources/AI/text/groq.js';
import { chatOpenAi, isOpenAiTextConfigured } from 'server/DataSources/AI/text/openai.js';
import type { TextChatOptions } from 'server/DataSources/AI/text/types.js';

// Small enough that a chunk finishes inside the failover's 30 second limit for text.
const CHUNK_CHARACTERS = 3000;

const PLURAL = /_(zero|one|two|few|many|other)$/;
// How a language is written where its name alone doesn't say.
const WRITTEN_AS: Partial<Record<string, string>> = {
  'zh-Hant': 'Write it in standard written Chinese (書面語) as it is used in Hong Kong, in Traditional characters, with Hong Kong vocabulary and punctuation. Do not write colloquial Cantonese: no spoken forms such as 嘅, 咗, 喺, 唔, 冇, 啲, 嘢, 佢, 哋, 嚟 or 咁.',
};

const TOKEN = /\{\{\s*\w+\s*\}\}|\$t\([^)]*\)|\{\w+\}|`[^`]*`|\]\([^)]*\)|\*\*|<\/?[\w-]+\s*\/?>/g;

function system(acceptLanguage: string, namespace: string): string {
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
    WRITTEN_AS[acceptLanguage] ?? '',
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

async function ask(acceptLanguage: string, namespace: string, strings: Record<string, string>): Promise<Record<string, unknown>> {
  const options: TextChatOptions = {
    system: system(acceptLanguage, namespace),
    user: JSON.stringify(strings, null, 2),
    maxTokens: 8192,
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
          return chatOpenAi(options);
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
    'description',
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
): Promise<{ translated: Map<string, string>; failed: string[]; limited: boolean }> {
  const translated = new Map<string, string>();
  let limited = false;

  for (const part of chunk(strings)) {
    let pending = part;

    for (let attempt = 0; attempt < 2 && Object.keys(pending).length > 0; attempt += 1) {
      let answer: Record<string, unknown> = {};

      try {
        answer = await ask(acceptLanguage, namespace, pending);
      } catch (error) {
        if (error instanceof ProviderLimitError) {
          limited = true;
          break;
        }

        console.warn(`${acceptLanguage}/${namespace}: ${error instanceof Error ? error.message : String(error)}`);
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
