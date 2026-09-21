# Realtime marketplace order alerts (Pusher / Laravel Echo)

## What's wired up

- `src/lib/echo.ts` — Echo + pusher-js singleton (hosted **cluster** or self-hosted **host**).
- `src/components/order-alerts-provider.tsx` — one private-channel subscription per session.
- `src/hooks/useOrderAlerts.ts` — listens for **`marketplace-order.status`**, plays
  `/notification-sound.mp3`, shows toasts, syncs the notification inbox, and
  broadcasts a refresh to marketplace lists/counters.
- `src/components/notification-bell.tsx` — bell UI, live/offline dot, inbox delete.
- `src/hooks/useMarketplaceOrderRefresh.ts` — refetch hook used by orders table,
  order detail, and status counter cards.

## Channel & event

Each vendor admin subscribes to:

```
private-App.Models.User.{vendorAdminId}
```

Event name (Laravel Echo):

```
.marketplace-order.status
```

Payload shape: `MarketplaceOrderStatusChangedPayload` in `src/types/marketplace.ts`.

Multiple admins for the same vendor each get their own channel stream (no shared
“someone is handling this” channel yet).

## Hosted Pusher configuration

For **hosted Pusher**, use **cluster + forceTLS** only. Do **not** set
`VITE_PUSHER_HOST` to `api-eu.pusher.com` — that is the REST API host, not
WebSocket. pusher-js resolves `wss://ws-{cluster}.pusher.com` from the cluster.

```env
VITE_PUSHER_APP_KEY=13861ddfec41a7153ec2
VITE_PUSHER_CLUSTER=eu
VITE_PUSHER_FORCE_TLS=true
```

## Self-hosted (legacy)

```env
VITE_PUSHER_APP_KEY=...
VITE_PUSHER_HOST=staging-gada0407.gadarider.com
VITE_PUSHER_PORT=6001
VITE_PUSHER_FORCE_TLS=false
```

## Auth

`POST /broadcasting/auth` must use Sanctum (`auth:sanctum`) so bearer tokens from
this SPA authorize private channels.

## Notification REST API

| Method | Path |
|--------|------|
| GET | `/vendor_admin/notifications` |
| POST | `/vendor_admin/mark-as-read/{notification_id}` |
| DELETE | `/vendor_admin/delete-notification/{notification_id}` |

## Reject / cancel orders

`PATCH /vendor_admin/marketplace-orders/{id}/status` with `{ "status": "cancelled" }`.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Bell “Offline” | Missing `VITE_PUSHER_APP_KEY` or cluster/host |
| 403 on `/broadcasting/auth` | Sanctum guard not on broadcast routes |
| Connects, no events | Wrong user id vs channel name |
| No sound | Browser autoplay policy — interact with the page once |
