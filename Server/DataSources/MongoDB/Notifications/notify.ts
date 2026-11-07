import { PubSub } from 'graphql-subscriptions';

import { KEEP_MS, Notifications, type INotification, type NotificationText } from './Model.js';

export type NotificationResult = ReturnType<typeof toResult>;

export function toResult(notification: INotification) {
  return {
    id: String(notification._id),
    ownerGUID: notification.ownerGUID,
    collection: notification.collection,
    documentId: notification.documentId,
    title: notification.title,
    message: notification.message,
    dismissedAt: notification.dismissedAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export const notificationPubSub = new PubSub<{
  NOTIFICATION_UPDATED: { notificationUpdated: NotificationResult };
}>();

export const NOTIFICATION_UPDATED = 'NOTIFICATION_UPDATED' as const;

export function publish(notification: INotification): void {
  void notificationPubSub.publish(NOTIFICATION_UPDATED, { notificationUpdated: toResult(notification) });
}

export function text(key: string, values: NotificationText['values'] = {}): NotificationText {
  return { key, values };
}

export async function notify(
  ownerGUID: string,
  collection: string,
  documentId: string,
  { message, title }: Pick<INotification, 'message' | 'title'>,
): Promise<void> {
  try {
    const notification = await Notifications.findOneAndUpdate(
      { ownerGUID, collection, documentId },
      { $set: { title, message, dismissedAt: null, expiresAt: new Date(Date.now() + KEEP_MS) } },
      { new: true, upsert: true },
    ).lean<INotification>();

    publish(notification);
  } catch (error) {
    console.error(`[Notifications] ${collection} ${documentId} was not written:`, error);
  }
}
