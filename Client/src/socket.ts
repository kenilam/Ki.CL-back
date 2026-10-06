import { createClient, MessageType, stringifyMessage, type Client } from 'graphql-ws';

/** How often an idle socket is pinged. */
const PING_MS = 10_000;

/** A pong that takes longer than this means the socket is dead. */
const PONG_TIMEOUT_MS = 4_000;

/** The longest wait between two attempts to reconnect. */
const MAX_RETRY_WAIT_MS = 10_000;

/**
 * The socket the subscriptions run on, kept alive across the page being put
 * away.
 *
 * A phone that switches app drops the socket without telling the page, and
 * holds its timers until the page is back. So the socket is pinged, and one
 * that doesn't answer is closed here, which makes graphql-ws reconnect and
 * subscribe again. Coming back to the page, or back online, checks straight
 * away instead of waiting for the next ping or the rest of a backoff.
 */
export function createSocketClient(url: string): Client {
  let socket: WebSocket | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;

  /** Ends the backoff a reconnect is waiting in. */
  let retryNow: (() => void) | undefined;

  const expectPong = () => {
    clearTimeout(pongTimer);
    pongTimer = setTimeout(() => client.terminate(), PONG_TIMEOUT_MS);
  };

  const client = createClient({
    url,
    // Cookies on same-origin (Vite proxy) are sent on the upgrade request.
    // connectionParams covers cross-origin cases where Cookie is not automatic.
    connectionParams: () => {
      const cookie = typeof document !== 'undefined' ? document.cookie : '';
      return cookie ? { cookie } : {};
    },
    keepAlive: PING_MS,
    // A subscription that gives up shows as a failure the visitor can't act on.
    retryAttempts: Infinity,
    retryWait: (retries) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, Math.min(1000 * 2 ** retries, MAX_RETRY_WAIT_MS));

        retryNow = () => {
          clearTimeout(timer);
          resolve();
        };
      }),
    on: {
      opened: (opened) => {
        socket = opened as WebSocket;
      },
      closed: () => {
        clearTimeout(pongTimer);
        socket = undefined;
      },
      ping: (received) => {
        if (!received) expectPong();
      },
      pong: (received) => {
        if (received) clearTimeout(pongTimer);
      },
    },
  });

  const check = () => {
    retryNow?.();

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(stringifyMessage({ type: MessageType.Ping }));
      expectPong();
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('online', check);

  return client;
}
