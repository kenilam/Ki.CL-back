import { notify, text } from 'server/DataSources/MongoDB/Notifications/notify.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';

const CHANGES = PasswordChanges.collection.collectionName;

export async function notifyChange(userGUID: string, id: string, context: 'done' | 'failed' | 'waiting'): Promise<void> {
  await notify(userGUID, CHANGES, id, {
    title: text('change_password'),
    message: text('password_change', { context }),
  });
}
