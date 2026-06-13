"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/components/api";

export function useData<T>(url: string, seed: T) {
  const query = useQuery({
    queryKey: [url],
    queryFn: () => api<T>(url),
    initialData: seed
  });
  const reload = useCallback(() => {
    query.refetch();
  }, [query]);

  return { data: query.data ?? seed, error: query.error instanceof Error ? query.error.message : "", reload };
}
