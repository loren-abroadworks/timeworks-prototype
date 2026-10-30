"use client";

import * as React from "react";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { UrlAdminResponse, UrlDomain, UrlDrilldownResponse, UrlsByDateResponse } from "@/lib/types/activity";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DomainList, DomainListSkeleton, Skel } from "./UrlShared";

dayjs.extend(advancedFormat);

export interface SheetCtx {
  employee: { id: string; name: string };
  view: "day" | "week" | "month" | "year";
  dateISO: string;
  dateEndISO?: string;
}

/** Filter + merge domains by a search text (client-side, like the live sheet). */
function filterDomains(domains: UrlDomain[], q: string) {
  if (!q) return domains;
  const s = q.toLowerCase();
  return domains
    .map((d) => ({ ...d, urls: d.urls.filter((u) => d.domain.toLowerCase().includes(s) || u.url.toLowerCase().includes(s) || u.project.toLowerCase().includes(s) || u.task.toLowerCase().includes(s)) }))
    .filter((d) => d.urls.length)
    .map((d) => ({ ...d, link_count: d.urls.length }));
}

function DrilldownDay({ date, urlCount, userId, expanded, onToggle, search }: { date: string; urlCount: number; userId: string; expanded: boolean; onToggle: () => void; search: string }) {
  const { organizationId } = useSession();
  const { data, isLoading } = useApiQuery<UrlsByDateResponse>({
    endpoint: `/activity/urls/${organizationId}/view_by_date?start_date=${date}&end_date=${date}&user_id=${userId}`,
    queryKey: ["my-activity-urls-by-date", String(organizationId), date, userId],
    enabled: expanded && !!organizationId,
  });
  return (
    <div className="bg-secondary-surface rounded-lg border border-layout-subtle shadow-xs overflow-hidden" data-testid="drilldown-day">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary-surface/70 transition-colors cursor-pointer">
        <ChevronRight className={cn("size-4 text-muted-foreground shrink-0 transition-transform duration-200", expanded && "rotate-90")} />
        <span className="text-sm text-foreground">
          Date: <span className="font-bold">{dayjs(date).format("MMMM Do")}</span>
        </span>
        <span className="ml-auto text-sm text-muted-foreground">
          URL Link: <span className="font-semibold text-muted-foreground">{urlCount} Links</span>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-layout-subtle overflow-x-auto">{isLoading ? <DomainListSkeleton /> : <DomainList domains={filterDomains(data?.days?.[0]?.domains ?? [], search)} variant="admin" />}</div>
      )}
    </div>
  );
}

/** "Employee URL Management" right sheet (opened from an active grid cell). */
export function UrlSheet({ ctx, onClose }: { ctx: SheetCtx | null; onClose: () => void }) {
  const { organizationId } = useSession();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(0);
  const byDay = ctx?.view === "day" || ctx?.view === "week";
  const date = ctx?.dateISO ?? "";
  const offset = 20 * page;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  React.useEffect(() => {
    setSearch("");
    setOpen(new Set());
    setPage(0);
  }, [ctx]);

  const adminQs = new URLSearchParams({ start_date: date, end_date: date });
  if (ctx) adminQs.set("user_id", ctx.employee.id);
  if (debounced) adminQs.set("search", debounced);
  adminQs.set("limit", "20");
  adminQs.set("offset", String(offset));
  const admin = useApiQuery<UrlAdminResponse>({
    endpoint: `/activity/urls/${organizationId}/admin?${adminQs.toString()}`,
    queryKey: ["ACTIVITY-URLS-ADMIN", organizationId, date, date, ctx?.employee.id, debounced || null, 20, offset],
    enabled: !!ctx && byDay && !!organizationId,
  });
  const drillQs = new URLSearchParams({ date, user_id: ctx?.employee.id ?? "" });
  if (ctx?.dateEndISO) drillQs.set("date_end", ctx.dateEndISO);
  if (debounced) drillQs.set("search", debounced);
  drillQs.set("group_by_day", "true");
  drillQs.set("limit", "20");
  drillQs.set("offset", String(offset));
  const drill = useApiQuery<UrlDrilldownResponse>({
    endpoint: `/activity/urls/${organizationId}/drilldown?${drillQs.toString()}`,
    queryKey: ["ACTIVITY-URLS-DRILLDOWN", organizationId, ctx?.employee.id, date, ctx?.dateEndISO ?? null, debounced || null, true, 20, offset],
    enabled: !!ctx && !byDay && !!organizationId && !!date,
  });

  const domains: UrlDomain[] = (admin.data?.days ?? []).flatMap((d) => d.domains);
  const label = !ctx ? "" : byDay || !ctx.dateEndISO ? dayjs(ctx.dateISO).format("MMM D, YYYY") : `${dayjs(ctx.dateISO).format("MMM D, YYYY")} – ${dayjs(ctx.dateEndISO).format("MMM D, YYYY")}`;
  const totalPages = byDay ? (admin.data?.pagination.total_pages ?? 1) : (drill.data?.pagination.total_pages ?? 1);

  return (
    <Sheet open={!!ctx} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="bg-popover/80 backdrop-blur-xl sm:max-w-5xl w-full p-0 gap-0 flex flex-col overflow-hidden font-karla" data-testid="url-sheet">
        {ctx && (
          <>
            <SheetHeader className="p-4 border-b border-layout-subtle shrink-0 gap-3">
              <SheetTitle className="text-lg font-bold text-foreground">Employee URL Management</SheetTitle>
              <SheetDescription className="sr-only">Review and manage the URLs visited by this employee.</SheetDescription>
              <div className="flex items-end justify-between gap-6 pr-8">
                <div className="flex flex-col gap-1 w-72">
                  <label className="text-xs font-medium text-muted-foreground">Employee name</label>
                  <div className="h-9 px-3 flex items-center border border-layout-subtle rounded-lg bg-muted text-sm text-foreground" data-testid="sheet-employee">
                    {ctx.employee.name}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <div className="h-9 px-3 flex items-center border border-layout-subtle rounded-lg bg-muted text-sm text-foreground" data-testid="sheet-date">
                    {label}
                  </div>
                </div>
              </div>
            </SheetHeader>
            <div className="px-6 py-3 border-b border-layout-subtle shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  data-testid="sheet-search"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="w-full h-9 pl-8 pr-3 border border-layout-subtle rounded-lg text-sm text-muted-foreground placeholder:text-icon focus:outline-none focus:border-primary bg-background/60"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {byDay ? (
                admin.isLoading ? (
                  <DomainListSkeleton />
                ) : (
                  <DomainList domains={domains} variant="admin" />
                )
              ) : drill.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-secondary-surface rounded-lg border border-layout-subtle shadow-xs overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Skel className="h-4 w-4 rounded" />
                        <Skel className="h-4 w-32" />
                        <Skel className="h-4 w-24 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {(drill.data?.days ?? []).length === 0 ? (
                    <div className="py-12 text-center text-sm text-icon">No URL data for this period.</div>
                  ) : (
                    drill.data!.days.map((d) => (
                      <DrilldownDay
                        key={d.date}
                        date={d.date}
                        urlCount={d.url_count}
                        userId={ctx.employee.id}
                        search={search}
                        expanded={open.has(d.date)}
                        onToggle={() =>
                          setOpen((s) => {
                            const n = new Set(s);
                            if (n.has(d.date)) n.delete(d.date);
                            else n.add(d.date);
                            return n;
                          })
                        }
                      />
                    ))
                  )}
                </div>
              )}
            </div>
            {totalPages > 1 && ctx.view !== "month" && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-layout-subtle shrink-0">
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="size-8 flex items-center justify-center rounded-md border border-layout-subtle text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="size-8 flex items-center justify-center rounded-md border border-layout-subtle text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
