import type { Context } from 'server/Context/index.js';

import { exchangeToken } from './exchange.js';

export default {
  Mutation: {
    ExchangeToken: (_: unknown, __: unknown, context: Context) => exchangeToken(context),
  },
};
