/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** Base URL of the optimizer API, e.g. http://localhost:4000/api/v1 */
  readonly VITE_API_BASE_URL: string;
  /**
   * Fallback sub-account id used when the widget is opened outside HighLevel.
   * Inside the iframe the id arrives from the loader instead.
   */
  readonly VITE_DEFAULT_LOCATION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
