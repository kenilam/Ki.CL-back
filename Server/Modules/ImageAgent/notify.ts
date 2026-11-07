import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { notify, text } from 'server/DataSources/MongoDB/Notifications/notify.js';
import { ImageAgentMessageKind, ImageAgentRole, ImageAgentThreadStatus } from 'server/Types/graphql.js';
import type { ImageAgentThreadResult } from './types.js';

const THREADS = ImageAgentThreads.collection.collectionName;

function messageOf({ activity, messages, status }: ImageAgentThreadResult) {
  const last = messages.at(-1);

  if (status !== ImageAgentThreadStatus.Idle) {
    const doing = activity ?? (last?.kind === ImageAgentMessageKind.Progress ? last.text : null);

    return doing ? text('agent_reply', { context: 'running', text: doing }) : text('status', { context: 'running' });
  }

  if (last?.kind === ImageAgentMessageKind.Image) {
    return text('picture_ready');
  }

  return text('agent_reply', {
    context: (last?.kind ?? ImageAgentMessageKind.Text).toLowerCase(),
    text: last?.text ?? '',
  });
}

export async function notifyThread(thread: ImageAgentThreadResult): Promise<void> {
  const label = thread.brief
    ?? thread.messages.find(({ role }) => role === ImageAgentRole.User)?.text
    ?? thread.id;

  await notify(thread.ownerGUID, THREADS, thread.id, {
    title: text('notification_title', { title: label }),
    message: messageOf(thread),
  });
}
