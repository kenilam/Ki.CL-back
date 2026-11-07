import type { Context } from 'server/Context/index.js';

import { exchangeToken } from './exchange.js';

export default {
  Mutation: {
    exchangeToken: (_: unknown, __: unknown, context: Context) => exchangeToken(context),
  },
};
