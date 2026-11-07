import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { TreeOfLifeNodes } from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import { TaxonVisualStatus } from 'server/Types/graphql.js';
import { Notifications, type INotification } from 'server/DataSources/MongoDB/Notifications/Model.js';
import { notify, text } from 'server/DataSources/MongoDB/Notifications/notify.js';

const PLATES = TreeOfLifeNodes.collection.collectionName;
const PASSWORD_CHANGES = PasswordChanges.collection.collectionName;

const DRAWING = { 'message.key': 'plate', 'message.values.context': 'drawing' };
const WAITING = { 'message.key': 'password_change', 'message.values.context': 'waiting' };

export async function waitForPlate(ownerGUID: string, nodeId: string, name: string): Promise<void> {
  await notify(ownerGUID, PLATES, nodeId, {
    title: text('notification_title', { title: name }),
    message: text('plate', { context: 'drawing' }),
  });
}

function plateMessage(status: TaxonVisualStatus) {
  return text('plate', { context: status === TaxonVisualStatus.Ready ? 'ready' : 'failed' });
}

async function settle(waiting: INotification[], message: INotification['message']): Promise<void> {
  await Promise.all(
    waiting.map(({ collection, documentId, ownerGUID, title }) => {
      return notify(ownerGUID, collection, documentId, { message, title });
    }),
  );
}

export async function settlePlate(nodeId: string, status: TaxonVisualStatus): Promise<void> {
  const waiting = await Notifications.find({ collection: PLATES, documentId: nodeId, ...DRAWING }).lean<INotification[]>();

  await settle(waiting, plateMessage(status));
}

async function settlePlates(ownerGUID: string): Promise<void> {
  const waiting = await Notifications.find({ ownerGUID, collection: PLATES, ...DRAWING }).lean<INotification[]>();
  const nodes = await TreeOfLifeNodes.find({ nodeId: { $in: waiting.map(({ documentId }) => documentId) } })
    .select('nodeId visualStatus')
    .lean();

  await Promise.all(
    nodes
      .filter(({ visualStatus }) => visualStatus && visualStatus !== TaxonVisualStatus.Pending)
      .map(({ nodeId, visualStatus }) => {
        return settle(
          waiting.filter(({ documentId }) => documentId === nodeId),
          plateMessage(visualStatus as TaxonVisualStatus),
        );
      }),
  );
}

async function expirePasswordChanges(ownerGUID: string): Promise<void> {
  const waiting = await Notifications.find({ ownerGUID, collection: PASSWORD_CHANGES, ...WAITING }).lean<INotification[]>();
  const open = await PasswordChanges.find({
    passwordChangeGUID: { $in: waiting.map(({ documentId }) => documentId) },
    expiresAt: { $gt: new Date() },
  })
    .select('passwordChangeGUID')
    .lean();
  const ids = new Set(open.map(({ passwordChangeGUID }) => passwordChangeGUID));

  await settle(
    waiting.filter(({ documentId }) => !ids.has(documentId)),
    text('password_change', { context: 'expired' }),
  );
}

export async function settleFor(ownerGUID: string): Promise<void> {
  await Promise.all([settlePlates(ownerGUID), expirePasswordChanges(ownerGUID)]);
}
