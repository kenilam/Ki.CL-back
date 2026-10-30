import { readFileSync, writeFileSync } from 'node:fs';
import appRoot from 'app-root-path';

const SOURCE = 'Server/DataSources/MongoDB/Translations/acceptLanguage.ts';
const TARGET = 'Client/src/generated/acceptLanguage.ts';

writeFileSync(
  appRoot.resolve(TARGET),
  `// Copied from ${SOURCE} by Codegen/generateAcceptLanguage.ts.\n${readFileSync(appRoot.resolve(SOURCE), 'utf8')}`,
);

console.log(`Copied ${SOURCE} to ${TARGET}`);
