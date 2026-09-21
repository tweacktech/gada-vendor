import { createContext, useContext, type ReactNode } from "react"

import { useOrderAlertsInternal, type OrderAlertsState } from "@/hooks/useOrderAlerts"

const OrderAlertsContext = createContext<OrderAlertsState | null>(null)

export function OrderAlertsProvider({ children }: { children: ReactNode }) {
  const value = useOrderAlertsInternal()
  return (
    <OrderAlertsContext.Provider value={value}>{children}</OrderAlertsContext.Provider>
  )
}

export function useOrderAlerts(): OrderAlertsState {
  const ctx = useContext(OrderAlertsContext)
  if (!ctx) {
    throw new Error("useOrderAlerts must be used within OrderAlertsProvider")
  }
  return ctx
}
