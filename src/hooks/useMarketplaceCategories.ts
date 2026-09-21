import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { MarketplaceCategory } from "@/types/marketplace";

export function useMarketplaceCategories(vendorId: string | number | undefined) {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!vendorId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMarketplaceCategories(vendorId);
      setCategories(data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load categories: ${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load categories");
      }
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, refetch: fetchCategories };
}
