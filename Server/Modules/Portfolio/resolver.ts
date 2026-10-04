import { portfoliosOf } from 'server/DataSources/MongoDB/PortfolioAccess/relations.js';
import type { Context } from 'server/Context/index.js';

type MeParent = { UserGUID?: string | null; aud?: string | null };

export default {
  MePayload: {
    /*
     * Only the caller's own pieces: Me has already refused a revoked session,
     * and `context.user` is the signed-in user it resolved.
     */
    Portfolios: async ({ aud }: MeParent, _: unknown, context: Context) => {
      if (aud !== 'user' || !context.user) {
        return [];
      }

      const portfolios = await portfoliosOf(context.user.UserGUID);

      return portfolios.map(({ PortfolioGUID, Path }) => ({ PortfolioGUID, Path }));
    },
  },
};
