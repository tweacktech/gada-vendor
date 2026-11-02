import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiError } from "@/lib/api"

const PIN_PATTERN = /^\d{4}$/
const OTP_PATTERN = /^\d{6}$/

const emptyForm = { pin: "", confirm: "", otp: "" }

function errorText(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback
}

/**
 * Transaction PIN for the superadmin vendor.
 * - No PIN yet: shows Set PIN only.
 * - PIN set: shows Reset PIN only. Reset sends a code to the phone, then asks for
 *   the code and a new PIN. There is no change-with-current-PIN form.
 */
export function TransactionPinCard() {
    const [loading, setLoading] = useState(true)
    const [canManage, setCanManage] = useState(false)
    const [hasPin, setHasPin] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm)
    // true after the reset code has been requested and before the reset is completed
    const [resetting, setResetting] = useState(false)
    const [sentTo, setSentTo] = useState<string | null>(null)

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
        const limit = field === "otp" ? 6 : 4
        setForm((current) => ({ ...current, [field]: value.replace(/\D/g, "").slice(0, limit) }))
        setError(null)
    }

    async function requestCode() {
        setError(null)
        setSaving(true)
        try {
            const result = await api.requestTransactionPinReset()
            setSentTo(result.sentTo)
            setResetting(true)
            setForm(emptyForm)
            toast.success("A reset code has been sent to your phone")
        } catch (err) {
            setError(errorText(err, "Could not send the reset code. Please try again."))
        } finally {
            setSaving(false)
        }
    }

    function cancelReset() {
        setResetting(false)
        setSentTo(null)
        setForm(emptyForm)
        setError(null)
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        if (!hasPin) {
            if (!PIN_PATTERN.test(form.pin)) {
                setError("Enter a 4-digit PIN.")
                return
            }
            if (form.pin !== form.confirm) {
                setError("The PIN confirmation does not match.")
                return
            }
            setSaving(true)
            try {
                await api.setTransactionPin(form.pin, form.confirm)
                setHasPin(true)
                setForm(emptyForm)
                toast.success("Transaction PIN set")
            } catch (err) {
                setError(errorText(err, "Could not save your transaction PIN"))
            } finally {
                setSaving(false)
            }
            return
        }

        // Reset flow (PIN already set)
        if (!OTP_PATTERN.test(form.otp)) {
            setError("Enter the 6-digit code sent to your phone.")
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
        setSaving(true)
        try {
            await api.resetTransactionPin({ otp: form.otp, pin: form.pin, pin_confirmation: form.confirm })
            setResetting(false)
            setSentTo(null)
            setForm(emptyForm)
            toast.success("Transaction PIN reset")
        } catch (err) {
            setError(errorText(err, "Could not reset your transaction PIN"))
        } finally {
            setSaving(false)
        }
    }

    // Sub-vendor admins don't manage the transaction PIN, so hide the card.
    if (!loading && !canManage) return null

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6 text-muted-foreground text-sm">Loading…</CardContent>
            </Card>
        )
    }

    // PIN already set, not in the reset flow: only the Reset PIN entry point.
    if (hasPin && !resetting) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Transaction PIN</CardTitle>
                    <CardDescription>
                        Your 4-digit PIN is required to withdraw earnings. If you have forgotten it, reset it
                        with a code sent to your phone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    <Button type="button" onClick={requestCode} disabled={saving}>
                        {saving ? "Sending code…" : "Reset PIN"}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Set PIN (first time), or the reset form after the code was sent.
    return (
        <Card>
            <CardHeader>
                <CardTitle>{hasPin ? "Reset Transaction PIN" : "Set Transaction PIN"}</CardTitle>
                <CardDescription>
                    {hasPin
                        ? `Enter the 6-digit code sent to ${sentTo ?? "your phone"}, then choose a new 4-digit PIN.`
                        : "Create a 4-digit PIN. You will need it to withdraw earnings."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    {hasPin && (
                        <div className="space-y-1.5">
                            <Label htmlFor="reset-code">Reset code</Label>
                            <Input
                                id="reset-code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={form.otp}
                                onChange={(e) => update("otp", e.target.value)}
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

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving…" : hasPin ? "Reset PIN" : "Set PIN"}
                        </Button>
                        {hasPin && (
                            <>
                                <Button type="button" variant="outline" disabled={saving} onClick={requestCode}>
                                    Resend code
                                </Button>
                                <Button type="button" variant="ghost" disabled={saving} onClick={cancelReset}>
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
