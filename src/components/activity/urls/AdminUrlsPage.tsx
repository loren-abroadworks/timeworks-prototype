"use client";

import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, File, FileSpreadsheet, Send } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import { downloadFile, toCsv } from "@/lib/download";
import type { UrlGridResponse, UrlGridSlot } from "@/lib/types/activity";
import { cn } from "@/lib/utils";
import { CLIENTS, TEAMS } from "@/mock/seed-activity";
import { ActionMenu } from "@/components/filters/ActionMenu";
import { FiltersPopover } from "@/components/filters/FiltersPopover";
import { OptionChip, ProjectChip } from "@/components/filters/OptionChip";
import { RangeNavigator, SingleDatePicker } from "@/components/filters/DateControls";
import { ICON_NAV_BUTTON } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DebouncedSearch } from "./MyUrlsPage";
import { Pagination } from "./Pagination";
import { UrlSheet, type SheetCtx } from "./UrlSheet";
import { Skel, UrlTabs } from "./UrlShared";

type View = "day" | "week" | "month" | "year";
type Employee = UrlGridResponse["employees"][number];

const today = () => dayjs().format("YYYY-MM-DD");
const defaultStart: Record<View, () => string> = {
  day: today,
  week: () => dayjs().subtract(6, "day").format("YYYY-MM-DD"),
  month: () => dayjs().subtract(29, "day").format("YYYY-MM-DD"),
  year: () => dayjs().subtract(1, "year").format("YYYY-MM-DD"),
};

/** Alerts legend in the header (clicking a legend item filters rows by alert status, `alerts_filter` param). */
function HeaderSlot() {
  const { get, update } = useQueryParams();
  const filter = get("alerts_filter") || "all";
  const toggle = (v: "alerts" | "no_alerts") => update({ alerts_filter: filter === v ? null : v, page: "1" });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UrlTabs active="all" />
      <div className="hidden sm:flex items-center gap-3 px-1">
        <button type="button" role="checkbox" aria-checked={filter === "alerts"} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggle("alerts")} data-testid="legend-alerts">
          <span className={cn("size-4 border rounded border-negative bg-negative/10 shrink-0", filter === "alerts" && "bg-negative")} />
          <span className="text-xs text-muted-foreground">Alerts</span>
        </button>
        <button type="button" role="checkbox" aria-checked={filter === "no_alerts"} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggle("no_alerts")} data-testid="legend-no-alerts">
          <span className={cn("size-4 border rounded bg-primary-highlight border-primary shrink-0", filter === "no_alerts" && "bg-primary")} />
          <span className="text-sm text-muted-foreground">No Alerts</span>
        </button>
      </div>
    </div>
  );
}
export { HeaderSlot as AdminUrlsHeaderSlot };

const HEAD_MEMBER =
  "text-left py-2 px-4 font-semibold text-foreground sticky left-0 min-w-32 sm:min-w-55 max-w-72 border-r border-layout-subtle z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";

function MemberHead() {
  return (
    <TableHead className={HEAD_MEMBER}>
      <div aria-hidden className="absolute inset-0 bg-secondary-surface backdrop-blur-md" />
      <span className="relative text-sm">Member</span>
    </TableHead>
  );
}

function MemberCell({ name }: { name: string }) {
  return (
    <TableCell className="py-2 px-4 sticky left-0 border-r border-layout-subtle w-32 sm:w-48 max-w-60 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
      <div aria-hidden className="absolute inset-0 bg-secondary-surface/50 backdrop-blur-md" />
      <div className="relative flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{name.charAt(0).toUpperCase()}</div>
        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
      </div>
    </TableCell>
  );
}

/** Cell chip; alert cells get the red "Alerts" legend style (replica guess). */
function chipCls(alert: boolean) {
  return alert ? "border-negative bg-negative/10" : "border-primary bg-primary-highlight";
}
function Links({ n, alert }: { n: number; alert: boolean }) {
  return (
    <span className="truncate font-medium text-muted-foreground">
      URL - <strong className={cn("font-semibold", alert ? "text-negative" : "text-primary")}>{n} Links</strong>
    </span>
  );
}

function WeekCell({ slot }: { slot?: UrlGridSlot }) {
  if (!slot || slot.status !== "active") return <div className="h-7" />;
  return (
    <div className={cn("w-full border shadow-md rounded p-1.5 text-[11px] min-w-0", chipCls(slot.alertCount > 0))} data-testid="grid-cell">
      <Links n={slot.urlCount} alert={slot.alertCount > 0} />
    </div>
  );
}

function DayGrid({ employees, open }: { employees: Employee[]; open: (e: Employee, key: number) => void }) {
  const hours = Array.from({ length: 24 }, (_, h) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`));
  return (
    <div className="overflow-hidden">
      <Table className="relative border-collapse w-full" style={{ minWidth: 1948 }}>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="border-b border-layout-subtle bg-secondary-surface">
            <MemberHead />
            {hours.map((l) => (
              <TableHead key={l} className="py-2 px-1 font-medium text-muted-foreground text-center" style={{ width: 72, minWidth: 72 }}>
                <span className="text-xs">{l}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => {
            // Merge consecutive active hours with the same alert state into one block.
            const blocks: { start: number; end: number; urls: number; alerts: number }[] = [];
            for (let h = 0; h < 24; ) {
              const s = e.slots[h];
              if (!s || s.status !== "active") {
                h++;
                continue;
              }
              const alert = s.alertCount > 0;
              let n = h + 1;
              let urls = s.urlCount;
              let alerts = s.alertCount;
              while (n < 24 && e.slots[n]?.status === "active" && e.slots[n].alertCount > 0 === alert) {
                urls += e.slots[n].urlCount;
                alerts += e.slots[n].alertCount;
                n++;
              }
              blocks.push({ start: h, end: n, urls, alerts });
              h = n;
            }
            return (
              <TableRow key={e.employee_id} className="border-b border-layout-subtle hover:bg-secondary-surface/50 transition-colors">
                <MemberCell name={e.employee_name} />
                <TableCell colSpan={24} className="p-0 border-r border-layout-subtle" style={{ height: 52, position: "relative" }}>
                  {blocks.map((b) => (
                    <div
                      key={b.start}
                      data-testid="grid-cell"
                      onClick={() => open(e, b.start)}
                      className={cn("absolute top-2.5 bottom-2.5 rounded border shadow-md flex items-center px-1.5 overflow-hidden cursor-pointer text-[11px]", chipCls(b.alerts > 0))}
                      style={{ left: 72 * b.start + 4, width: (b.end - b.start) * 72 - 8 }}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">
                        URL - <strong className={cn("font-semibold", b.alerts > 0 ? "text-negative" : "text-primary")}>{b.urls} Links</strong>
                      </span>
                    </div>
                  ))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function WeekGrid({ employees, buckets, open }: { employees: Employee[]; buckets: string[]; open: (e: Employee, key: number) => void }) {
  return (
    <div className="overflow-hidden">
      <Table className="relative border-collapse w-full">
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="border-b border-layout-subtle bg-secondary-surface">
            <MemberHead />
            {buckets.map((b) => (
              <TableHead key={b} className="py-2 px-2 font-semibold text-foreground min-w-40 border-r border-layout-subtle">
                <div className="flex gap-2 items-center justify-center">
                  <h6 className="text-2xl font-bold">{dayjs(b).format("D")}</h6>
                  <span className="text-md text-muted-foreground uppercase">{dayjs(b).format("ddd")}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.employee_id} className="border-b border-layout-subtle hover:bg-secondary-surface/50 transition-colors">
              <MemberCell name={e.employee_name} />
              {buckets.map((b, i) => {
                const s = e.slots[i];
                return (
                  <TableCell key={b} className={cn("py-2 px-2.5 border-r border-layout-subtle min-w-40", s?.status === "active" && "cursor-pointer")} onClick={() => s?.status === "active" && open(e, i)}>
                    <WeekCell slot={s} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthGrid({ employees, buckets, open }: { employees: Employee[]; buckets: string[]; open: (e: Employee, first: number, last: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table className="relative border-collapse w-full" style={{ minWidth: 220 + 90 * buckets.length }}>
        <TableHeader className="sticky top-0 z-20 border-b border-ui-border">
          <TableRow className="border-b border-layout-subtle">
            <MemberHead />
            {buckets.map((b) => (
              <TableHead key={b} className="py-2 px-1 font-semibold text-foreground border-r border-layout-subtle text-center" style={{ minWidth: 90 }}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold leading-tight">{dayjs(b).format("D")}</span>
                  <span className="text-md text-icon uppercase tracking-wide">{dayjs(b).format("ddd")}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => {
            const spans: { first: number; last: number; active: boolean; urls: number; alerts: number }[] = [];
            for (let i = 0; i < buckets.length; ) {
              if (e.slots[i]?.status !== "active") {
                spans.push({ first: i, last: i, active: false, urls: 0, alerts: 0 });
                i++;
                continue;
              }
              let j = i;
              let urls = 0;
              let alerts = 0;
              while (j < buckets.length && e.slots[j]?.status === "active") {
                urls += e.slots[j].urlCount;
                alerts += e.slots[j].alertCount;
                j++;
              }
              spans.push({ first: i, last: j - 1, active: true, urls, alerts });
              i = j;
            }
            return (
              <TableRow key={e.employee_id} className="border-b border-layout-subtle hover:bg-secondary-surface/50 transition-colors">
                <MemberCell name={e.employee_name} />
                {spans.map((s) => {
                  const cols = s.last - s.first + 1;
                  return (
                    <TableCell
                      key={s.first}
                      colSpan={cols}
                      className={cn("py-2 px-1.5 border-r border-layout-subtle", s.active && "cursor-pointer")}
                      style={{ minWidth: 90 * cols }}
                      onClick={() => s.active && open(e, s.first, s.last)}
                    >
                      {s.active ? (
                        <div className={cn("w-full border shadow-md rounded px-1.5 py-2 text-[11px] min-w-0", chipCls(s.alerts > 0))} data-testid="grid-cell">
                          <span className="truncate font-medium text-muted-foreground">
                            URL - <strong className={cn("font-semibold", s.alerts > 0 ? "text-negative" : "text-primary")}>{s.urls} Links</strong>
                            {cols > 1 && <span className="text-icon ml-1">· {cols}d</span>}
                          </span>
                        </div>
                      ) : (
                        <div className="h-7" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function YearGrid({ employees, buckets, labels, open }: { employees: Employee[]; buckets: string[]; labels: string[]; open: (e: Employee, key: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table className="relative border-collapse w-full" style={{ minWidth: 220 + 75 * buckets.length }}>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="border-b border-layout-subtle bg-secondary-surface">
            <MemberHead />
            {buckets.map((b, i) => (
              <TableHead key={b} className="py-2.5 px-2 font-semibold text-foreground border-r border-layout-subtle text-center" style={{ minWidth: 75 }}>
                <span className="text-xs">{labels[i] ?? b}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.employee_id} className="border-b border-layout-subtle hover:bg-secondary-surface/50 transition-colors">
              <MemberCell name={e.employee_name} />
              {buckets.map((b, i) => {
                const s = e.slots[i];
                return (
                  <TableCell key={b} className={cn("p-2 border-r border-layout-subtle", s?.status === "active" && "cursor-pointer")} style={{ minWidth: 75 }} onClick={() => s?.status === "active" && open(e, i)}>
                    {!s || s.status === "empty" ? (
                      <div className="h-16" />
                    ) : s.status === "upcoming" ? (
                      <div className="w-full border border-ui-border rounded-sm p-2 bg-muted text-[11px] flex flex-col justify-between" style={{ height: 56 }}>
                        <div className="font-semibold text-muted-foreground">{s.urlCount} Links</div>
                        <div className="flex gap-0.5 flex-wrap items-center">
                          <span className="h-2 w-2 rounded-full bg-ui-border inline-block" />
                          <span className="font-medium text-muted-foreground">Upcoming</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        title={`URL - ${s.urlCount} Links`}
                        data-testid="grid-cell"
                        className={cn("w-full border shadow-md rounded-sm p-2 text-[11px] cursor-pointer transition-shadow", chipCls(s.alertCount > 0))}
                        style={{ height: 56 }}
                      >
                        <div className="font-semibold text-foreground">{s.urlCount} Links</div>
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skel className="h-7 w-7 rounded-full shrink-0" />
          <Skel className="h-4 w-28" />
          <Skel className="h-8 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Activity › URLs › All URLs — URL management grid (/organizations/{org}/activities/urls/admin_view). */
export function AdminUrlsPage() {
  const { get, update } = useQueryParams();
  const { organizationId } = useSession();
  const view = (["day", "week", "month", "year"].includes(get("view") ?? "") ? get("view") : "week") as View;
  const start = get("start_date") || defaultStart[view]();
  const end = get("end_date") || today();
  const searchEmployee = get("search_employee") || "";
  const clientIds = (get("client_ids") || "").split(",").filter(Boolean);
  const teamIds = (get("team_ids") || "").split(",").filter(Boolean);
  const projectIds = (get("project_ids") || "").split(",").filter(Boolean);
  const alertsFilter = get("alerts_filter") || "all";
  const page = Number(get("page") || 1);
  const perPage = Number(get("perPage") || 20);
  const offset = (page - 1) * perPage;
  const [shown, setShown] = React.useState({ clientIds: clientIds.length > 0, teamIds: teamIds.length > 0, projectIds: projectIds.length > 0 });
  const [sheet, setSheet] = React.useState<SheetCtx | null>(null);

  const qs = new URLSearchParams({ start_date: start, end_date: end, mode: view, limit: String(perPage), offset: String(offset) });
  if (searchEmployee) qs.set("search_employee", searchEmployee);
  clientIds.forEach((c) => qs.append("client_id", c));
  teamIds.forEach((t) => qs.append("team_id", t));
  projectIds.forEach((p) => qs.append("project_id", p));
  const { data, isLoading } = useApiQuery<UrlGridResponse>({
    endpoint: `/activity/urls/${organizationId}/grid?${qs.toString()}`,
    queryKey: ["ACTIVITY-URLS-GRID", organizationId, start, end, view, perPage, offset, searchEmployee || null, clientIds.join() || null, teamIds.join() || null, projectIds.join() || null],
    enabled: !!organizationId,
  });
  const grid = data ?? { total: 0, employees: [], buckets: [], bucketLabels: [] };
  const employees = grid.employees.filter((e) => {
    if (alertsFilter === "all") return true;
    const has = Object.values(e.slots).some((s) => s.status === "active" && s.alertCount > 0);
    return alertsFilter === "alerts" ? has : !has;
  });

  const step = view === "day" ? 1 : view === "week" ? 7 : 30;
  const pickerDate = view === "week" || view === "month" ? end : start;
  const setDate = (d: string) => {
    const back = view === "week" ? 6 : view === "month" ? 29 : 0;
    update({ start_date: dayjs(d).subtract(back, "day").format("YYYY-MM-DD"), end_date: d, page: "1" });
  };
  const shift = (n: number) => {
    const d = dayjs(pickerDate).add(n, "day");
    setDate((d.isAfter(dayjs(), "day") ? dayjs() : d).format("YYYY-MM-DD"));
  };

  const exportExcel = () => {
    const rows = [["Member", ...grid.buckets.map((b, i) => (view === "year" ? (grid.bucketLabels[i] ?? b) : b))], ...employees.map((e) => [e.employee_name, ...grid.buckets.map((_, i) => e.slots[i]?.urlCount ?? 0)])];
    downloadFile(`url-management-${view}-${start}-${end}.csv`, toCsv(rows));
  };

  const toggle = (key: keyof typeof shown) => {
    if (shown[key]) update({ [key === "clientIds" ? "client_ids" : key === "teamIds" ? "team_ids" : "project_ids"]: null, page: "1" });
    setShown((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="font-karla pb-6 pt-2" data-testid="admin-urls-page">
      <div className="space-y-4 font-karla">
        <div className="flex items-center gap-2 flex-wrap py-2">
          <div className="flex flex-wrap items-center gap-2  flex-1">
            <FiltersPopover
              width="15rem"
              options={[
                { key: "clientIds", label: "Clients" },
                { key: "teamIds", label: "Teams" },
                { key: "projectIds", label: "Projects" },
              ]}
              values={shown}
              onToggle={(k) => toggle(k as keyof typeof shown)}
              onClear={() => {
                update({ client_ids: null, team_ids: null, project_ids: null, page: "1" });
                setShown({ clientIds: false, teamIds: false, projectIds: false });
              }}
            />
            <DebouncedSearch value={searchEmployee} onChange={(v) => update({ search_employee: v || null, page: "1" })} placeholder="Search employee..." className="w-full sm:w-60" testId="employee-search" />
            {shown.clientIds && (
              <OptionChip
                label="All Clients"
                title="Filter by Client"
                searchPlaceholder="Search client"
                multiple
                options={CLIENTS.map((c) => ({ value: String(c.id), label: c.name }))}
                value={clientIds}
                onChange={(v) => update({ client_ids: v.join(",") || null, page: "1" })}
                testId="client-chip"
              />
            )}
            {shown.teamIds && (
              <OptionChip
                label="All Teams"
                title="Filter by Team"
                searchPlaceholder="Search team"
                multiple
                options={TEAMS.map((t) => ({ value: String(t.id), label: t.name }))}
                value={teamIds}
                onChange={(v) => update({ team_ids: v.join(",") || null, page: "1" })}
                testId="team-chip"
              />
            )}
            {shown.projectIds && <ProjectChip multiple value={projectIds} onChange={(v) => update({ project_ids: v.join(",") || null, page: "1" })} />}
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
            <Tabs value={view} onValueChange={(v) => update({ view: v, start_date: defaultStart[v as View](), end_date: today(), page: "1" })}>
              <TabsList className="rounded-lg">
                {(["day", "week", "month", "year"] as const).map((v) => (
                  <TabsTrigger key={v} value={v} className="capitalize" data-testid={`view-${v}`}>
                    {v}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {view === "year" ? (
              <RangeNavigator start={start} end={end} step={365} onChange={(s, e) => update({ start_date: s, end_date: e, page: "1" })} />
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" data-slot="button" className={ICON_NAV_BUTTON} aria-label="Previous" data-testid="date-prev" onClick={() => shift(-step)}>
                  <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
                </button>
                <SingleDatePicker value={pickerDate} onChange={setDate} />
                <button type="button" data-slot="button" className={ICON_NAV_BUTTON} aria-label="Next" data-testid="date-next" disabled={pickerDate >= today()} onClick={() => shift(step)}>
                  <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
                </button>
              </div>
            )}
            <ActionMenu
              label="Actions"
              testId="urls-actions"
              items={[
                { label: "Export as Excel", tone: "blue", icon: <FileSpreadsheet className="text-blue-500" size={16} />, onSelect: exportExcel, testId: "export-excel" },
                { label: "Export as PDF", tone: "red", icon: <File className="text-red-600" size={16} />, onSelect: () => toast("PDF export is not available in the replica"), testId: "export-pdf" },
                { label: "Send Report", icon: <Send className="text-primary" size={16} />, onSelect: () => toast.success("Report sent (replica — nothing is emailed)"), testId: "send-report" },
              ]}
            />
          </div>
        </div>
        <div className="relative rounded-xl border border-layout-subtle overflow-x-auto bg-secondary-surface shadow-none" data-testid="url-grid">
          {isLoading ? (
            <GridSkeleton />
          ) : employees.length === 0 ? (
            <div className="py-20 text-center text-sm text-icon">No data found.</div>
          ) : view === "day" ? (
            <DayGrid employees={employees} open={(e) => setSheet({ employee: { id: e.employee_id, name: e.employee_name }, view: "day", dateISO: start })} />
          ) : view === "week" ? (
            <WeekGrid employees={employees} buckets={grid.buckets} open={(e, i) => setSheet({ employee: { id: e.employee_id, name: e.employee_name }, view: "week", dateISO: grid.buckets[i] })} />
          ) : view === "month" ? (
            <MonthGrid
              employees={employees}
              buckets={grid.buckets}
              open={(e, a, b) => setSheet({ employee: { id: e.employee_id, name: e.employee_name }, view: "month", dateISO: grid.buckets[a], dateEndISO: grid.buckets[b] })}
            />
          ) : (
            <YearGrid
              employees={employees}
              buckets={grid.buckets}
              labels={grid.bucketLabels}
              open={(e, i) => {
                const m = dayjs(`${grid.buckets[i]}-01`);
                setSheet({ employee: { id: e.employee_id, name: e.employee_name }, view: "year", dateISO: m.format("YYYY-MM-DD"), dateEndISO: m.endOf("month").format("YYYY-MM-DD") });
              }}
            />
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Pagination total={grid.total} />
        </div>
      </div>
      <UrlSheet ctx={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
