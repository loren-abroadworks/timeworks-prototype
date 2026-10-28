"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DebouncedSearch } from "@/components/ui/search-input";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { displayAppName } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDateRange, useQueryParams } from "@/lib/use-query-params";
import type { AppUsageAllResponse, AppUsageItem } from "@/lib/api-types";
import { PAGE_SIZE, SheetPagination, SheetStatusRow, pageInfo } from "../shared/ViewAllSheet";

type TabKey = "all" | "apps" | "urls";

function Rows({ isLoading, rows, emptyLabel }: { isLoading: boolean; rows: AppUsageItem[]; emptyLabel: string }) {
  if (isLoading) return <SheetStatusRow colSpan={3}>Loading...</SheetStatusRow>;
  if (rows.length === 0) return <SheetStatusRow colSpan={3}>{emptyLabel}</SheetStatusRow>;
  return (
    <>
      {rows.map((r, i) => (
        <TableRow key={`${r.application_name}-${i}`} data-testid="sheet-row">
          <TableCell className="text-sm font-medium">{displayAppName(r.application_name, r.type)}</TableCell>
          <TableCell>
            <span className="flex items-center gap-1.5">
              <span className="text-sm tabular-nums">{r.activity_percentage?.toFixed(1)}%</span>
              <div className="flex-1 bg-ui-background rounded-full h-1.5 min-w-20">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, r.activity_percentage)}%` }} />
              </div>
            </span>
          </TableCell>
          <TableCell className="text-sm tabular-nums text-right">{r.total_time_spent}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** "Top Apps & URLs" View All sheet: tabs, search, 20 rows per page (each tab keeps its own page). */
export function TopAppsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organizationId } = useSession();
  const { get } = useQueryParams();
  const { startDate, endDate } = useDateRange();
  const [pages, setPages] = React.useState<Record<TabKey, number>>({ all: 1, apps: 1, urls: 1 });
  const [tab, setTab] = React.useState<TabKey>("all");
  const search = get("search") ?? undefined;
  const params = { organizationId: String(organizationId), limit: PAGE_SIZE, offset: (pages[tab] - 1) * PAGE_SIZE, search, startDate, endDate };
  const { data, isLoading } = useApiQuery<AppUsageAllResponse>({
    endpoint: endpoints.dashboard.appUsageAll.endpoint(params),
    queryKey: endpoints.dashboard.appUsageAll.queryKey(params),
    enabled: open && !!organizationId,
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-3/4 sm:max-w-4xl flex flex-col overflow-hidden p-0" data-testid="top-apps-sheet">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex flex-col flex-1 overflow-hidden gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>Top Apps &amp; URLs</SheetTitle>
            <SheetDescription className="sr-only">Most used applications and websites for the selected period.</SheetDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
              {/* shrink-0: replica tweak so the tabs are not squeezed by the full-width search box */}
              <TabsList size="md" className="shrink-0">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="apps">Apps</TabsTrigger>
                <TabsTrigger value="urls">URLs</TabsTrigger>
              </TabsList>
              <DebouncedSearch className="h-9!" updateQueryParam onChange={() => setPages({ all: 1, apps: 1, urls: 1 })} />
            </div>
          </SheetHeader>
          {(["all", "apps", "urls"] as TabKey[]).map((key) => {
            const block = data?.[key];
            const info = pageInfo(pages[key], block?.total_count ?? 0);
            return (
              <TabsContent key={key} value={key} className="flex flex-col flex-1 overflow-hidden mt-0">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>App / URL</TableHead>
                        <TableHead>Usage Percentage</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <Rows isLoading={isLoading} rows={block?.data ?? []} emptyLabel={`No ${key === "all" ? "apps or URLs" : key} found`} />
                    </TableBody>
                  </Table>
                </div>
                <SheetPagination
                  {...info}
                  onPrev={() => setPages((p) => ({ ...p, [key]: Math.max(1, p[key] - 1) }))}
                  onNext={() => setPages((p) => ({ ...p, [key]: Math.min(info.totalPages, p[key] + 1) }))}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
