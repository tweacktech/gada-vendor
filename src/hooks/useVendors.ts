import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { Vendor } from "@/types/logistics";

interface UseVendorsResult {
  vendors: Vendor[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVendors(): UseVendorsResult {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getVendors();
      setVendors(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load vendors: ${err.message} (${err.status})`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return { vendors, isLoading, error, refetch: fetchVendors };
}
