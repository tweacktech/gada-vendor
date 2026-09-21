import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, RefreshCwIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useMarketplaceAgents } from "@/hooks/useMarketplaceAgents"
import { api, ApiError } from "@/lib/api"
import { AGENT_STATUS_FILTERS } from "@/types/marketplace"

const statusConfig: Record<string, { label: string; className: string }> = {
    pending_interview: { label: "Pending Interview", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    active: { label: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
}

const statusLabel = (value: string) =>
    value
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")

export function MarketplaceAgentsTable() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
    const { agents, isLoading, error, refetch } = useMarketplaceAgents(statusFilter)
    const [busyId, setBusyId] = useState<string | null>(null)

    async function handleActivate(agentId: string) {
        setBusyId(agentId)
        try {
            await api.activateMarketplaceAgent(agentId)
            toast.success("Agent activated")
            refetch()
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to activate agent")
        } finally {
            setBusyId(null)
        }
    }

    async function handleReject(agentId: string) {
        const reason = window.prompt("Reason for rejecting this agent (optional):") ?? undefined
        setBusyId(agentId)
        try {
            await api.rejectMarketplaceAgent(agentId, reason || undefined)
            toast.success("Agent rejected")
            refetch()
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to reject agent")
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <Select
                    value={statusFilter ?? "all"}
                    onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {AGENT_STATUS_FILTERS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {statusLabel(s)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Agent</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Trip Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                    <div className="flex flex-col items-center gap-2">
                                        {error}
                                        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
                                            <RefreshCwIcon className="size-3.5" />
                                            Retry
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : agents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No agents found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            agents.map((agent) => {
                                const status = statusConfig[agent.status] ?? {
                                    label: statusLabel(agent.status),
                                    className: "bg-muted text-muted-foreground",
                                }
                                const isPending = agent.status === "pending_interview"
                                return (
                                    <TableRow key={agent.id}>
                                        <TableCell className="font-medium">{agent.full_name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <div className="flex flex-col">
                                                {agent.phone && <span>{agent.phone}</span>}
                                                {agent.email && <span>{agent.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={status.className}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm capitalize">
                                            {agent.trip_status ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isPending ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5"
                                                        disabled={busyId === agent.id}
                                                        onClick={() => handleActivate(agent.id)}
                                                    >
                                                        <CheckIcon className="size-3.5" />
                                                        Activate
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive hover:text-destructive gap-1.5"
                                                        disabled={busyId === agent.id}
                                                        onClick={() => handleReject(agent.id)}
                                                    >
                                                        <XIcon className="size-3.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
