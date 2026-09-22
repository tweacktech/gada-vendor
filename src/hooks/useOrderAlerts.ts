import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getEchoClient } from "@/lib/echo";
import { emitMarketplaceOrderRefresh, normalizeMarketplaceStatusPayload } from "@/lib/marketplace-realtime";
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
  readAt: string | null;
  /** Server inbox id from GET /vendor_admin/notifications. */
  notificationId: string;
}

export interface OrderAlertsState {
  alerts: OrderAlert[];
  unreadCount: number;
  isConnected: boolean;
  markAllRead: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  refetchInbox: () => void;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const MAX_ALERTS = 30;
const SOUND_SRC = "/notification-sound.mp3";

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function notificationToAlert(n: VendorNotification): OrderAlert {
  const data = n.data ?? {};
  const orderId = Number(data.marketplace_order_id ?? data.order_id ?? 0);
  const orderNumber =
    asText(data.order_number) ??
    asText(data.orderNumber) ??
    asText(n.title) ??
    "Notification";
  const status =
    asText(data.status) ??
    asText(n.message) ??
    asText(n.body) ??
    asText(data.message) ??
    asText(n.type) ??
    "updated";
  const previousStatus = asText(data.previous_status);

  return {
    id: String(n.id),
    notificationId: String(n.id),
    orderId: Number.isFinite(orderId) ? orderId : 0,
    orderNumber,
    status,
    previousStatus,
    isNewOrder: previousStatus == null && Boolean(orderId),
    receivedAt: n.created_at,
    readAt: n.read_at ?? null,
  };
}

function describeLiveEvent(payload: MarketplaceOrderStatusChangedPayload) {
  if (payload.previous_status == null) {
    return {
      title: "New order received",
      description: `${payload.order_number} just came in.`,
    };
  }
  return {
    title: `Order ${payload.order_number} updated`,
    description: `Status changed to "${payload.status.replace(/_/g, " ")}".`,
  };
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
      const [items, unread] = await Promise.all([
        api.getNotifications(),
        api.getNotificationUnreadCount(),
      ]);
      setAlerts(
        items
          .map(notificationToAlert)
          .sort(
            (a, b) =>
              new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
          )
          .slice(0, MAX_ALERTS)
      );
      setUnreadCount(unread);
    } catch (err) {
      console.warn("[order-alerts] failed to load notification inbox", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsAsRead();
      setUnreadCount(0);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.readAt ? alert : { ...alert, readAt: new Date().toISOString() }
        )
      );
    } catch (err) {
      console.warn("[order-alerts] failed to mark notifications as read", err);
      void refetchInbox();
    }
  }, [refetchInbox]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const target = alerts.find((alert) => alert.notificationId === notificationId);
    if (target?.readAt) return;
    try {
      await api.markNotificationAsRead(notificationId);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.notificationId === notificationId
            ? { ...alert, readAt: alert.readAt ?? new Date().toISOString() }
            : alert
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("[order-alerts] failed to mark notification as read", err);
    }
  }, [alerts]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await api.deleteNotification(notificationId);
    setAlerts((prev) => prev.filter((a) => a.notificationId !== notificationId));
    try {
      const unread = await api.getNotificationUnreadCount();
      setUnreadCount(unread);
    } catch {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return;

    let cancelled = false;
    const loadInbox = window.setTimeout(() => {
      if (!cancelled) void refetchInbox();
    }, 0);

    const echo = getEchoClient();
    if (!echo) {
      return () => {
        cancelled = true;
        window.clearTimeout(loadInbox);
      };
    }

    const channelName = `App.Models.User.${currentUser.id}`;
    const channel = echo.private(channelName);

    const onStatusEvent = (payload: MarketplaceOrderStatusChangedPayload) => {
      emitMarketplaceOrderRefresh(normalizeMarketplaceStatusPayload(payload) ?? payload);
      const { title, description } = describeLiveEvent(payload);
      playSound();
      toast(title, { description });
      void refetchInbox();
    };

    const onInboxEvent = () => {
      playSound();
      void refetchInbox();
    };

    channel.listen(".marketplace-order.status", onStatusEvent);
    channel.listen("marketplace-order.status", onStatusEvent);
    channel.listen(".notification", onInboxEvent);
    channel.listen("notification", onInboxEvent);
    channel.notification(() => {
      playSound();
      void refetchInbox();
    });

    channel.error((error: unknown) => {
      console.error("[order-alerts] private channel subscription error", error);
    });

    const pusher = echo.connector?.pusher;
    const handleStateChange = (state: { current: string }) => {
      setIsConnected(state.current === "connected");
    };
    pusher?.connection?.bind("state_change", handleStateChange);
    window.setTimeout(() => {
      if (!cancelled) {
        setIsConnected(pusher?.connection?.state === "connected");
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadInbox);
      channel.stopListening(".marketplace-order.status");
      channel.stopListening("marketplace-order.status");
      channel.stopListening(".notification");
      channel.stopListening("notification");
      pusher?.connection?.unbind("state_change", handleStateChange);
      echo.leave(channelName);
    };
  }, [playSound, refetchInbox]);

  return {
    alerts,
    unreadCount,
    isConnected,
    markAllRead,
    markAsRead,
    refetchInbox,
    deleteNotification,
  };
}
