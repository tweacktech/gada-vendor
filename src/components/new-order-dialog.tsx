import { useNavigate, useRouterState } from "@tanstack/react-router"

import { useOrderAlerts } from "@/components/order-alerts-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Pops up when a new order arrives, on any page except settings.
 * Closing it keeps the order in the notification inbox. Settings suppresses
 * it while the user is there, and it shows again on the next page.
 */
export function NewOrderDialog() {
  const { newOrder, dismissNewOrder } = useOrderAlerts()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  if (!newOrder) return null

  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/")

  return (
    <Dialog
      open={!onSettings}
      onOpenChange={(next) => {
        if (!next) dismissNewOrder()
      }}
    >
      <DialogContent key={newOrder.key}>
        <DialogHeader>
          <DialogTitle>New order received</DialogTitle>
          <DialogDescription>
            Order {newOrder.orderNumber} just came in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={dismissNewOrder}>
            Close
          </Button>
          <Button
            onClick={() => {
              dismissNewOrder()
              navigate({ to: "/orders/$orderId", params: { orderId: String(newOrder.orderId) } })
            }}
          >
            View order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
