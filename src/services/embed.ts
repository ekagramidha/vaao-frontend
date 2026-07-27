import { readonly, ref } from 'vue';

/**
 * Resolves which HighLevel sub-account the widget is acting on.
 *
 * Three sources, in priority order:
 *
 *  1. The `locationId` query parameter on the iframe URL. This is the primary
 *     path — the Custom JS loader reads the id out of the HighLevel page and
 *     puts it there, which means it is available synchronously on first paint
 *     and no request has to wait for a handshake.
 *  2. A `postMessage` from the parent frame. Covers the case where HighLevel
 *     switches sub-account without reloading our iframe, and lets the loader
 *     correct an id it worked out late.
 *  3. `VITE_DEFAULT_LOCATION_ID`, so the app is usable standalone at
 *     localhost:5173 during development.
 *
 * Nothing here is trusted for authorisation. The backend holds the credentials
 * and decides what a location may read; this only says which one to ask about.
 */

/** Messages exchanged with the Custom JS loader. */
export const EMBED_MESSAGE = {
  /** Loader → widget: here is the current context. */
  context: 'ghl-optimizer:context',
  /** Widget → loader: I am mounted, send me the context. */
  ready: 'ghl-optimizer:ready',
  /** Widget → loader: my content is this tall, resize the iframe. */
  resize: 'ghl-optimizer:resize',
} as const;

interface EmbedContextMessage {
  type: typeof EMBED_MESSAGE.context;
  locationId?: string;
  companyId?: string;
  userName?: string;
}

function readFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('locationId');
}

const locationIdRef = ref<string>(
  readFromUrl() ?? import.meta.env.VITE_DEFAULT_LOCATION_ID ?? '',
);
const embeddedRef = ref<boolean>(window.self !== window.top);
const companyIdRef = ref<string | null>(null);

export const locationId = readonly(locationIdRef);
export const isEmbedded = readonly(embeddedRef);
export const companyId = readonly(companyIdRef);

/** Read directly by the API client, which is not a Vue component. */
export function currentLocationId(): string {
  return locationIdRef.value;
}

export function setLocationId(value: string): void {
  if (value && value !== locationIdRef.value) locationIdRef.value = value;
}

/**
 * Starts the handshake with the parent frame.
 *
 * Called once from `main.ts`. The origin of incoming messages is not
 * restricted to a single host because an agency can serve HighLevel from a
 * white-label domain, and the payload is only a sub-account id — never a
 * credential — so a spoofed message can at worst point the widget at a
 * location the backend will refuse to serve.
 */
export function initEmbedBridge(): void {
  if (!embeddedRef.value) return;

  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data as EmbedContextMessage | null;
    if (!data || typeof data !== 'object' || data.type !== EMBED_MESSAGE.context) return;

    if (data.locationId) setLocationId(data.locationId);
    if (data.companyId) companyIdRef.value = data.companyId;
  });

  window.parent.postMessage({ type: EMBED_MESSAGE.ready }, '*');
}

/**
 * Tells the parent how tall our content is, so the loader can size the iframe
 * to fit instead of leaving a scrollbar inside a scrollbar.
 */
export function reportHeight(height: number): void {
  if (!embeddedRef.value) return;
  window.parent.postMessage({ type: EMBED_MESSAGE.resize, height }, '*');
}
