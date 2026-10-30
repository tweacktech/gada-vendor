import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiError } from "@/lib/api"

const PIN_PATTERN = /^\d{4}$/

function errorText(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback
}

/** Set or change the 4-digit transaction PIN used to authorise withdrawals. */
export function TransactionPinCard() {
    const [loading, setLoading] = useState(true)
    const [canManage, setCanManage] = useState(false)
    const [hasPin, setHasPin] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ current: "", pin: "", confirm: "" })

    useEffect(() => {
        let active = true
        api.getTransactionPinStatus()
            .then((status) => {
                if (!active) return
                setCanManage(status.canManage)
                setHasPin(status.hasPin)
            })
            .catch((err) => {
                if (active) toast.error(errorText(err, "Could not load your transaction PIN status"))
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [])

    function update(field: keyof typeof form, value: string) {
        setForm((current) => ({ ...current, [field]: value.replace(/\D/g, "").slice(0, 4) }))
        setError(null)
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        if (hasPin && !PIN_PATTERN.test(form.current)) {
            setError("Enter your current 4-digit PIN.")
            return
        }
        if (!PIN_PATTERN.test(form.pin)) {
            setError("Enter a 4-digit PIN.")
            return
        }
        if (form.pin !== form.confirm) {
            setError("The PIN confirmation does not match.")
            return
        }
        if (hasPin && form.pin === form.current) {
            setError("The new PIN must be different from your current PIN.")
            return
        }

        setSaving(true)
        try {
            if (hasPin) {
                await api.changeTransactionPin({
                    current_pin: form.current,
                    new_pin: form.pin,
                    new_pin_confirmation: form.confirm,
                })
                toast.success("Transaction PIN changed")
            } else {
                await api.setTransactionPin(form.pin, form.confirm)
                setHasPin(true)
                toast.success("Transaction PIN set")
            }
            setForm({ current: "", pin: "", confirm: "" })
        } catch (err) {
            setError(errorText(err, "Could not save your transaction PIN"))
        } finally {
            setSaving(false)
        }
    }

    // Sub-vendor admins don't manage the transaction PIN, so hide the card.
    if (!loading && !canManage) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>{hasPin ? "Change Transaction PIN" : "Set Transaction PIN"}</CardTitle>
                <CardDescription>
                    {hasPin
                        ? "Your 4-digit PIN is required to withdraw earnings."
                        : "Create a 4-digit PIN. You will need it to withdraw earnings."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                ) : (
                    <form onSubmit={onSubmit} className="space-y-4">
                        {hasPin && (
                            <div className="space-y-1.5">
                                <Label htmlFor="current-pin">Current PIN</Label>
                                <Input
                                    id="current-pin"
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={form.current}
                                    onChange={(e) => update("current", e.target.value)}
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="new-pin">{hasPin ? "New PIN" : "PIN"}</Label>
                            <Input
                                id="new-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                value={form.pin}
                                onChange={(e) => update("pin", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-pin">Confirm PIN</Label>
                            <Input
                                id="confirm-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                value={form.confirm}
                                onChange={(e) => update("confirm", e.target.value)}
                            />
                        </div>
                        {error && <p className="text-destructive text-sm">{error}</p>}
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving…" : hasPin ? "Change PIN" : "Set PIN"}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}
