import type { Context } from 'server/Context/index.js';

export default {
  Query: {
    Asset: async (
      _: unknown,
      args: { id: string },
      context: Context,
    ) => {
      const id = args.id?.trim();
      if (!id) {
        return null;
      }
      return context.loaders.asset.byId.load(id);
    },
  },

  Asset: {
    id: (parent: { _id?: { toString(): string }; id?: string }) => (
      parent.id ?? (parent._id ? String(parent._id) : '')
    ),
  },
};
