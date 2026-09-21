import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CreateOrderForm } from "@/components/create-order-form"
import { usePageTitle } from "@/hooks/usePageTitle"

export const Route = createFileRoute("/_authenticated/orders/create")({
    component: CreateOrderPage,
})

function CreateOrderPage() {
    usePageTitle("Create Order")

    const navigate = useNavigate()

    return (
        <div className="">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Create Order</h1>
                <p className="text-muted-foreground text-sm">
                    Create a batch from one pickup to multiple delivery points.
                </p>
            </div>
            <CreateOrderForm onSuccess={(id) => navigate({ to: "/orders/$orderId", params: { orderId: id } })} />
        </div>
    )
}
