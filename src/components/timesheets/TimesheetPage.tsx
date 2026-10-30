"use client";

import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { Command } from "cmdk";
import { DropdownMenu, Select, Tooltip } from "radix-ui";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  EllipsisVertical,
  ExternalLink,
  File,
  FileSpreadsheet,
  FolderOpen,
  Info,
  Lock,
  Plus,
  Search,
  SquarePen,
  Trash2,
  TreePalm,
  X,
} from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import { downloadFile } from "@/lib/download";
import type { TimesheetEntry, UserTimesheetResponse } from "@/lib/types/timesheets";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FiltersPopover, type SavedFilterRow } from "@/components/filters/FiltersPopover";
import { MemberSelect } from "@/components/filters/MemberSelect";
import { ProjectChip } from "@/components/filters/OptionChip";
import { browserTimezone, TimezoneSelect } from "@/components/filters/TimezoneSelect";
import { RangeNavigator } from "@/components/filters/DateControls";
import { ActionMenu } from "@/components/filters/ActionMenu";
import { THEMED_BUTTON } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";
import { API_BASE } from "@/lib/api-client";
import { AddTimeDialog, BulkDeleteDialog, DeleteTimeDialog, EditTimeDialog, SplitTimeDialog, type AddTimeData } from "./dialogs";
import { BTN_SECONDARY } from "./fields";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/** Timesheets › View & Edit — port of chunk 2yh5g29-jee56.js (filter bar, member card, week table, day cards). */

const weekRange = () => ({ start: dayjs().subtract(6, "day").format("YYYY-MM-DD"), end: dayjs().format("YYYY-MM-DD") });

function useTsParams() {
  const { get, update } = useQueryParams();
  const { user, user_time_zone } = useSession();
  const w = weekRange();
  const page = Number(get("page") || "0");
  const perPage = Number(get("perPage") || "10");
  return {
    start: get("start_date") || w.start,
    end: get("end_date") || w.end,
    userId: get("user_id") || user?.user_id || "",
    userName: get("user_name") || user?.full_name || "",
    timezone: get("timezone") || browserTimezone() || user_time_zone || "America/New_York",
    page,
    perPage,
    offset: page > 0 ? (page - 1) * perPage : 0,
    projectId: get("project_id") || "",
    timeType: get("time_type") || "",
    activityLevel: get("activity_level") || "",
    update,
    get,
  };
}

/* ------------------------------------------------------------------ */
/* Toolbar chips (Time Type / Activity — timesheet variants)           */
/* ------------------------------------------------------------------ */

const TIME_TYPES = ["normal", "idle", "manual"];
const ACTIVITY: Record<string, string> = { Low: "Low (≤20%)", Medium: "Medium (>20% and <60%)", High: "High (≥60%)" };

function ParamChip({ param, label, title, placeholder, options, render, capitalize, testId }: { param: string; label: string; title: string; placeholder: string; options: string[]; render: (v: string) => string; capitalize?: boolean; testId: string }) {
  const { get, update } = useQueryParams();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const value = get(param);
  const list = options.filter((o) => render(o).toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger
        type="button"
        role="combobox"
        title={value ? render(value) : label}
        data-testid={testId}
        className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors", value ? "border-brand-blue/40 bg-primary-selected-hover text-primary-text" : "border-ui-border bg-secondary-surface text-foreground hover:bg-muted")}
      >
        <span>{label}</span>
        {value ? (
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground">1</span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                update({ [param]: null, page: "1" });
              }}
              className="-mr-1 flex size-5 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-brand-blue/20 hover:text-primary-text"
            >
              <X className="size-3.5" />
            </span>
          </span>
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        )}
      </PopoverTrigger>
      <PopoverContent style={{ width: 256 }} className="w-64 overflow-hidden rounded-2xl border border-ui-border p-0 shadow-xl" data-testid={`${testId}-popover`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-primary-text">{title}</h4>
          <button
            type="button"
            onClick={() => {
              update({ [param]: null });
              setOpen(false);
            }}
            className="rounded-full p-0.5 text-icon transition-colors hover:bg-muted hover:text-secondary-text"
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-ui-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-white">
            <Search className="size-4 shrink-0 text-icon" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-primary-text outline-none placeholder:text-icon" />
          </div>
        </div>
        <Command shouldFilter={false} className="bg-transparent">
          <Command.List className="max-h-72 px-2 pb-2" style={{ scrollBehavior: "auto" }}>
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-icon">No {label.toLowerCase()} found.</p>
            ) : (
              <Command.Group className="p-0">
                {list.map((o) => {
                  const on = value === o;
                  return (
                    <Command.Item
                      key={o}
                      value={o}
                      onSelect={() => {
                        update({ [param]: on ? null : o, page: "1" });
                        setOpen(false);
                      }}
                      className={cn(
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center text-sm outline-hidden select-none my-0.5 gap-3 rounded-md px-2.5 py-1.5",
                        capitalize && "capitalize",
                        on && "bg-brand-blue/10 font-medium",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-primary-text">{render(o)}</span>
                      {on && <Check className="ml-auto size-4 stroke-3 text-primary" />}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const FILTER_PARAM: Record<string, string> = { projectFilter: "project_id", timeType: "time_type", activityLevel: "activity_level" };

function Toolbar() {
  const p = useTsParams();
  const { user, organizationId, user_time_zone } = useSession();
  const [vis, setVis] = React.useState<Record<string, boolean>>({ projectFilter: !!p.projectId, timeType: !!p.timeType, activityLevel: !!p.activityLevel });
  const [addOpen, setAddOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const doExport = async (type: "excel" | "pdf") => {
    if (!organizationId || exporting) return;
    setExporting(true);
    try {
      const q = new URLSearchParams({ start_date: p.start, end_date: p.end, timezone_str: p.timezone, export_type: type });
      const res = await fetch(`${API_BASE}/reports/user-time-sheet/${organizationId}/${p.userId}?${q}`);
      if (!res.ok) throw new Error();
      // Replica: "Excel" is generated as CSV (opens in Excel); "PDF" is a simple generated PDF.
      downloadFile(`timesheet-${p.start}-to-${p.end}.${type === "excel" ? "csv" : "pdf"}`, await res.blob());
      toast.success("Timesheet exported successfully");
    } catch {
      toast.error("Failed to export timesheet");
    } finally {
      setExporting(false);
    }
  };

  const addData: AddTimeData = { date: dayjs().format("YYYY-MM-DD"), userId: p.userId, userName: p.userName, timezone: p.timezone, organizationId: organizationId ?? 0 };

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <FiltersPopover
          options={[
            { key: "projectFilter", label: "Project" },
            { key: "timeType", label: "Time Type" },
            { key: "activityLevel", label: "Activity Level" },
          ]}
          values={vis}
          width="15rem"
          pageKey="timesheet"
          onToggle={(k) => {
            if (vis[k]) p.update({ [FILTER_PARAM[k]]: null });
            setVis((v) => ({ ...v, [k]: !v[k] }));
          }}
          onClear={() => {
            const w = weekRange();
            p.update({ start_date: w.start, end_date: w.end, user_id: user?.user_id, user_name: user?.full_name, timezone: user_time_zone || browserTimezone(), project_id: null, time_type: null, activity_level: null });
            setVis({ projectFilter: false, timeType: false, activityLevel: false });
          }}
          getSnapshot={() => {
            const out: Record<string, string> = {};
            for (const k of ["start_date", "end_date", "user_id", "user_name", "timezone", "project_id", "time_type", "activity_level"]) {
              const v = p.get(k);
              if (v) out[k] = v;
            }
            return out;
          }}
          onApplySaved={(f: SavedFilterRow) => {
            const set: Record<string, string | null> = {};
            const nextVis = { ...vis };
            for (const [k, v] of Object.entries(f.filters)) {
              if (typeof v === "boolean") {
                if (k in nextVis) nextVis[k] = v;
                if (!v && FILTER_PARAM[k]) set[FILTER_PARAM[k]] = null;
              } else set[k] = v;
            }
            setVis(nextVis);
            p.update({ ...set, page: "1" });
          }}
        />
        <MemberSelect
          value={p.userId}
          onChange={(m) => p.update({ user_name: m.full_name, user_id: m.user_id, page: "1" })}
          onClear={() => p.update({ user_name: user?.full_name, user_id: user?.user_id, page: "1" })}
        />
        {vis.projectFilter && <ProjectChip userId={p.userId} value={p.projectId ? [p.projectId] : []} onChange={(v) => p.update({ project_id: v[0] ?? null, page: "1" })} />}
        {vis.timeType && <ParamChip param="time_type" label="Time Type" title="Filter by Time Type" placeholder="Search time type" options={TIME_TYPES} render={(v) => v} capitalize testId="time-type-chip" />}
        {vis.activityLevel && <ParamChip param="activity_level" label="Activity" title="Filter by Activity Level" placeholder="Search activity level" options={Object.keys(ACTIVITY)} render={(v) => ACTIVITY[v] ?? v} testId="activity-chip" />}
        <TimezoneSelect value={p.timezone} onChange={(tz) => p.update({ timezone: tz, page: "1" })} onClear={() => p.update({ timezone: null, page: "1" })} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <RangeNavigator start={p.start} end={p.end} step={1} onChange={(s, e) => p.update({ start_date: s, end_date: e, page: "1" })} />
        <ActionMenu
          label="Export"
          trigger="download"
          testId="export-menu"
          items={[
            { label: "Export as Excel", tone: "blue", icon: <FileSpreadsheet size={16} className="text-blue-500" />, onSelect: () => doExport("excel"), testId: "export-excel" },
            { label: "Export as PDF", tone: "red", icon: <File size={16} className="text-red-600" />, onSelect: () => doExport("pdf"), testId: "export-pdf" },
          ]}
        />
        <span className="contents">
          <button data-slot="button" type="button" className={THEMED_BUTTON} onClick={() => setAddOpen(true)} data-testid="header-add-time">
            <Plus />
            Add Time
          </button>
        </span>
        <AddTimeDialog open={addOpen} onOpenChange={setAddOpen} data={addData} disableDatePicker={false} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member card + stats                                                 */
/* ------------------------------------------------------------------ */

function Tip({ content, children, className = "rounded-md px-3 py-1.5 text-xs" }: { content: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={4}
          data-slot="tooltip-content"
          className={cn("z-50 w-fit text-balance bg-foreground text-accent animate-in fade-in-0 zoom-in-95 font-karla", className)}
        >
          {content}
          <Tooltip.Arrow className="fill-foreground" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function RefGroup({ label, items }: { label: string; items: { id: string | number; name: string }[] }) {
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{items.length > 1 ? `${label} (${items.length})` : label}</p>
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 truncate text-sm font-bold text-primary-text" title={first.name}>
          {first.name}
        </p>
        {rest.length > 0 && (
          <Tip content={<span className="flex flex-col gap-1">{rest.map((r) => <span key={r.id} className="break-words">{r.name}</span>)}</span>} className="rounded-md px-3 py-1.5 text-xs max-w-44">
            <span className="shrink-0 cursor-default rounded-full bg-muted-foreground/15 px-2 py-0.5 text-xs font-medium text-secondary-text">+{rest.length}</span>
          </Tip>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="group relative overflow-hidden bg-secondary-surface shadow-xs transition-shadow hover:shadow-sm border border-ui-border px-6 py-4 rounded-lg" data-testid="ts-stat">
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-center bg-gray-400" />
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="font-medium uppercase tracking-wider text-muted-foreground text-[11px]">{label}</span>
          <div className="font-bold text-primary-text truncate tabular-nums leading-tight text-2xl" data-testid="ts-stat-value">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-[minmax(0,5fr)_repeat(4,minmax(0,1.5fr))] 2xl:grid-cols-[minmax(0,6fr)_repeat(4,minmax(0,1.5fr))]";
const SPAN = "col-span-2 lg:col-span-4 xl:col-span-1";

function Summary({ data, loading }: { data?: UserTimesheetResponse; loading: boolean }) {
  const { organizationId } = useSession();
  if (loading || !data)
    return (
      <div className={GRID}>
        <div className={`${SPAN} flex items-center gap-3 rounded-lg border border-ui-border bg-secondary-surface px-6 py-4 shadow-xs`}>
          <div className="skeleton-shimmer size-12 shrink-0 rounded-full bg-primary/10 dark:bg-primary/15" />
          <div className="flex flex-col gap-2.5">
            <div className="skeleton-shimmer h-3 w-32 rounded bg-primary/10 dark:bg-primary/15" />
            <div className="skeleton-shimmer h-2.5 w-44 rounded bg-primary/10 dark:bg-primary/15" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-ui-border bg-secondary-surface px-6 py-4 shadow-xs">
            <div className="skeleton-shimmer h-3 w-24 rounded bg-primary/10 dark:bg-primary/15" />
            <div className="skeleton-shimmer mt-3 h-6 w-28 rounded bg-primary/10 dark:bg-primary/15" />
          </div>
        ))}
      </div>
    );
  const u = data.user;
  return (
    <div className={GRID} data-testid="ts-summary">
      <div className={cn("grid grid-cols-2 items-center gap-x-6 gap-y-4 overflow-hidden rounded-lg border border-ui-border bg-secondary-surface px-6 py-4 shadow-xs lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none", SPAN)}>
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          <span data-slot="avatar" data-size="lg" className="group/avatar relative flex overflow-hidden select-none rounded-full size-12 shrink-0">
            {u.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.profile_picture} alt={u.name} className="aspect-square size-full object-cover" />
            ) : (
              <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full text-sm bg-primary font-bold text-primary-foreground">
                {u.name.charAt(0)}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate font-bold text-primary-text" title={u.name} data-testid="ts-member-name">
                {u.name}
              </p>
              <Link target="_blank" aria-label={`Open ${u.name}'s profile`} className="shrink-0 text-muted-foreground hover:text-primary" href={`/organizations/${organizationId}/members/${u.user_id}`}>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
            <p className="truncate text-sm text-muted-foreground" title={u.email}>
              {u.email}
            </p>
            {u.start_date && <p className="truncate text-xs text-muted-foreground">Started on {dayjs(u.start_date).format("MMM D, YYYY")}</p>}
          </div>
        </div>
        <RefGroup label="Project" items={u.projects} />
        <RefGroup label="Team" items={u.teams} />
        <RefGroup label="Client" items={u.clients} />
        <RefGroup label="Manager" items={u.managers.map((m) => ({ id: m.user_id, name: m.name }))} />
      </div>
      <StatCard
        label={
          <span className="inline-flex items-center gap-1">
            Total Time Off
            <Tip content="Unpaid time off hours are not included in this total.">
              <button type="button" aria-label="About total time off" className="text-muted-foreground hover:text-primary-text">
                <Info className="size-3.5" />
              </button>
            </Tip>
          </span>
        }
        value={data.pto_time_spend || "—"}
      />
      <StatCard label="Total Time Worked" value={data.regular_total_spent || "—"} />
      <StatCard label="Total Time" value={data.user_total_spent || "—"} />
      <StatCard label="Avg Activity" value={data.user_average_activity || "—"} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Week summary                                                        */
/* ------------------------------------------------------------------ */

const STICKY_SHADOW_L = "shadow-[inset_-1px_0_0_0_var(--ui-border-color),inset_0_-1px_0_0_var(--ui-border-color),2px_0_5px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm";
const STICKY_SHADOW_R = "shadow-[inset_1px_0_0_0_var(--ui-border-color),inset_0_-1px_0_0_var(--ui-border-color)] md:shadow-[inset_1px_0_0_0_var(--ui-border-color),inset_0_-1px_0_0_var(--ui-border-color),-2px_0_5px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm";
const TH = "h-10 align-middle whitespace-nowrap";
const TD = "p-2 align-middle whitespace-nowrap";

function rangeLabel(dates: string[]) {
  const s = dayjs(dates[0]);
  const e = dayjs(dates[dates.length - 1]);
  if (!dates.length) return "";
  if (s.isSame(e, "day")) return s.format("MMM D, YYYY");
  if (s.isSame(e, "month")) return `${s.format("MMM D")} - ${e.format("D, YYYY")}`;
  if (s.isSame(e, "year")) return `${s.format("MMM D")} - ${e.format("MMM D, YYYY")}`;
  return `${s.format("MMM D, YYYY")} - ${e.format("MMM D, YYYY")}`;
}

function WeekBlock({ data, loading, children }: { data?: UserTimesheetResponse; loading: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const dates = Object.keys(data?.report ?? {}).sort();
  if (loading)
    return (
      <div className="rounded-xl border border-layout-subtle shadow-xs">
        <div className="flex items-center gap-3 bg-secondary-surface p-3 rounded-t-xl">
          <div className="skeleton-shimmer size-10 rounded-lg bg-primary/10 dark:bg-primary/15" />
          <div className="skeleton-shimmer h-4 w-40 rounded-full bg-primary/10 dark:bg-primary/15" />
        </div>
        <div className="space-y-4 border-t border-layout-subtle bg-muted/20 p-3">{children}</div>
      </div>
    );
  if (!data || dates.length === 0) return <>{children}</>;
  const offSecs = Object.values(data.report).reduce((s, d) => s + d.day_time_off_seconds, 0);
  return (
    <div className="rounded-xl border border-layout-subtle shadow-xs" data-testid="week-block">
      <div className="overflow-hidden rounded-t-xl">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid="week-toggle" className="flex w-full cursor-pointer items-center justify-between gap-4 bg-secondary-surface p-3 text-left transition-colors hover:bg-muted/40">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-selected text-link">
              <CalendarDays className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-primary-text">{rangeLabel(dates)}</span>
              <span className="text-xs text-secondary-text">
                {dates.length} {dates.length === 1 ? "day" : "days"} · 1 member
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <div className="flex flex-col gap-0.5 text-right">
              <h4 className="font-karla text-xs font-normal leading-4 text-secondary-text">Total Duration</h4>
              <p className="font-montserrat text-lg font-bold leading-6 tracking-[-0.1px] text-primary-text" data-testid="week-total">
                {data.user_total_spent || "—"}
              </p>
            </div>
            <ChevronUp className={cn("size-5 shrink-0 text-icon transition-transform duration-200", !open && "rotate-180")} />
          </div>
        </button>
        {open && (
          <div className="overflow-x-auto border-t border-layout-subtle">
            <div data-slot="table-container" className="relative w-full overflow-x-auto">
              <table data-slot="table" data-variant="default" className="group/table w-full caption-bottom text-sm relative" data-testid="week-table">
                <thead data-slot="table-header">
                  <tr data-slot="table-row" className="hover:bg-muted/50 transition-colors border-b border-ui-border bg-secondary-surface/50">
                    <th data-slot="table-head" className={cn(TH, "sticky left-0 z-20 w-50 min-w-50 border-r border-ui-border bg-secondary-surface px-4 py-3 text-left text-sm font-semibold text-primary-text", STICKY_SHADOW_L)}>
                      Member
                    </th>
                    {dates.map((d) => (
                      <th key={d} data-slot="table-head" className={cn(TH, "w-25 min-w-25 border-r border-ui-border px-2 py-3 text-center text-sm font-semibold text-primary-text")}>
                        <div className="flex flex-col items-center">
                          <span>{dayjs(d).format("MMM D")}</span>
                          <span className="text-xs font-normal text-secondary-text">{dayjs(d).format("ddd")}</span>
                        </div>
                      </th>
                    ))}
                    <th data-slot="table-head" className={cn(TH, "w-25 min-w-25 border-l border-ui-border bg-secondary-surface px-3 py-3 text-center text-sm font-semibold text-primary-text md:sticky md:right-25 md:z-20", STICKY_SHADOW_R)}>
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="size-4 shrink-0 text-primary" />
                        Total
                      </span>
                    </th>
                    <th data-slot="table-head" className={cn(TH, "w-25 min-w-25 border-l border-ui-border bg-secondary-surface px-3 py-3 text-center text-sm font-semibold text-primary-text md:sticky md:right-0 md:z-20", STICKY_SHADOW_R)}>
                      <span className="flex items-center justify-center gap-1">
                        <TreePalm className="size-4 shrink-0 text-link" />
                        Time Off
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
                  <tr data-slot="table-row" className="group border-b border-ui-border bg-secondary-surface/50">
                    <td data-slot="table-cell" className={cn(TD, "sticky left-0 z-20 w-50 min-w-50 border-r border-ui-border bg-secondary-surface/50 px-4 py-3 shadow-[inset_-1px_0_0_0_var(--ui-border-color),2px_0_5px_-2px_rgba(0,0,0,0.05)] backdrop-blur-sm")}>
                      <div className="flex items-center gap-2">
                        <span data-slot="avatar" data-size="sm" className="group/avatar relative flex shrink-0 overflow-hidden select-none rounded-full size-8">
                          <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {data.user.name.charAt(0)}
                          </span>
                        </span>
                        <span className="cursor-default truncate text-sm font-semibold text-primary-text">{data.user.name}</span>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const day = data.report[d];
                      const off = day.time_off ?? [];
                      return (
                        <td key={d} data-slot="table-cell" data-testid={`week-cell-${d}`} className={cn(TD, "w-25 min-w-25 border-r border-ui-border px-2 py-2 text-center align-middle", off.length > 0 && "bg-primary-selected inset-ring-1 inset-ring-primary")}>
                          <div className="flex flex-col items-stretch gap-1.5">
                            {day.total_user_duration_seconds ? (
                              <span className="text-center text-sm font-medium text-primary-text">{day.total_user_duration}</span>
                            ) : off.length === 0 ? (
                              <span className="text-center text-xs text-icon">--</span>
                            ) : null}
                            {off.map((t) => (
                              <span key={t.request_id} className="flex w-full min-w-0 cursor-default items-center justify-center gap-1.5 font-karla text-xs font-semibold leading-4 text-link">
                                <TreePalm className="size-4 shrink-0" />
                                <span className="truncate">Full Day · {t.duration}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                    <td data-slot="table-cell" className={cn(TD, "w-25 min-w-25 border-l border-ui-border bg-secondary-surface/50 px-3 py-3 text-center text-sm font-bold text-primary md:sticky md:right-25 md:z-20 shadow-[inset_1px_0_0_0_var(--ui-border-color)] backdrop-blur-sm")}>
                      {data.user_total_spent}
                    </td>
                    <td data-slot="table-cell" className={cn(TD, "w-25 min-w-25 border-l border-ui-border bg-secondary-surface/50 px-3 py-3 text-center text-sm font-bold text-link md:sticky md:right-0 md:z-20 shadow-[inset_1px_0_0_0_var(--ui-border-color)] backdrop-blur-sm")}>
                      {offSecs > 0 ? `${Math.floor(offSecs / 3600)}:${String(Math.floor((offSecs % 3600) / 60)).padStart(2, "0")}` : "--"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-4 border-t border-layout-subtle bg-muted/20 p-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day cards                                                           */
/* ------------------------------------------------------------------ */

const keyOf = (date: string, e: TimesheetEntry, i: number) => `${date}|${i}|${e.started_at}`;
const selectable = (e: TimesheetEntry) => !e.is_running && !e.is_locked;
const initials2 = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
const hms = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function DateBadge({ date }: { date: string }) {
  return (
    <div className="bg-primary font-montserrat text-primary-foreground flex flex-col size-12 items-center justify-center aspect-square rounded-lg border border-ui-border shadow-sm shrink-0">
      <div className="w-full text-center text-xs font-semibold uppercase leading-tight">{dayjs(date).format("MMM")}</div>
      <div className="w-full text-center text-[22px] font-bold leading-tight">{dayjs(date).format("DD")}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-right">
      <h4 className="font-karla text-xs font-normal leading-4 text-secondary-text">{label}</h4>
      <p className="font-montserrat text-lg font-bold leading-6 tracking-[-0.1px] text-primary-text" data-testid={`day-metric-${label.replace(/\s/g, "-").toLowerCase()}`}>
        {value}
      </p>
    </div>
  );
}

const secOfDay = (iso: string) => {
  const t = iso.slice(11, 19).split(":").map(Number);
  return t[0] * 3600 + t[1] * 60 + t[2];
};

function Timeline({ entries }: { entries: TimesheetEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const left = (e: TimesheetEntry) => Math.min((secOfDay(e.started_at) / 86400) * 100, 100);
  return (
    <div className="border-b border-layout-subtle px-6 py-3 bg-secondary-surface/50" data-testid="day-timeline">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ui-border" />
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ui-border" style={{ left: `${f * 100}%` }} />
        ))}
        {sorted.map((e, i) => {
          const l = left(e);
          const next = sorted[i + 1];
          const room = next ? Math.max(left(next) - l, 0) : 100 - l;
          const w = Math.min(Math.max((e.duration_seconds / 86400) * 100, 0.6), room);
          const span = `${dayjs(e.started_at).format("h:mm a")} – ${e.stopped_at ? dayjs(e.stopped_at).format("h:mm a") : "…"}`;
          return (
            <Tip
              key={`${e.project_id}-${i}`}
              className="rounded-md px-3 py-1.5 text-xs max-w-72"
              content={
                <>
                  <p className="font-semibold">{e.project_name}</p>
                  <p className="text-xs opacity-80">{span}</p>
                  <p className="text-xs opacity-80">Duration: {e.duration}</p>
                </>
              }
            >
              <div data-testid="timeline-segment" className={cn("absolute top-1/2 h-2.5 -translate-y-1/2 cursor-default rounded-sm ring-1 ring-white/60 transition-all hover:h-3.5", e.is_running ? "bg-emerald-500" : e.is_idle ? "bg-amber-400" : "bg-primary")} style={{ left: `${l}%`, width: `${w}%` }} />
            </Tip>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-secondary-text">
        {["12am", "6am", "12pm", "6pm", "12am"].map((t, i) => (
          <span key={`${t}-${i}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Notes({ notes }: { notes: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [over, setOver] = React.useState(false);
  const el = (
    <span ref={ref} className="block truncate cursor-default" onMouseEnter={() => ref.current && setOver(ref.current.scrollWidth > ref.current.offsetWidth)}>
      {notes}
    </span>
  );
  return over ? <Tip content={notes}>{el}</Tip> : el;
}

type DialogKind = "edit" | "split" | "delete" | null;

function EntryActions({ entry, onOpen }: { entry: TimesheetEntry; onOpen: (k: DialogKind) => void }) {
  if (entry.is_locked)
    return (
      <Tip content="Time entry locked">
        <div className="w-8 h-8 bg-muted border border-ui-border rounded-md flex items-center justify-center shadow-sm">
          <Lock size={16} className="text-red-600" />
        </div>
      </Tip>
    );
  const items = [
    { k: "edit" as const, icon: SquarePen, label: "Edit Time Entry", icon_c: "text-primary", hover: "hover:bg-primary-highlight", show: true },
    { k: "split" as const, icon: SeparatorVertical, label: "Split Time Entry", icon_c: "text-brand", hover: "hover:bg-brand/10", show: !entry.is_manual },
    { k: "delete" as const, icon: Trash2, label: "Delete Time Entry", icon_c: "text-destructive", hover: "hover:bg-destructive/10", show: true, danger: true },
  ];
  return (
    <DropdownMenu.Root modal={false}>
      <div data-slot="button-group" role="group" className="flex w-fit items-stretch flex-row">
        <DropdownMenu.Trigger asChild>
          <button type="button" aria-label="Time entry actions" data-testid="entry-actions" className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface text-secondary-text shadow-xs transition-all duration-200 hover:bg-muted hover:text-primary-text hover:shadow disabled:cursor-not-allowed disabled:opacity-50">
            <EllipsisVertical size={16} />
          </button>
        </DropdownMenu.Trigger>
        {entry.is_paid && (
          <Tip content="This time has already been paid">
            <div className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 shadow-xs">
              <Lock size={14} className="text-destructive" />
            </div>
          </Tip>
        )}
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} data-slot="dropdown-menu-content" className="text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-100 overflow-x-hidden overflow-y-auto rounded-lg shadow-md mt-1 border border-border min-w-48 p-1 bg-secondary-surface backdrop-blur-md font-karla" data-testid="entry-actions-menu">
          <DropdownMenu.Label data-slot="dropdown-menu-label" className="text-sm font-medium px-3 py-2 border-b border-border">
            <span className="text-secondary-text font-semibold uppercase tracking-wider text-xs">Actions</span>
          </DropdownMenu.Label>
          {items
            .filter((i) => i.show)
            .map((i) => (
              <DropdownMenu.Item
                key={i.k}
                data-slot="dropdown-menu-item"
                data-variant={i.danger ? "destructive" : "default"}
                onSelect={() => onOpen(i.k)}
                className={cn("focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 text-sm outline-hidden select-none rounded-md px-3 py-2 mx-1 my-0.5 transition-colors duration-150 cursor-pointer", i.hover)}
              >
                <div className="flex w-full items-center gap-3">
                  <i.icon size={16} className={i.icon_c} />
                  <span className="font-medium text-sm text-primary-text">{i.label}</span>
                </div>
              </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** lucide "separator-vertical" (defined inline in the live chunk). */
function SeparatorVertical({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-separator-vertical", className)}>
      <path d="M12 3v18" />
      <path d="m16 16 4-4-4-4" />
      <path d="m8 8-4 4 4 4" />
    </svg>
  );
}

function Pagination({ total }: { total: number }) {
  const { get, update } = useQueryParams();
  const per = Number(get("perPage") || "10");
  const page = Math.max(1, Number(get("page") || "1"));
  const pages = Math.max(1, Math.ceil(total / per));
  const from = total ? (page - 1) * per + 1 : 0;
  const to = Math.min(total, page * per);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => pages <= 7 || n === 1 || n === pages || Math.abs(n - page) <= 1);
  const navBtn = "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex w-full flex-col gap-4 p-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8" data-testid="ts-pagination">
      <p className="flex items-center gap-1 whitespace-nowrap text-sm">
        <span className="text-muted-foreground">
          Showing {from}-{to} of
        </span>
        <span className="font-semibold text-foreground">{total} results</span>
      </p>
      <div className="flex items-center gap-1 sm:gap-2">
        <button type="button" aria-label="Go to previous page" className={navBtn} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          {nums.map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-sm text-muted-foreground">…</span>}
              <button type="button" aria-current={n === page ? "page" : undefined} onClick={() => update({ page: String(n) })} className={cn("flex size-7 min-w-7 sm:size-8 sm:min-w-8 items-center justify-center rounded px-2 text-sm transition-colors", n === page ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}>
                {n}
              </button>
            </React.Fragment>
          ))}
        </div>
        <button type="button" aria-label="Go to next page" className={navBtn} disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <p className="whitespace-nowrap text-sm text-muted-foreground">Show per page</p>
        <Select.Root value={String(per)} onValueChange={(v) => update({ perPage: v, page: "1" })}>
          <Select.Trigger data-slot="select-trigger" className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none dark:bg-input/30 dark:hover:bg-input/50 h-8 w-24 border border-ui-border bg-secondary-surface">
            <Select.Value />
            <ChevronDown className="size-4 opacity-50" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content position="popper" sideOffset={4} className="z-110 min-w-24 rounded-md border border-border bg-popover p-1 shadow-md font-karla">
              <Select.Viewport>
                {["10", "20", "30", "50"].map((v) => (
                  <Select.Item key={v} value={v} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent">
                    <Select.ItemText>{v}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  );
}

function DayList({ data, loading, timezone, userName }: { data?: UserTimesheetResponse; loading: boolean; timezone: string; userName: string }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ kind: DialogKind; entry: TimesheetEntry } | null>(null);
  const [addFor, setAddFor] = React.useState<string | null>(null);
  const dates = Object.keys(data?.report ?? {}).sort((a, b) => b.localeCompare(a));
  const toggle = (d: string) => setExpanded((s) => (s.has(d) ? (s.delete(d), new Set(s)) : new Set(s.add(d))));
  const chosen = Object.entries(data?.report ?? {}).flatMap(([d, day]) => day.entries.filter((e, i) => selected.has(keyOf(d, e, i))));

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-layout-subtle bg-secondary-surface p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="skeleton-shimmer size-11 rounded-lg bg-primary/10 dark:bg-primary/15" />
              <div className="skeleton-shimmer h-4 w-24 rounded-full bg-primary/10 dark:bg-primary/15" />
            </div>
          </div>
        ))}
      </div>
    );
  if (!data) return null;
  const base = { organizationId: data.organization_id, userId: data.user_id, userName, timezone };

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-4 rounded-xl border border-primary bg-primary-selected px-4 py-3 shadow-xs" data-testid="bulk-bar">
          <span className="font-karla text-sm font-semibold text-link">
            {selected.size} {selected.size === 1 ? "entry" : "entries"} selected
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setSelected(new Set())}>
              Cancel
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium h-9 px-4 text-sm bg-[image:var(--gradient-negative)] text-negative-foreground hover:opacity-90 cursor-pointer" onClick={() => setBulkOpen(true)} data-testid="bulk-delete">
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}
      <BulkDeleteDialog open={bulkOpen} onOpenChange={setBulkOpen} entries={chosen} organizationId={data.organization_id} userId={data.user_id} timezone={timezone} onDeleted={() => setSelected(new Set())} />
      {dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-secondary-surface rounded-xl border border-layout-subtle shadow-xs">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No time entries found for the selected period</p>
          </div>
        </div>
      ) : (
        dates.map((date) => {
          const day = data.report[date];
          const entries = day.entries;
          const off = day.time_off ?? [];
          const hasOff = off.length > 0;
          const worked = day.total_user_duration_seconds > 0;
          const isOpen = expanded.has(date);
          const keys = entries.flatMap((e, i) => (selectable(e) ? [keyOf(date, e, i)] : []));
          const n = keys.filter((k) => selected.has(k)).length;
          return (
            <div key={date} className="rounded-xl border border-layout-subtle shadow-xs overflow-hidden" data-testid="day-card" data-date={date}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => toggle(date)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(date))}
                className="cursor-pointer border-b border-layout-subtle bg-secondary-surface p-3 transition-colors hover:bg-muted/40"
                data-testid="day-header"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 gap-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <DateBadge date={date} />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary-text">{dayjs(date).format("dddd")}</span>
                        <span className="text-xs text-secondary-text">{dayjs(date).format("MMMM YYYY")}</span>
                      </div>
                    </div>
                    {hasOff && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {off.map((t) => (
                          <span key={t.request_id} className="inline-flex items-center h-5 max-w-56 rounded-full border border-transparent bg-primary-selected px-1.5 font-karla text-xs font-normal leading-4 text-link">
                            <span className="truncate">{t.policy_name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-start gap-4 sm:gap-6">
                      {(worked || !hasOff) && <Metric label="Time Worked" value={day.total_user_duration} />}
                      {hasOff && <Metric label="Time Off" value={day.day_time_off_seconds > 0 ? day.day_time_off_time : "—"} />}
                      {worked && hasOff && <Metric label="Total Time" value={hms(day.total_user_duration_seconds + day.day_time_off_seconds)} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="View Screenshots"
                          onClick={() => window.open(`/organizations/${data.organization_id}/activities/screenshots?date=${date}&user_id=${data.user_id}`, "_blank")}
                          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface text-secondary-text shadow-xs transition-colors hover:bg-muted hover:text-primary-text"
                        >
                          <Camera size={16} />
                        </button>
                        <span className="contents">
                          <button data-slot="button" type="button" className={BTN_SECONDARY} onClick={() => setAddFor(date)} data-testid="day-add-time">
                            Add Time
                          </button>
                        </span>
                      </div>
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-secondary-surface text-secondary-text shadow-xs">
                        <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {isOpen && (
                <>
                  {hasOff && (
                    <div className="flex flex-col gap-3 bg-secondary-surface p-6">
                      {off.map((t) => (
                        <div key={t.request_id} className="flex w-full items-center gap-3 rounded-lg border border-primary bg-primary-selected px-5 py-4">
                          <span className="flex size-6 shrink-0 items-center justify-center">
                            <TreePalm className="size-5 text-link" />
                          </span>
                          <span className="truncate font-karla text-sm font-semibold leading-5 text-link">On Leave · Full Day · {t.duration}</span>
                          <span className="shrink-0 font-karla rounded-full px-2 py-0.5 text-xs font-medium bg-positive/15 text-positive">{t.is_paid ? "Paid leave" : "Unpaid leave"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entries.length > 0 ? (
                    <div className="font-karla">
                      <Timeline entries={entries} />
                      <div className="overflow-x-auto bg-secondary-surface/25">
                        <div data-slot="table-container" className="relative w-full overflow-x-auto">
                          <table data-slot="table" data-variant="default" className="group/table w-full caption-bottom text-sm" data-testid="entries-table">
                            <thead data-slot="table-header">
                              <tr data-slot="table-row" className="hover:bg-muted/50 transition-colors border-b border-layout-subtle">
                                <th data-slot="table-head" className={cn(TH, "text-foreground text-left font-medium w-12 py-3 pl-6 pr-0")}>
                                  <Checkbox
                                    aria-label="Select all entries for this day"
                                    data-testid="select-all-day"
                                    disabled={keys.length === 0}
                                    checked={keys.length > 0 && n === keys.length ? true : n > 0 ? "indeterminate" : false}
                                    onCheckedChange={(v) => setSelected((s) => (keys.forEach((k) => (v === true ? s.add(k) : s.delete(k))), new Set(s)))}
                                  />
                                </th>
                                <th data-slot="table-head" className={cn(TH, "text-left py-3 px-4 font-medium text-secondary-text w-54")}>
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4" />
                                    <span className="font-semibold">Project &amp; Task</span>
                                  </div>
                                </th>
                                {["Activity", "Manual", "Duration"].map((h) => (
                                  <th key={h} data-slot="table-head" className={cn(TH, "text-start py-3 px-4 font-medium text-secondary-text w-25")}>
                                    {h}
                                  </th>
                                ))}
                                <th data-slot="table-head" className={cn(TH, "text-start py-3 px-4 font-medium text-secondary-text w-40")}>
                                  Time
                                </th>
                                <th data-slot="table-head" className={cn(TH, "text-start py-3 px-4 font-medium text-secondary-text w-25")}>
                                  Added/Edited By
                                </th>
                                <th data-slot="table-head" className={cn(TH, "text-start py-3 px-4 font-medium text-secondary-text w-25")}>
                                  Notes
                                </th>
                                <th data-slot="table-head" className={cn(TH, "text-end py-3 px-4 font-medium text-secondary-text w-20")}>
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
                              {entries.map((e, i) => {
                                const k = keyOf(date, e, i);
                                const on = selected.has(k);
                                return (
                                  <tr key={k} data-slot="table-row" data-state={on ? "selected" : undefined} data-testid="entry-row" className={cn("data-[state=selected]:bg-muted border-b border-layout-subtle transition-colors hover:bg-muted/50", on && "bg-primary-selected")}>
                                    <td data-slot="table-cell" className={cn(TD, "py-2 pl-6 pr-0")}>
                                      <Checkbox aria-label="Select time entry" checked={on} disabled={!selectable(e)} onCheckedChange={() => setSelected((s) => (s.has(k) ? s.delete(k) : s.add(k), new Set(s)))} />
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-2 px-4 max-w-96 min-w-54")}>
                                      <div className="flex items-center gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-[3px] bg-working-orange text-sm font-medium uppercase text-on-primary">{initials2(e.project_name || "Unknown")}</div>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium text-primary-text text-sm truncate max-w-full w-fit cursor-default">{e.project_name}</div>
                                          {e.task_name && <div className="text-xs text-secondary-text mt-0.5 line-clamp-2 max-w-full w-fit cursor-default">{e.task_name}</div>}
                                        </div>
                                      </div>
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start")}>
                                      <span className="text-sm font-medium text-primary-text">{e.activity_percentage.toFixed(1)}%</span>
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start")}>
                                      {e.is_idle ? <span className="text-sm font-medium text-working-orange">Idle</span> : <span className="text-sm font-medium text-secondary-text">{e.is_origin_manual ? "Yes" : "No"}</span>}
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start")}>
                                      <span className="text-sm font-semibold text-primary" data-testid="entry-duration">
                                        {e.duration}
                                      </span>
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start")}>
                                      <span className="text-sm font-semibold text-primary" data-testid="entry-time">
                                        {dayjs(e.started_at).format("hh:mm:ss A")} - {e.stopped_at ? dayjs(e.stopped_at).format("hh:mm:ss A") : "--:--:--"}
                                      </span>
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start")}>
                                      {e.created_by}
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 text-start w-48 max-w-48")}>
                                      {e.notes ? <Notes notes={e.notes} /> : e.is_idle || e.created_by !== "System Generated" ? "No reason provided" : "-"}
                                    </td>
                                    <td data-slot="table-cell" className={cn(TD, "py-4 px-4 flex justify-end")}>
                                      <EntryActions entry={e} onOpen={(kind) => setDialog({ kind, entry: e })} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center bg-secondary-surface/50 justify-center py-12 px-6">
                      <div className="text-center space-y-3">
                        <p className="text-muted-foreground text-sm">No time entries recorded for this day</p>
                        <button type="button" onClick={() => setAddFor(date)} className="flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium text-primary-text shadow-xs transition-colors hover:bg-muted mx-auto">
                          Add Time
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
      <Pagination total={data.total_dates} />
      <AddTimeDialog open={!!addFor} onOpenChange={(o) => !o && setAddFor(null)} data={{ ...base, date: addFor ?? dates[0] ?? dayjs().format("YYYY-MM-DD") }} />
      {dialog && (
        <>
          <EditTimeDialog open={dialog.kind === "edit"} onOpenChange={(o) => !o && setDialog(null)} data={{ ...base, entry: dialog.entry }} />
          <SplitTimeDialog open={dialog.kind === "split"} onOpenChange={(o) => !o && setDialog(null)} data={{ ...base, entry: dialog.entry }} />
          <DeleteTimeDialog open={dialog.kind === "delete"} onOpenChange={(o) => !o && setDialog(null)} data={{ ...base, entry: dialog.entry }} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function TimesheetPage() {
  const p = useTsParams();
  const { organizationId, user } = useSession();
  const q = new URLSearchParams({ start_date: p.start, end_date: p.end, timezone_str: p.timezone, offset: String(p.offset), limit: String(p.perPage) });
  if (p.projectId) q.set("project_id", p.projectId);
  if (p.timeType) q.set("time_type", p.timeType);
  if (p.activityLevel) q.set("activity_level", p.activityLevel);
  const { data, isLoading } = useApiQuery<UserTimesheetResponse>({
    endpoint: `/reports/user-time-sheet/${organizationId}/${p.userId}?${q}`,
    queryKey: ["list", "USER_TIMESHEETS", organizationId, p.start, p.end, p.offset, String(p.perPage), p.userId, p.timezone, p.projectId, p.timeType, p.activityLevel],
    enabled: !!organizationId && !!user && !!p.userId,
  });
  const userName = data?.user.name ?? p.userName;
  return (
    <Tooltip.Provider>
      <div className="font-karla pt-2 pb-6" data-testid="timesheet-page">
        <div className="font-karla space-y-4">
          <Toolbar />
          <div className="space-y-4">
            <Summary data={data} loading={isLoading} />
            <WeekBlock data={data} loading={isLoading}>
              <DayList data={data} loading={isLoading} timezone={p.timezone} userName={userName} />
            </WeekBlock>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
