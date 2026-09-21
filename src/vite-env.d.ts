/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;

  /** Public Pusher app key (hosted or self-hosted). */
  readonly VITE_PUSHER_APP_KEY: string;
  /** Hosted Pusher cluster, e.g. `eu` → wss://ws-eu.pusher.com */
  readonly VITE_PUSHER_CLUSTER?: string;
  /** Self-hosted websockets hostname (omit when using hosted Pusher + cluster). */
  readonly VITE_PUSHER_HOST?: string;
  readonly VITE_PUSHER_PORT?: string;
  /** Defaults to true for hosted Pusher when unset. */
  readonly VITE_PUSHER_FORCE_TLS?: string;
  readonly VITE_BROADCAST_AUTH_ENDPOINT?: string;
  /** Default radius (km) when fetching nearby riders. */
  readonly VITE_RIDER_SEARCH_RADIUS_KM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
