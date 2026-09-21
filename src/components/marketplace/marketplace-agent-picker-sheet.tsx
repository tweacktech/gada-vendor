import { useMemo, useState } from "react"
import { CheckIcon, Loader2Icon, PhoneIcon, SearchIcon, UserRoundIcon } from "lucide-react"

import { api, ApiError } from "@/lib/api"
import { useMarketplaceAgents } from "@/hooks/useMarketplaceAgents"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
    orderId: string
    orderNumber: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onDone: () => void
}

export function MarketplaceAgentPickerSheet({ orderId, orderNumber, open, onOpenChange, onDone }: Props) {
    const { agents, isLoading } = useMarketplaceAgents("active")
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [assignedId, setAssignedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredAgents = useMemo(() => {
        if (!normalizedSearchQuery) return agents
        return agents.filter((agent) =>
            [agent.full_name, agent.phone].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearchQuery)
        )
    }, [agents, normalizedSearchQuery])

    async function handleAssign(agentId: string) {
        setAssigningId(agentId)
        setError(null)
        try {
            await api.assignAgentToMarketplaceOrder(orderId, agentId)
            setAssignedId(agentId)
            setTimeout(onDone, 800)
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to assign agent. Please try again.")
        } finally {
            setAssigningId(null)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-6 py-5">
                    <SheetTitle>Assign a Field Agent</SheetTitle>
                    <SheetDescription>
                        Hand order <span className="text-foreground font-mono">{orderNumber}</span> to an active
                        agent to source it at the market.
                    </SheetDescription>
                </SheetHeader>

                {error && (
                    <div className="border-destructive/30 bg-destructive/10 text-destructive mx-6 mt-4 rounded-lg border px-4 py-2 text-sm">
                        {error}
                    </div>
                )}

                <div className="border-b px-6 py-4">
                    <div className="relative">
                        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search agents by name or phone"
                            className="pl-9"
                            disabled={isLoading || agents.length === 0}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col gap-3 px-6 py-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="size-10 shrink-0 rounded-full" />
                                    <div className="flex flex-1 flex-col gap-1.5">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </div>
                                    <Skeleton className="h-8 w-16 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16">
                            <UserRoundIcon className="size-10 opacity-30" />
                            <p className="text-sm">No active agents right now.</p>
                        </div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                            <SearchIcon className="size-10 opacity-30" />
                            <p className="text-sm">No agents match your search.</p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {filteredAgents.map((agent) => {
                                const isAssigning = assigningId === agent.id
                                const isDone = assignedId === agent.id
                                return (
                                    <li key={agent.id} className="flex items-center gap-3 px-6 py-4">
                                        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                                            {agent.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate text-sm font-medium">{agent.full_name}</span>
                                            {agent.phone && (
                                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                                    <PhoneIcon className="size-3" />
                                                    {agent.phone}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={isDone ? "default" : "outline"}
                                            disabled={isAssigning || isDone || assigningId !== null}
                                            onClick={() => handleAssign(agent.id)}
                                            className="shrink-0"
                                        >
                                            {isAssigning ? (
                                                <Loader2Icon className="size-3.5 animate-spin" />
                                            ) : isDone ? (
                                                <CheckIcon className="size-3.5" />
                                            ) : (
                                                "Assign"
                                            )}
                                        </Button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="border-t">
                    <Button variant="ghost" onClick={onDone} className="w-full">
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
