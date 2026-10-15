import { useEffect, useMemo, useState, type FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { format } from "date-fns"
import { EyeIcon, EyeOffIcon, LandmarkIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { usePageTitle } from "@/hooks/usePageTitle"
import {
    api,
    ApiError,
    type BankBeneficiary,
    type PagedResult,
    type VendorBank,
    type VendorTransaction,
    type VendorWallet,
    type VendorWithdrawal,
} from "@/lib/api"
import { auth } from "@/lib/auth"

export const Route = createFileRoute("/_authenticated/earnings/")({
    component: EarningsPage,
})

function formatNaira(amount: number): string {
    return amount.toLocaleString("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function formatWhen(value: string | null): string {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return format(date, "d MMM yyyy, h:mm a")
}

function errorText(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback
}

function EarningsPage() {
    usePageTitle("Earnings")

    const isStoreAdmin = auth.getCurrentUser()?.is_superadmin === true
    const [wallet, setWallet] = useState<VendorWallet | null>(null)
    const [walletError, setWalletError] = useState<string | null>(null)
    const [walletLoading, setWalletLoading] = useState(true)
    const [transactions, setTransactions] = useState<PagedResult<VendorTransaction> | null>(null)
    const [transactionsError, setTransactionsError] = useState<string | null>(null)
    const [transactionsLoading, setTransactionsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all")
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let active = true
        setWalletLoading(true)
        setWalletError(null)
        api.getWallet()
            .then((next) => {
                if (active) setWallet(next)
            })
            .catch((err) => {
                if (active) setWalletError(errorText(err, "Could not load earnings."))
            })
            .finally(() => {
                if (active) setWalletLoading(false)
            })
        return () => {
            active = false
        }
    }, [refreshKey])

    useEffect(() => {
        let active = true
        setTransactionsLoading(true)
        setTransactionsError(null)
        api.getTransactions({
            page,
            per_page: 15,
            ...(typeFilter === "all" ? {} : { type: typeFilter }),
        })
            .then((next) => {
                if (active) setTransactions(next)
            })
            .catch((err) => {
                if (active) setTransactionsError(errorText(err, "Could not load transactions."))
            })
            .finally(() => {
                if (active) setTransactionsLoading(false)
            })
        return () => {
            active = false
        }
    }, [page, typeFilter, refreshKey])

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
                <p className="text-muted-foreground text-sm">
                    Your earnings balance and the transactions on this account.
                </p>
            </div>

            <Card className="overflow-visible">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardDescription>Available earnings</CardDescription>
                        {walletLoading ? (
                            <Skeleton className="mt-2 h-9 w-36" />
                        ) : (
                            <CardTitle className="text-3xl">
                                {wallet ? formatNaira(wallet.balance) : "—"}
                            </CardTitle>
                        )}
                    </div>
                    <div className="text-muted-foreground max-w-sm text-right text-sm">
                        {walletError && <p className="text-destructive">{walletError}</p>}
                        {!walletError && !isStoreAdmin && (
                            <p>Only the vendor admin can withdraw.</p>
                        )}
                        {!walletError && isStoreAdmin && wallet?.canWithdraw === false && (
                            <p>
                                {wallet.reason ?? "Withdrawals are unavailable until you have a transaction PIN and enough earnings to cover the amount and the bank fee."}
                            </p>
                        )}
                        {!walletError && isStoreAdmin && wallet?.fee != null && (
                            <p>Bank fee: {formatNaira(wallet.fee)}</p>
                        )}
                    </div>
                </CardHeader>
            </Card>

            <Card className="overflow-visible">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Transactions</CardTitle>
                        <CardDescription>
                            {transactions
                                ? `${transactions.total} on this account`
                                : "Credits and debits on this admin account."}
                        </CardDescription>
                    </div>
                    <Select
                        value={typeFilter}
                        onValueChange={(value) => {
                            setTypeFilter(value as "all" | "credit" | "debit")
                            setPage(1)
                        }}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="credit">Credits</SelectItem>
                            <SelectItem value="debit">Debits</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="shrink-0 px-0">
                    {transactionsLoading ? (
                        <div className="space-y-3 p-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : transactionsError ? (
                        <p className="text-destructive p-4 text-sm">{transactionsError}</p>
                    ) : !transactions || transactions.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                            <WalletIcon className="text-muted-foreground size-8" />
                            <p className="text-sm font-medium">No transactions yet</p>
                        </div>
                    ) : (
                        <table className="w-full border-t text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4 whitespace-normal">Date</TableHead>
                                        <TableHead className="whitespace-normal">Description</TableHead>
                                        <TableHead className="whitespace-normal">Type</TableHead>
                                        <TableHead className="whitespace-normal">Status</TableHead>
                                        <TableHead className="pr-4 text-right whitespace-normal">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.data.map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell className="pl-4 whitespace-normal">{formatWhen(transaction.createdAt)}</TableCell>
                                            <TableCell className="max-w-xs whitespace-normal">
                                                <div className="font-medium">{transaction.description}</div>
                                                {transaction.reference && (
                                                    <div className="text-muted-foreground text-xs">{transaction.reference}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="capitalize whitespace-normal">{transaction.type}</TableCell>
                                            <TableCell className="whitespace-normal">
                                                {transaction.status ? (
                                                    <Badge variant="secondary" className="capitalize">{transaction.status}</Badge>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell className={`pr-4 text-right font-medium ${transaction.type === "debit" ? "text-destructive" : ""}`}>
                                                {transaction.type === "debit" ? "−" : "+"}
                                                {formatNaira(transaction.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </table>
                    )}
                    {transactions && (
                        <Pager
                            page={transactions.page}
                            lastPage={transactions.lastPage}
                            onPage={setPage}
                        />
                    )}
                </CardContent>
            </Card>

            {isStoreAdmin && (
                <WithdrawCard
                    balance={wallet?.balance ?? 0}
                    fee={wallet?.fee ?? null}
                    canWithdraw={wallet?.canWithdraw ?? null}
                    onCompleted={() => setRefreshKey((value) => value + 1)}
                />
            )}

            {isStoreAdmin && <WithdrawalsCard refreshKey={refreshKey} />}
        </div>
    )
}

function WithdrawCard({
    balance,
    fee,
    canWithdraw,
    onCompleted,
}: {
    balance: number
    fee: number | null
    canWithdraw: boolean | null
    onCompleted: () => void
}) {
    const senderDefault = auth.getCurrentUser()?.full_name ?? ""
    const [banks, setBanks] = useState<VendorBank[]>([])
    const [beneficiaries, setBeneficiaries] = useState<BankBeneficiary[]>([])
    const [banksError, setBanksError] = useState<string | null>(null)
    const [bankQuery, setBankQuery] = useState("")
    const [beneficiaryId, setBeneficiaryId] = useState("")
    const [bankCode, setBankCode] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [accountName, setAccountName] = useState("")
    const [senderName, setSenderName] = useState(senderDefault)
    const [amount, setAmount] = useState("")
    const [pin, setPin] = useState("")
    const [showPin, setShowPin] = useState(false)
    const [lookupError, setLookupError] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [lookingUp, setLookingUp] = useState(false)
    const [saving, setSaving] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        let active = true
        Promise.all([api.getBanks(), api.getBankBeneficiaries()])
            .then(([nextBanks, nextBeneficiaries]) => {
                if (!active) return
                setBanks(nextBanks)
                setBeneficiaries(nextBeneficiaries)
            })
            .catch((err) => {
                if (active) setBanksError(errorText(err, "Could not load banks."))
            })
        return () => {
            active = false
        }
    }, [])

    const selectedBank = banks.find((bank) => bank.code === bankCode) ?? null
    const visibleBanks = useMemo(() => {
        const query = bankQuery.trim().toLowerCase()
        if (!query) return banks
        return banks.filter(
            (bank) =>
                bank.code === bankCode ||
                bank.name.toLowerCase().includes(query) ||
                bank.code.includes(query)
        )
    }, [banks, bankQuery, bankCode])

    function applyBeneficiary(id: string) {
        setBeneficiaryId(id)
        const account = beneficiaries.find((item) => item.id === id)
        if (!account) return
        setBankCode(account.bankCode)
        setAccountNumber(account.accountNumber)
        setAccountName(account.accountName)
        setLookupError(null)
    }

    async function lookupAccount() {
        setLookupError(null)
        if (!bankCode) {
            setLookupError("Select a bank.")
            return
        }
        if (!/^\d{10}$/.test(accountNumber)) {
            setLookupError("Enter the 10-digit account number.")
            return
        }
        setLookingUp(true)
        try {
            const account = await api.lookupBankAccount(accountNumber, bankCode)
            setAccountName(account.accountName)
            setAccountNumber(account.accountNumber)
        } catch (err) {
            setAccountName("")
            setLookupError(errorText(err, "Could not check that account."))
        } finally {
            setLookingUp(false)
        }
    }

    async function saveAccount() {
        if (!selectedBank || !accountName) return
        setSaving(true)
        setFormError(null)
        try {
            await api.saveBankBeneficiary({
                account_number: accountNumber,
                account_name: accountName,
                bank_code: selectedBank.code,
                bank_name: selectedBank.name,
            })
            const next = await api.getBankBeneficiaries()
            setBeneficiaries(next)
            toast.success("Bank account saved")
        } catch (err) {
            setFormError(errorText(err, "Could not save that account."))
        } finally {
            setSaving(false)
        }
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setFormError(null)
        const payout = Number(amount)
        if (!selectedBank || !accountName || !accountNumber) {
            setFormError("Check the account before withdrawing.")
            return
        }
        if (!Number.isFinite(payout) || payout <= 0) {
            setFormError("Enter an amount greater than zero.")
            return
        }
        if (payout > balance) {
            setFormError("Amount is higher than your earnings.")
            return
        }
        if (fee != null && payout + fee > balance) {
            setFormError("Your earnings do not cover the amount and the bank fee.")
            return
        }
        if (!senderName.trim()) {
            setFormError("Enter the sender name.")
            return
        }
        if (pin.trim().length < 4) {
            setFormError("Enter your transaction PIN.")
            return
        }

        setSubmitting(true)
        try {
            const message = await api.withdraw({
                amount: payout,
                accountNumber,
                accountName,
                bankCode: selectedBank.code,
                bankName: selectedBank.name,
                senderName: senderName.trim(),
                pin: pin.trim(),
            })
            toast.success(message)
            setAmount("")
            setPin("")
            onCompleted()
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : errorText(err, "Could not withdraw."))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdraw</CardTitle>
                <CardDescription>
                    Send earnings to a bank account. The amount and the bank fee are taken from your balance.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
                    {banksError && <p className="text-destructive text-sm sm:col-span-2">{banksError}</p>}

                    {beneficiaries.length > 0 && (
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>Saved account</Label>
                            <Select value={beneficiaryId || undefined} onValueChange={applyBeneficiary}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a saved account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {beneficiaries.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.accountName} · {account.bankName || account.bankCode} · {account.accountNumber}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="bank-search">Bank</Label>
                        <Input
                            id="bank-search"
                            value={bankQuery}
                            onChange={(event) => setBankQuery(event.target.value)}
                            placeholder="Search banks"
                        />
                        <Select
                            value={bankCode || undefined}
                            onValueChange={(value) => {
                                setBankCode(value)
                                setAccountName("")
                                setBeneficiaryId("")
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a bank" />
                            </SelectTrigger>
                            <SelectContent>
                                {visibleBanks.map((bank) => (
                                    <SelectItem key={bank.code} value={bank.code}>
                                        {bank.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="account-number">Account number</Label>
                        <Input
                            id="account-number"
                            inputMode="numeric"
                            value={accountNumber}
                            onChange={(event) => {
                                setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                                setAccountName("")
                                setBeneficiaryId("")
                            }}
                            placeholder="0123456789"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button type="button" variant="outline" className="w-full" disabled={lookingUp} onClick={() => void lookupAccount()}>
                            {lookingUp ? "Checking…" : "Check account"}
                        </Button>
                    </div>
                    {lookupError && <p className="text-destructive text-sm sm:col-span-2">{lookupError}</p>}
                    {accountName && (
                        <div className="bg-muted flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm sm:col-span-2">
                            <div>
                                <p className="font-medium">{accountName}</p>
                                <p className="text-muted-foreground">{selectedBank?.name}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void saveAccount()}>
                                {saving ? "Saving…" : "Save account"}
                            </Button>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sender-name">Sender name</Label>
                        <Input
                            id="sender-name"
                            value={senderName}
                            onChange={(event) => setSenderName(event.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="pin">Transaction PIN</Label>
                        <div className="relative max-w-xs">
                            <Input
                                id="pin"
                                type={showPin ? "text" : "password"}
                                inputMode="numeric"
                                autoComplete="off"
                                value={pin}
                                onChange={(event) => setPin(event.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin((value) => !value)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                aria-label={showPin ? "Hide PIN" : "Show PIN"}
                            >
                                {showPin ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                            </button>
                        </div>
                    </div>

                    {formError && <p className="text-destructive text-sm sm:col-span-2">{formError}</p>}

                    <div className="sm:col-span-2">
                        <Button type="submit" disabled={submitting || canWithdraw === false}>
                            {submitting ? "Sending…" : "Withdraw"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

function WithdrawalsCard({ refreshKey }: { refreshKey: number }) {
    const [page, setPage] = useState(1)
    const [result, setResult] = useState<PagedResult<VendorWithdrawal> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        setLoading(true)
        setError(null)
        api.getWithdrawals({ page, per_page: 10 })
            .then((next) => {
                if (active) setResult(next)
            })
            .catch((err) => {
                if (active) setError(errorText(err, "Could not load withdrawals."))
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [page, refreshKey])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdrawals</CardTitle>
                <CardDescription>Payouts sent from this store.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="space-y-3 p-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : error ? (
                    <p className="text-destructive p-4 text-sm">{error}</p>
                ) : !result || result.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                        <LandmarkIcon className="text-muted-foreground size-8" />
                        <p className="text-sm font-medium">No withdrawals yet</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">Date</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="pr-4 text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.data.map((withdrawal) => (
                                <TableRow key={withdrawal.id}>
                                    <TableCell className="pl-4">{formatWhen(withdrawal.createdAt)}</TableCell>
                                    <TableCell className="whitespace-normal">
                                        <div className="font-medium">{withdrawal.accountName || "Bank account"}</div>
                                        <div className="text-muted-foreground text-xs">
                                            {[withdrawal.bankName, withdrawal.accountNumber].filter(Boolean).join(" · ")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">{withdrawal.status}</Badge>
                                    </TableCell>
                                    <TableCell className="pr-4 text-right font-medium">{formatNaira(withdrawal.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {result && (
                    <Pager page={result.page} lastPage={result.lastPage} onPage={setPage} />
                )}
            </CardContent>
        </Card>
    )
}

function Pager({
    page,
    lastPage,
    onPage,
}: {
    page: number
    lastPage: number
    onPage: (page: number) => void
}) {
    if (lastPage <= 1) return null
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-muted-foreground text-sm">
                Page {page} of {lastPage}
            </p>
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
                    Next
                </Button>
            </div>
        </div>
    )
}
