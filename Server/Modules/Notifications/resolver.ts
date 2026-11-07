import { withFilter } from 'graphql-subscriptions';
import { Types } from 'mongoose';

import type { Context } from 'server/Context/index.js';
import { Notifications, type INotification } from 'server/DataSources/MongoDB/Notifications/Model.js';
import {
  NOTIFICATION_UPDATED,
  notificationPubSub,
  publish,
  toResult,
  type NotificationResult,
} from 'server/DataSources/MongoDB/Notifications/notify.js';
import { settleFor } from 'server/DataSources/MongoDB/Notifications/settle.js';
import { Unauthenticated } from 'server/Errors/index.js';

function requireOwner(context?: Context): string {
  const owner = context?.tokenPayload?.userGUID;

  if (!owner) {
    throw Unauthenticated();
  }

  return owner;
}

export default {
  Query: {
    notifications: async (_: unknown, __: unknown, context: Context) => {
      const owner = requireOwner(context);

      await settleFor(owner);

      const notifications = await Notifications.find({ ownerGUID: owner, dismissedAt: null })
        .sort({ updatedAt: -1 })
        .lean<INotification[]>();

      return notifications.map(toResult);
    },
  },
  Mutation: {
    notificationsDismiss: async (_: unknown, args: { ids: string[] }, context: Context) => {
      const owner = requireOwner(context);
      const ids = args.ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
      const notifications = await Notifications.find({ _id: { $in: ids }, ownerGUID: owner, dismissedAt: null })
        .lean<INotification[]>();
      const dismissedAt = new Date();

      await Notifications.updateMany({ _id: { $in: notifications.map(({ _id }) => _id) } }, { dismissedAt });

      notifications.forEach((notification) => publish({ ...notification, dismissedAt }));

      return notifications.map(({ _id }) => String(_id));
    },
  },
  Subscription: {
    notificationUpdated: {
      subscribe: withFilter(
        (_parent, _args, context?: Context) => {
          requireOwner(context);

          return notificationPubSub.asyncIterableIterator(NOTIFICATION_UPDATED);
        },
        (payload: { notificationUpdated?: NotificationResult } | undefined, _variables: unknown, context?: Context) => {
          return payload?.notificationUpdated?.ownerGUID === context?.tokenPayload?.userGUID;
        },
      ),
    },
  },
};
