import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { MarketplaceAgent } from "@/types/marketplace";

export function useMarketplaceAgents(status?: string) {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMarketplaceAgents(status);
      setAgents(data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load agents: ${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      }
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, refetch: fetchAgents };
}
