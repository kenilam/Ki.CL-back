/**
 * The languages the site is translated into, one row of `locales` each.
 *
 * Run (MONGODB_DATABASE picks test or production, as for the server):
 *   npx tsx Server/Scripts/locales.ts list
 *   npx tsx Server/Scripts/locales.ts seed
 *   npx tsx Server/Scripts/locales.ts add it-CH "An optional note for the translation prompt."
 *   npx tsx Server/Scripts/locales.ts remove it-CH
 *
 * `seed` writes the languages the site had before they moved to the database,
 * and leaves any other row alone. `add` makes a language part of the next
 * translate run; it shows in the switcher once every string is translated.
 * `remove` deletes the locale and its strings.
 */
import 'dotenv/config';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { isCanonical, Locales, SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { Translations } from 'server/DataSources/MongoDB/Translations/Model.js';

const USAGE = 'Usage: locales.ts list | seed | add <tag> [prompt] | remove <tag>';

const SEED: { tag: string; prompt?: string }[] = [
  { tag: SOURCE },
  { tag: 'en-GB' },
  { tag: 'zh-Hans' },
  {
    tag: 'zh-Hant',
    prompt: 'Write it in standard written Chinese (書面語) as it is used in Hong Kong, in Traditional characters, with Hong Kong vocabulary and punctuation. Do not write colloquial Cantonese: no spoken forms such as 嘅, 咗, 喺, 唔, 冇, 啲, 嘢, 佢, 哋, 嚟 or 咁.',
  },
  { tag: 'es' },
  { tag: 'es-MX' },
  { tag: 'ar' },
  { tag: 'pt-BR' },
  { tag: 'pt-PT' },
  { tag: 'fr' },
  { tag: 'fr-CA' },
  { tag: 'de' },
  { tag: 'de-CH' },
  { tag: 'ja' },
  { tag: 'ko' },
  { tag: 'ru' },
  { tag: 'hi' },
  { tag: 'id' },
  { tag: 'tr' },
  { tag: 'it' },
  { tag: 'vi' },
];

function canonical(tag: string | undefined): string {
  if (!tag || !isCanonical(tag)) {
    throw new Error(`${tag ?? 'A tag'} is not a canonical BCP 47 language tag, such as en-US, zh-Hant or es.`);
  }

  return tag;
}

async function run(): Promise<void> {
  const [command = '', target, ...rest] = process.argv.slice(2);

  if (!['list', 'seed', 'add', 'remove'].includes(command)) {
    throw new Error(USAGE);
  }

  // Checked before connecting, so a bad tag fails without touching the database.
  const tag = command === 'add' || command === 'remove' ? canonical(target) : '';
  const prompt = rest.join(' ').trim();

  if (command === 'remove' && tag === SOURCE) {
    throw new Error(`${SOURCE} is the language every string is written in, so it stays.`);
  }

  await connectDatabase();
  const database = mongoose.connection.name;

  if (command === 'list') {
    const locales = await Locales.find({}, 'tag prompt').sort({ tag: 1 }).lean();

    for (const locale of locales) {
      console.log(locale.prompt ? `${locale.tag}  (prompt) ${locale.prompt}` : locale.tag);
    }
  }

  if (command === 'seed') {
    const { upsertedCount } = await Locales.bulkWrite(
      SEED.map((locale) => {
        return {
          updateOne: {
            filter: { tag: locale.tag },
            update: { $setOnInsert: locale },
            upsert: true,
          },
        };
      }),
    );

    console.log(`${upsertedCount} locale(s) added, ${SEED.length - upsertedCount} already there.`);
  }

  if (command === 'add') {
    await Locales.create(prompt ? { tag, prompt } : { tag });
    console.log(`Added ${tag}. The next translate run fills it in.`);
  }

  if (command === 'remove') {
    const { deletedCount } = await Locales.deleteOne({ tag });
    const strings = await Translations.deleteMany({ 'accept-language': tag });

    console.log(deletedCount ? `Removed ${tag} and its ${strings.deletedCount} string(s).` : `${tag} was not a locale.`);
  }

  console.log(`Done (${database}).`);
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
