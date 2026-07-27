import { computed, readonly, ref } from 'vue';

/**
 * Resolves which HighLevel sub-account the widget is acting on.
 *
 * The widget is installed as a **Custom Menu Link** in HighLevel's sidebar,
 * pointing at this app with the sub-account id substituted into the URL by a
 * merge field:
 *
 *     https://your-optimizer.example.com/?locationId={{ location.id }}
 *
 * HighLevel resolves that server-side, so the id is on the query string before
 * the iframe loads and is available synchronously on first paint. A frame
 * cannot read its parent's URL — that is a cross-origin `SecurityError`, and
 * `document.referrer` arrives origin-only under the default referrer policy, so
 * the path holding the id is stripped. The merge field is what makes this work
 * without injecting a script into HighLevel's page.
 *
 * Sources, in priority order:
 *
 *  1. The `locationId` query parameter.
 *  2. A `postMessage` from the parent frame. Unused by the menu-link install —
 *     switching sub-account navigates, which reloads the iframe with a fresh
 *     merge value. Kept because a phase-2 Marketplace Custom Page passes its
 *     session context this way, and this is the seam it arrives through.
 *
 * There is deliberately no third source. A build-time default would be a
 * convenience in development and a hazard in production: a merge field that is
 * missing, mistyped, or renamed by a HighLevel update would stop being an
 * error and start silently serving whichever sub-account was compiled in.
 * Someone would be looking at another customer's agents with nothing on screen
 * saying so. Standalone development supplies the same query parameter the
 * embed does, so there is one code path rather than two that can diverge.
 *
 * Nothing here is trusted for authorisation. The backend holds the credentials
 * and decides what a location may read; this only says which one to ask about.
 */

/** Messages exchanged with a parent frame. */
export const EMBED_MESSAGE = {
  /** Parent → widget: here is the current context. */
  context: 'ghl-optimizer:context',
  /** Widget → parent: I am mounted, send me the context. */
  ready: 'ghl-optimizer:ready',
} as const;

interface EmbedContextMessage {
  type: typeof EMBED_MESSAGE.context;
  locationId?: string;
  companyId?: string;
  userName?: string;
}

function readFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('locationId');
}

const embeddedRef = ref<boolean>(window.self !== window.top);
const locationIdRef = ref<string>(readFromUrl() ?? '');
const companyIdRef = ref<string | null>(null);

export const locationId = readonly(locationIdRef);
export const isEmbedded = readonly(embeddedRef);
export const companyId = readonly(companyIdRef);

/** No sub-account could be determined, so there is nothing to show. */
export const hasUnresolvedLocation = computed(() => locationIdRef.value === '');

/** Read directly by the API client, which is not a Vue component. */
export function currentLocationId(): string {
  return locationIdRef.value;
}

export function setLocationId(value: string): void {
  if (value && value !== locationIdRef.value) locationIdRef.value = value;
}

/**
 * Announces the widget to a parent frame and accepts context back.
 *
 * A no-op in the menu-link install, where nothing is listening and the query
 * parameter has already answered the question. This exists for the Marketplace
 * Custom Page path, where the host replies to the ready message.
 *
 * The origin of incoming messages is not restricted to a single host because an
 * agency can serve HighLevel from a white-label domain, and the payload is only
 * a sub-account id — never a credential — so a spoofed message can at worst
 * point the widget at a location the backend will refuse to serve.
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
