import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { MarketplaceProduct } from "@/types/marketplace";

export function useMarketplaceProducts(vendorId: string | number | undefined, categoryId?: string) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!vendorId) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMarketplaceProducts(vendorId, { category_id: categoryId });
      setProducts(data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load products: ${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load products");
      }
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, categoryId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}
