"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write URL query params (start_date, end_date, search, …) — the dashboard keeps its
 * filters in the URL, just like the live app.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key), [params]);

  const push = useCallback(
    (query: Record<string, string>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(query)) next.set(k, v);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const remove = useCallback(
    (key: string) => {
      const next = new URLSearchParams(window.location.search);
      next.delete(key);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  /** Set and delete several params in one navigation (empty / null values are deleted). */
  const update = useCallback(
    (set: Record<string, string | null | undefined>, opts: { replace?: boolean } = {}) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(set)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );

  return { get, push, remove, update, params };
}

/** The selected dashboard range (defaults to the last 30 days ending today). */
export function useDateRange() {
  const { get } = useQueryParams();
  const today = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  return { startDate: get("start_date") || fmt(start), endDate: get("end_date") || fmt(today) };
}
