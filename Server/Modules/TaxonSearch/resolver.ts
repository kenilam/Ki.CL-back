import { validate } from 'server/Helpers/Validation/validate.js';
import { TreeOfLifeNodes } from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import { fetchOtolNameMatches } from 'server/Modules/TreeOfLife/otol.js';
import { TaxonSearchSchema } from './validation.js';

/**
 * Escape a user's text so it can go inside a regular expression.
 *
 * The query is typed by a person and goes straight into a `$regex`, so without
 * this a name containing `(` or `+` is either a syntax error or, worse, a
 * pattern that scans far more of the collection than intended.
 */
function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Result = {
  nodeId: string | null;
  ottId: number | null;
  name: string;
  rank: string | null;
  source: 'DATABASE' | 'OPEN_TREE';
};

export default {
  Query: {
    TaxonSearch: async (_: unknown, args: unknown): Promise<Result[]> => {
      const { query, limit } = validate(TaxonSearchSchema, args);

      /*
       * Anchored prefix match, case-insensitive. Anchoring is what lets the
       * index on `name` be used — a leading wildcard would force a collection
       * scan, and this collection grows with every subtree ever fetched.
       */
      const stored = await TreeOfLifeNodes.find({
        name: { $regex: `^${literal(query)}`, $options: 'i' },
      })
        .select({ nodeId: 1, ottId: 1, name: 1, rank: 1 })
        .limit(limit)
        .lean();

      if (stored.length > 0) {
        return stored.map((node) => ({
          nodeId: node.nodeId ?? null,
          ottId: node.ottId ?? null,
          name: node.name ?? '',
          rank: node.rank ?? null,
          source: 'DATABASE' as const,
        }));
      }

      /*
       * Nothing stored, so ask Open Tree's name index. The autocomplete
       * endpoint returns no rank, so that stays null until the subtree is
       * fetched and the real record exists.
       */
      const matches = await fetchOtolNameMatches(query, limit);

      return matches.map((match) => ({
        /*
         * A taxon's synthetic-tree node id is `ott` followed by its ott id —
         * verified against the live API, where `ott563154` resolves to the same
         * Panthera that autocomplete returned as ott id 563154. Deriving it
         * here means a caller never has to know that, and a result from Open
         * Tree navigates exactly like one from the database.
         *
         * Only taxon nodes work this way. Internal `mrca…` nodes have no ott id
         * at all, so they never arrive on this path.
         */
        nodeId: `ott${match.ottId}`,
        ottId: match.ottId,
        name: match.name,
        rank: null,
        source: 'OPEN_TREE' as const,
      }));
    },
  },
};
