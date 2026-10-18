import { portfoliosOf } from 'server/DataSources/MongoDB/PortfolioAccess/relations.js';
import type { Context } from 'server/Context/index.js';
import type { MePayload } from 'server/Types/graphql.js';

export default {
  MePayload: {
    /*
     * Only the caller's own pieces: Me has already refused a revoked session,
     * and `context.user` is the signed-in user it resolved.
     */
    Portfolios: async ({ aud }: Pick<MePayload, 'aud'>, _: unknown, context: Context) => {
      if (aud !== 'user' || !context.user) {
        return [];
      }

      const portfolios = await portfoliosOf(context.user.UserGUID);

      return portfolios.map(({ PortfolioGUID, Path }) => ({ PortfolioGUID, Path }));
    },
  },
};
