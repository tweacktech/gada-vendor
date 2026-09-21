import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getEchoClient } from "@/lib/echo";
import { emitMarketplaceOrderRefresh } from "@/lib/marketplace-realtime";
import type { MarketplaceOrderStatusChangedPayload } from "@/types/marketplace";
import type { VendorNotification } from "@/types/notifications";

export interface OrderAlert {
  id: string;
  orderId: number;
  orderNumber: string;
  status: string;
  previousStatus: string | null;
  isNewOrder: boolean;
  receivedAt: string;
  /** Server inbox id when this alert came from GET /notifications. */
  notificationId?: string;
}

export interface OrderAlertsState {
  alerts: OrderAlert[];
  unreadCount: number;
  isConnected: boolean;
  markAllRead: () => void;
  refetchInbox: () => void;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const MAX_ALERTS = 30;
const SOUND_SRC = "/notification-sound.mp3";

function toAlert(payload: MarketplaceOrderStatusChangedPayload): OrderAlert {
  return {
    id: `${payload.marketplace_order_id}-${payload.updated_at}`,
    orderId: payload.marketplace_order_id,
    orderNumber: payload.order_number,
    status: payload.status,
    previousStatus: payload.previous_status,
    isNewOrder: payload.previous_status == null,
    receivedAt: new Date().toISOString(),
  };
}

function notificationToAlert(n: VendorNotification): OrderAlert | null {
  const data = n.data ?? {};
  const orderId = Number(data.marketplace_order_id ?? data.order_id ?? 0);
  const orderNumber = String(data.order_number ?? data.orderNumber ?? "Order");
  const status = String(data.status ?? "updated");
  const previousStatus =
    data.previous_status != null ? String(data.previous_status) : null;

  if (!orderId && !orderNumber) return null;

  return {
    id: n.id,
    notificationId: n.id,
    orderId: orderId || 0,
    orderNumber,
    status,
    previousStatus,
    isNewOrder: previousStatus == null,
    receivedAt: n.created_at,
  };
}

function describe(alert: OrderAlert): { title: string; description: string } {
  if (alert.isNewOrder) {
    return {
      title: "New order received",
      description: `${alert.orderNumber} just came in.`,
    };
  }
  return {
    title: `Order ${alert.orderNumber} updated`,
    description: `Status changed to "${alert.status.replace(/_/g, " ")}".`,
  };
}

function handleStatusPayload(payload: MarketplaceOrderStatusChangedPayload) {
  const alert = toAlert(payload);
  const { title, description } = describe(alert);
  emitMarketplaceOrderRefresh();
  return { alert, title, description };
}

export function useOrderAlertsInternal(): OrderAlertsState {
  const [alerts, setAlerts] = useState<OrderAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_SRC);
    }
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {
      console.warn("[order-alerts] sound blocked until the user interacts with the page.");
    });
  }, []);

  const refetchInbox = useCallback(async () => {
    try {
      const items = await api.getNotifications();
      const mapped = items
        .map(notificationToAlert)
        .filter((a): a is OrderAlert => a != null);
      setAlerts((prev) => {
        const byId = new Map<string, OrderAlert>();
        for (const a of mapped) byId.set(a.id, a);
        for (const a of prev) {
          if (!byId.has(a.id)) byId.set(a.id, a);
        }
        return [...byId.values()]
          .sort(
            (a, b) =>
              new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
          )
          .slice(0, MAX_ALERTS);
      });
      const unread = items.filter((n) => !n.read_at).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn("[order-alerts] failed to load notification inbox", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    const unread = alerts.filter((a) => a.notificationId);
    await Promise.allSettled(
      unread.map((a) =>
        a.notificationId ? api.markNotificationAsRead(a.notificationId) : Promise.resolve()
      )
    );
  }, [alerts]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await api.deleteNotification(notificationId);
    setAlerts((prev) => prev.filter((a) => a.notificationId !== notificationId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return;

    void refetchInbox();

    const echo = getEchoClient();
    if (!echo) return;

    const channelName = `App.Models.User.${currentUser.id}`;
    const channel = echo.private(channelName);

    const onEvent = (payload: MarketplaceOrderStatusChangedPayload) => {
      const { alert, title, description } = handleStatusPayload(payload);
      setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
      setUnreadCount((prev) => prev + 1);
      playSound();
      toast(title, { description });
      void refetchInbox();
    };

    channel.listen(".marketplace-order.status", onEvent);
    channel.listen("marketplace-order.status", onEvent);

    channel.error((error: unknown) => {
      console.error("[order-alerts] private channel subscription error", error);
    });

    const pusher = echo.connector?.pusher;
    const handleStateChange = (state: { current: string }) => {
      setIsConnected(state.current === "connected");
    };
    pusher?.connection?.bind("state_change", handleStateChange);
    setIsConnected(pusher?.connection?.state === "connected");

    return () => {
      channel.stopListening(".marketplace-order.status");
      channel.stopListening("marketplace-order.status");
      pusher?.connection?.unbind("state_change", handleStateChange);
      echo.leave(channelName);
    };
  }, [playSound, refetchInbox]);

  return {
    alerts,
    unreadCount,
    isConnected,
    markAllRead,
    refetchInbox,
    deleteNotification,
  };
}
