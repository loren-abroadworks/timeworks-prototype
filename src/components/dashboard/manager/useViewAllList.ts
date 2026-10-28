"use client";

import * as React from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useDateRange, useQueryParams } from "@/lib/use-query-params";
import type { Paged } from "@/lib/api-types";
import { PAGE_SIZE, pageInfo } from "../shared/ViewAllSheet";

type Registry = {
  endpoint: (p: { organizationId: string; limit: number; offset: number; search?: string; filterUserId?: string; startDate?: string; endDate?: string }) => string;
  queryKey: (p: { organizationId: string; limit: number; offset: number; search?: string; filterUserId?: string; startDate?: string; endDate?: string }) => QueryKey;
};

/**
 * State + data for a Manager View "View All" sheet: page, member filter, ?search=, date range.
 * `withDates: false` for the limits sheets (they are not date-range based).
 */
export function useViewAllList<Row>(registry: Registry, open: boolean, withDates = true) {
  const { organizationId } = useSession();
  const { get } = useQueryParams();
  const { startDate, endDate } = useDateRange();
  const [page, setPage] = React.useState(1);
  const [member, setMember] = React.useState<{ user_id: string; name: string } | null>(null);
  const params = {
    organizationId: String(organizationId),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    search: get("search") ?? undefined,
    filterUserId: member?.user_id,
    ...(withDates ? { startDate, endDate } : {}),
  };
  const { data, isLoading } = useApiQuery<Paged<Row>>({
    endpoint: registry.endpoint(params),
    queryKey: registry.queryKey(params),
    enabled: open && !!organizationId,
  });
  const info = pageInfo(page, data?.total_count ?? 0);
  return {
    rows: data?.data ?? [],
    isLoading,
    info,
    member,
    setMember: (m: { user_id: string; full_name: string } | null) => {
      setMember(m ? { user_id: m.user_id, name: m.full_name } : null);
      setPage(1);
    },
    resetPage: () => setPage(1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(info.totalPages, p + 1)),
  };
}
