import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { auth } from "@/lib/auth";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}
window.Pusher = Pusher;

type EchoClient = Echo<"pusher">;

let echoInstance: EchoClient | null = null;
let echoToken: string | null = null;

function resolveAuthEndpoint(): string {
  const explicit = import.meta.env.VITE_BROADCAST_AUTH_ENDPOINT;
  if (explicit) return explicit;

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  if (!apiBase) return "/broadcasting/auth";

  try {
    return `${new URL(apiBase).origin}/broadcasting/auth`;
  } catch {
    return "/broadcasting/auth";
  }
}

function parseForceTls(defaultForHosted: boolean): boolean {
  const raw = import.meta.env.VITE_PUSHER_FORCE_TLS;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return defaultForHosted;
}

/** `api-eu.pusher.com` is the REST host; WebSockets use `ws-eu.pusher.com` via cluster. */
function resolveHostedCluster(
  cluster: string | undefined,
  host: string | undefined
): { cluster: string; host?: undefined } | { cluster?: string; host: string } {
  if (!host) {
    return cluster ? { cluster } : { host: "" };
  }

  const apiMatch = host.match(/^api-([a-z0-9-]+)\.pusher\.com$/i);
  if (apiMatch) {
    const inferred = apiMatch[1];
    console.warn(
      `[echo] VITE_PUSHER_HOST=${host} is the REST API host, not WebSocket. Using cluster "${inferred}" (wss://ws-${inferred}.pusher.com). Remove VITE_PUSHER_HOST from .env.`
    );
    return { cluster: cluster ?? inferred };
  }

  return { host };
}

/**
 * Lazily creates (or returns) the Echo singleton for the logged-in vendor admin.
 * Supports hosted Pusher (cluster + forceTLS, ws-{cluster}.pusher.com) or a
 * self-hosted Laravel WebSockets server (wsHost + port).
 */
export function getEchoClient(): EchoClient | null {
  const token = auth.getToken();
  const key = import.meta.env.VITE_PUSHER_APP_KEY?.trim();
  const clusterRaw = import.meta.env.VITE_PUSHER_CLUSTER?.trim();
  const hostRaw = import.meta.env.VITE_PUSHER_HOST?.trim();
  const resolved = resolveHostedCluster(clusterRaw, hostRaw);
  const cluster = "cluster" in resolved ? resolved.cluster : clusterRaw;
  const host = "host" in resolved ? resolved.host : undefined;

  if (!token || !key) {
    if (!key) {
      console.warn(
        "[echo] VITE_PUSHER_APP_KEY is not set — realtime order alerts are disabled."
      );
    }
    return null;
  }

  const useHostedPusher = Boolean(cluster) && !host?.length;
  if (!useHostedPusher && !host?.length) {
    console.warn(
      "[echo] Set VITE_PUSHER_CLUSTER (hosted Pusher) or VITE_PUSHER_HOST (self-hosted) to enable realtime."
    );
    return null;
  }

  if (echoInstance && echoToken === token) {
    return echoInstance;
  }

  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  if (useHostedPusher) {
    const forceTLS = parseForceTls(true);
    echoInstance = new Echo({
      broadcaster: "pusher",
      key,
      cluster,
      forceTLS,
      disableStats: true,
      enabledTransports: ["ws", "wss"],
      authEndpoint: resolveAuthEndpoint(),
      auth: { headers: authHeaders },
    }) as EchoClient;
  } else {
    const port = Number(import.meta.env.VITE_PUSHER_PORT ?? 443);
    const forceTLS = parseForceTls(false);
    echoInstance = new Echo({
      broadcaster: "pusher",
      key,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS,
      disableStats: true,
      enabledTransports: forceTLS ? ["ws", "wss"] : ["ws"],
      cluster: cluster ?? "",
      authEndpoint: resolveAuthEndpoint(),
      auth: { headers: authHeaders },
    }) as EchoClient;
  }

  echoToken = token;
  return echoInstance;
}

export function disconnectEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
  echoToken = null;
}
