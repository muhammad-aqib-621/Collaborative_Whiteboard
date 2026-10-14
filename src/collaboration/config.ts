import {
  broadcastChannelProvider,
  indexedDbProvider,
  websocketProvider,
  type ProviderFactory,
} from './providers'

/**
 * Resolves the sync server URL. A `?ws=` query parameter wins over the
 * `VITE_COLLAB_WS_URL` build-time variable, which makes it easy to point a
 * deployed build at a different server for testing.
 */
export function getCollabServerUrl(): string | null {
  let candidate = ''
  try {
    candidate = new URLSearchParams(window.location.search).get('ws') ?? ''
  } catch {
    candidate = ''
  }
  if (!candidate) candidate = (import.meta.env.VITE_COLLAB_WS_URL ?? '').trim()
  if (!candidate) return null
  return /^wss?:\/\//i.test(candidate) ? candidate.replace(/\/+$/, '') : null
}

/** The default provider stack: local persistence, cross-tab sync and (optionally) a server. */
export function getDefaultProviders(): ProviderFactory[] {
  const providers: ProviderFactory[] = [indexedDbProvider, broadcastChannelProvider]
  const serverUrl = getCollabServerUrl()
  if (serverUrl) providers.push(websocketProvider(serverUrl))
  return providers
}
