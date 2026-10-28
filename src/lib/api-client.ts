"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";

/** All API calls go to the built-in mock (Next route handlers under src/app/api/v1). */
export const API_BASE = "/api/v1";

export async function apiGet<T>(endpoint: string): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}${path}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** Same signature as the live app's `useFetch({ endpoint, queryKey, enabled })` hook. */
export function useApiQuery<T>({ endpoint, queryKey, enabled = true }: { endpoint: string; queryKey: QueryKey; enabled?: boolean }) {
  return useQuery<T>({ queryKey, queryFn: () => apiGet<T>(endpoint), enabled });
}
