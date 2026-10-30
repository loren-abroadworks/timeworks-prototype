"use client";

import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Accordion } from "radix-ui";
import { ChevronDown, Clock, FileSpreadsheet, Images, Search } from "lucide-react";
import { apiGet, useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import { downloadFile, toCsv } from "@/lib/download";
import type { MyUrlsResponse, UrlsByDateResponse } from "@/lib/types/activity";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/filters/ActionMenu";
import { RangeNavigator } from "@/components/filters/DateControls";
import { toast } from "@/components/filters/toast";
import { Pagination } from "./Pagination";
import { DomainList, DomainListSkeleton, Skel, domainCsvRows } from "./UrlShared";

/** Search box with 400 ms debounce (live DebouncedSearch). */
export function DebouncedSearch({ value, onChange, placeholder, className, testId }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string; testId?: string }) {
  const [text, setText] = React.useState(value);
  const first = React.useRef(true);
  React.useEffect(() => setText(value), [value]);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => text !== value && onChange(text), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="relative w-full sm:w-auto">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <input
        data-slot="input"
        data-testid={testId}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={cn(
          "placeholder:text-muted-foreground dark:bg-input/30 flex min-w-0 px-3 py-1 outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] pl-8 h-9 text-sm bg-secondary-surface border border-ui-border shadow-xs rounded-lg",
          className,
        )}
      />
    </div>
  );
}

function DayRow({ day }: { day: MyUrlsResponse["days"][number] }) {
  const { organizationId, userId, user } = useSession();
  const [open, setOpen] = React.useState("");
  const expanded = open === day.date;
  const { data, isLoading } = useApiQuery<UrlsByDateResponse>({
    endpoint: `/activity/urls/${organizationId}/view_by_date?start_date=${day.date}&end_date=${day.date}&user_id=${userId}`,
    queryKey: ["my-activity-urls-by-date", String(organizationId), day.date, userId],
    enabled: !!organizationId && !!userId && expanded,
  });
  const domains = data?.days?.[0]?.domains ?? [];
  const shots = `/organizations/${organizationId}/activities/screenshots?date=${day.date}&user_id=${userId}&user_name=${encodeURIComponent(user?.full_name ?? "")}`;
  return (
    <Accordion.Root type="single" collapsible value={open} onValueChange={setOpen}>
      <Accordion.Item value={day.date} className="rounded-lg border border-layout-subtle overflow-hidden group/row" data-testid="url-day">
        <Accordion.Header className="flex">
          <Accordion.Trigger asChild>
            <div
              role="button"
              tabIndex={0}
              className="flex flex-1 flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-secondary-surface hover:bg-muted/50 hover:no-underline transition-colors cursor-pointer"
              data-testid="url-day-trigger"
            >
              <div className="flex gap-2 items-center">
                <ChevronDown className="size-4 text-muted-foreground shrink-0 transition-transform duration-200 -rotate-90 group-data-[state=open]/row:rotate-0" />
                <span className="text-sm text-foreground">
                  Date: <span className="font-bold">{day.date_formatted}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border border-layout-subtle rounded-full px-2.5 py-1">
                  <Clock className="size-3 shrink-0" />
                  {day.total_time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={shots}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium border border-ui-border bg-secondary-surface text-primary-text shadow-xs hover:bg-muted text-xs h-7 px-2.5 rounded-sm"
                >
                  <Images className="size-3.5" />
                  View Screenshots
                </Link>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-primary text-primary-foreground font-semibold min-w-20 h-7 justify-center">{day.url_count} Links</span>
              </div>
            </div>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="pb-0 border-t border-layout-subtle overflow-x-auto">
          {isLoading ? (
            <DomainListSkeleton />
          ) : domains.length ? (
            <DomainList domains={domains} variant="my" />
          ) : (
            <div className="px-5 py-4 text-sm text-muted-foreground">No URL details found for this date.</div>
          )}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}

/** Activity › URLs › My URLs (/organizations/{org}/activities/urls). */
export function MyUrlsPage() {
  const { get, update } = useQueryParams();
  const { organizationId, userId, user_time_zone } = useSession();
  const start = get("start_date") || dayjs().subtract(6, "day").format("YYYY-MM-DD");
  const end = get("end_date") || dayjs().format("YYYY-MM-DD");
  const search = get("search") || "";
  const perPage = Number(get("perPage") || 20);
  const page = Number(get("page") || 1);
  const offset = (page - 1) * perPage;
  const tz = user_time_zone || "America/New_York";
  const qs = new URLSearchParams({ start_date: start, end_date: end, timezone: tz, limit: String(perPage), offset: String(offset) });
  if (search) qs.set("search", search);
  const { data, isLoading } = useApiQuery<MyUrlsResponse>({
    endpoint: `/activity/urls/${organizationId}/me?${qs.toString()}`,
    queryKey: ["my-activity-urls", String(organizationId), start, end, tz, search, perPage, offset],
    enabled: !!organizationId,
  });
  const days = data?.days ?? [];

  const exportExcel = async () => {
    try {
      const res = await apiGet<UrlsByDateResponse>(`/activity/urls/${organizationId}/view_by_date?start_date=${start}&end_date=${end}&user_id=${userId}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      const rows = [["Date", "Domain", "URL", "Project", "Task", "Time Spent"], ...res.days.flatMap((d) => domainCsvRows(d.date, d.domains))];
      downloadFile(`url-activity-${start}-${end}.csv`, toCsv(rows));
    } catch {
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="font-karla pb-6 pt-2" data-testid="my-urls-page">
      <div className="space-y-6 font-karla">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Filters</span>
            <div className="flex items-center gap-2">
              <DebouncedSearch value={search} onChange={(v) => update({ search: v || null, page: "1" })} placeholder="Search URL or title…" className="w-60 max-w-80 min-w-full" testId="url-search" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RangeNavigator start={start} end={end} step={7} onChange={(s, e) => update({ start_date: s, end_date: e, page: "1" })} />
            <ActionMenu
              label="Actions"
              testId="urls-actions"
              items={[{ label: "Export as Excel", tone: "blue", icon: <FileSpreadsheet className="text-blue-500" size={16} />, onSelect: exportExcel, testId: "export-excel" }]}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[true, false, false, true, false].map((open, i) => (
              <div key={i} className="bg-secondary-surface rounded-lg border border-layout-subtle shadow-xs overflow-hidden">
                <div className={cn("flex items-center justify-between px-5 py-3.5 bg-secondary-surface", open && "border-b border-layout-subtle")}>
                  <div className="flex items-center gap-3">
                    <Skel className="size-4 rounded" />
                    <Skel className="h-4 w-44" />
                    <Skel className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skel className="h-7 w-32 rounded-sm" />
                    <Skel className="h-7 w-20 rounded-full" />
                  </div>
                </div>
                {open && <DomainListSkeleton />}
              </div>
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground" data-testid="urls-empty">
            No URL activity found for the selected period.
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((d) => (
              <DayRow key={d.date} day={d} />
            ))}
          </div>
        )}
        <Pagination total={data?.pagination.total_days ?? 0} />
      </div>
    </div>
  );
}
