export function toWsUri(httpUri: string): string {
  if (httpUri.startsWith('https://')) return `wss://${httpUri.slice('https://'.length)}`;
  if (httpUri.startsWith('http://')) return `ws://${httpUri.slice('http://'.length)}`;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = httpUri.startsWith('/') ? httpUri : `/${httpUri}`;
    return `${protocol}//${window.location.host}${path}`;
  }
  return httpUri.replace(/^http/, 'ws');
}
