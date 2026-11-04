"use client";

/**
 * Absence & Leave › Calendar — port of the live chunk 2mxsai93nefna.
 *  - Month (grid): SUN–SAT cells, 3 chips per day + "+N more" popover (Pending Requests / Approved groups)
 *  - Month (list) and Week: one row per member against day columns; leaves are bars spanning their days and stack
 *    in extra lines when they overlap (no "+N more")
 *  - chips: approved = solid green border, pending = dashed yellow; denied leave is filtered out on the client
 *  - legend pills Approved / Pending / All set ?status=; Month picker / week picker with ‹ › (no Today button)
 *  - clicking a chip opens the "Time Off Request" dialog
 * URL params: view (month|week), date, layout (grid|list), status, timezone, user_id, time_off_policy_id, team_id.
 */
import * as React from "react";
import dayjs from "dayjs";
import { CalendarIcon, ChevronLeft, ChevronRight, LayoutGrid, List, X } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useQueryParams } from "@/lib/use-query-params";
import type { MonthViewEntry, MonthViewResponse, TimeOffRequest, WeekViewLeave, WeekViewMember, WeekViewResponse } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AbsenceTabs, AvatarLetter, ORG_TZ, useOrgId } from "./shared";
import { TimeOffFilterBar } from "./RequestsPage";
import { useInvalidateTimeOff, ViewRequestDialog } from "./RequestDialogs";

const TONE: Record<string, string> = {
  approved: "bg-[var(--positive-color-selected)] border-positive text-primary-text",
  submitted: "bg-[var(--warning-color-selected)] border-dashed border-warning text-primary-text",
  denied: "bg-[var(--negative-color-selected)] border-negative text-primary-text",
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const notDenied = (e: { status: string }) => e.status !== "denied";

const label = (e: { leave_type: string; policy_name: string; duration_seconds: number | null }) =>
  e.leave_type !== "partial" ? e.policy_name : `${e.policy_name} · ${Math.round((e.duration_seconds ?? 0) / 3600)}h`;

function weeksOf(month: dayjs.Dayjs) {
  const first = month.startOf("month");
  const start = first.startOf("week");
  const n = Math.ceil((first.diff(start, "day") + first.daysInMonth()) / 7);
  return Array.from({ length: n }, (_, w) => Array.from({ length: 7 }, (_, d) => start.add(7 * w + d, "day")));
}

const toRequest = (m: Pick<WeekViewMember, "user_id" | "full_name" | "email" | "profile_image_url">, l: WeekViewLeave): TimeOffRequest => ({
  id: l.id,
  user_id: m.user_id,
  user_name: m.full_name,
  user_email: m.email,
  profile_image_url: m.profile_image_url,
  started_at_date: l.started_at_date,
  stopped_at_date: l.stopped_at_date,
  notes: l.notes,
  reason_notes: l.reason_notes,
  leave_type: l.leave_type,
  time_off_policy_id: l.time_off_policy_id,
  policy_name: l.policy_name,
  status: l.status,
  approved_by: l.approved_by,
  timezone: l.timezone,
  created_at: l.created_at,
  updated_at: l.updated_at,
  details: l.details,
  attachments: l.attachments,
});

const entryToRequest = (e: MonthViewEntry): TimeOffRequest => toRequest({ user_id: e.user_id, full_name: e.user_name, email: e.user_email, profile_image_url: e.profile_image_url }, e as unknown as WeekViewLeave);

/* ---------- toolbar pieces ---------- */

function PillTabs<T extends string>({ value, onChange, items, size }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode; title?: string; testId?: string }[]; size: "sm" | "md" }) {
  return (
    <div role="tablist" data-slot="tabs-list" data-variant="pill" className={cn("inline-flex items-center border border-ui-border bg-secondary-surface p-0.5 text-foreground rounded-md w-fit max-w-full overflow-x-auto", size === "sm" ? "h-8" : "h-9")}>
      {items.map((i) => {
        const on = i.value === value;
        return (
          <button
            key={i.value}
            type="button"
            role="tab"
            title={i.title}
            aria-selected={on}
            data-state={on ? "active" : "inactive"}
            data-testid={i.testId}
            onClick={() => onChange(i.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap rounded-sm cursor-pointer [&_svg]:size-4",
              size === "sm" ? "text-xs h-6 px-3" : "text-sm h-7 w-7 px-0",
              on ? "bg-primary text-primary-foreground" : "dark:text-foreground",
            )}
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );
}

const SURF = "inline-flex items-center justify-center shrink-0 cursor-pointer size-9 bg-secondary-surface border border-ui-border rounded-lg shadow-none text-primary-text hover:bg-muted";

/** ‹ [October, 2026] › with a month (or week) picker popover. No Today button (live). */
function DateNav({ value, unit, onChange }: { value: string; unit: "month" | "week"; onChange: (d: string) => void }) {
  const cur = dayjs(value);
  const today = dayjs();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(cur.startOf("month"));
  const [months, setMonths] = React.useState(unit === "month");
  const ws = cur.startOf("week");
  const we = cur.endOf("week");
  const text = unit === "month" ? cur.format("MMMM, YYYY") : `${ws.format("D MMM")} – ${we.format("D MMM, YYYY")}`;
  const grid = Array.from({ length: 42 }, (_, i) => view.startOf("month").startOf("week").add(i, "day"));
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={SURF} aria-label="Previous" data-testid="cal-prev" onClick={() => onChange(cur.add(-1, unit).startOf(unit).format("YYYY-MM-DD"))}>
        <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setView(cur.startOf("month"));
            setMonths(unit === "month");
          }
        }}
      >
        <PopoverTrigger type="button" data-testid="cal-picker" className="flex items-center justify-center gap-2 h-9 px-4 min-w-48 rounded-lg border border-ui-border bg-secondary-surface text-sm font-medium cursor-pointer">
          <CalendarIcon className="size-4 text-gray-500 dark:text-gray-300" />
          {text}
        </PopoverTrigger>
        <PopoverContent align="center" className="w-72! p-3" data-testid="cal-picker-popover">
          <div className="flex items-center justify-between mb-3">
            <button type="button" className={cn(SURF, "size-8")} onClick={() => setView(months ? view.subtract(1, "year") : view.subtract(1, "month"))}>
              <ChevronLeft className="size-4 text-gray-500 dark:text-gray-300" />
            </button>
            <button type="button" className="text-sm font-semibold cursor-pointer hover:text-primary" onClick={() => setMonths((m) => !m)}>
              {months ? view.format("YYYY") : view.format("MMMM YYYY")}
            </button>
            <button type="button" className={cn(SURF, "size-8")} onClick={() => setView(months ? view.add(1, "year") : view.add(1, "month"))}>
              <ChevronRight className="size-4 text-gray-500 dark:text-gray-300" />
            </button>
          </div>
          {months ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => {
                const on = unit === "month" && view.year() === cur.year() && i === cur.month();
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn("h-9 rounded-lg text-sm font-medium cursor-pointer hover:bg-accent", on && "bg-primary text-primary-foreground")}
                    onClick={() => {
                      const t = view.date(1).month(i);
                      if (unit === "month") {
                        onChange(t.startOf("month").format("YYYY-MM-DD"));
                        setOpen(false);
                      } else {
                        setView(t);
                        setMonths(false);
                      }
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-y-1 mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {grid.map((d) => {
                  const inWeek = d.startOf("week").isSame(ws, "day");
                  const isSel = d.isSame(cur, "day");
                  return (
                    <button
                      key={d.format("YYYY-MM-DD")}
                      type="button"
                      className={cn(
                        "h-8 text-sm rounded-lg cursor-pointer hover:bg-accent",
                        !d.isSame(view, "month") && "text-gray-400 dark:text-gray-500",
                        inWeek && "bg-accent",
                        isSel && "bg-primary text-primary-foreground font-medium",
                        !isSel && d.isSame(today, "day") && "text-primary font-medium",
                      )}
                      onClick={() => {
                        onChange(d.startOf("week").format("YYYY-MM-DD"));
                        setOpen(false);
                      }}
                    >
                      {d.date()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      <button type="button" className={SURF} aria-label="Next" data-testid="cal-next" onClick={() => onChange(cur.add(1, unit).startOf(unit).format("YYYY-MM-DD"))}>
        <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
    </div>
  );
}

function Legend() {
  const { get, update } = useQueryParams();
  const s = get("status") ?? "";
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="cal-legend">
      {[
        { value: "approved", label: "Approved", dot: "bg-positive" },
        { value: "submitted", label: "Pending", dot: "bg-warning" },
        { value: "", label: "All", dot: "bg-[var(--color-indigo)]" },
      ].map((r) => (
        <button
          key={r.label}
          type="button"
          data-testid={`legend-${r.label.toLowerCase()}`}
          aria-pressed={s === r.value}
          onClick={() => update({ status: r.value || null })}
          className={cn("flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs text-secondary-text", s === r.value ? "border-primary bg-primary-highlight" : "border-ui-border bg-secondary-surface hover:bg-muted")}
        >
          <span className={cn("size-2 rounded-full", r.dot)} />
          {r.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- month grid ---------- */

function Chip({ e, onSelect }: { e: MonthViewEntry; onSelect: (e: MonthViewEntry) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(e)}
      data-testid="cal-chip"
      data-status={e.status}
      className={cn("flex w-full cursor-pointer items-center gap-1.5 overflow-hidden rounded-sm border px-1 py-0.5 text-xs font-medium hover:opacity-80 min-[2400px]:px-2 min-[2400px]:py-1.5 min-[2400px]:text-sm", TONE[e.status])}
      title={`${e.user_name} · ${label(e)}`}
    >
      <AvatarLetter name={e.user_name} src={e.profile_image_url} className="size-5 shrink-0 min-[2400px]:size-6" textClassName="text-[10px] min-[2400px]:text-xs" />
      <span className="truncate">
        {e.user_name.split(" ")[0]} · {label(e)}
      </span>
    </button>
  );
}

function MoreChips({ date, entries, hidden, onSelect }: { date: string; entries: MonthViewEntry[]; hidden: number; onSelect: (e: MonthViewEntry) => void }) {
  const [open, setOpen] = React.useState(false);
  const groups = [
    { status: "submitted", label: "Pending Requests" },
    { status: "approved", label: "Approved" },
  ]
    .map((g) => ({ ...g, items: entries.filter((e) => e.status === g.status) }))
    .filter((g) => g.items.length);
  const when = (e: MonthViewEntry) => {
    if (e.leave_type === "partial") {
      const d = e.details.find((x) => x.started_at_datetime.startsWith(date));
      const h = Math.round((e.duration_seconds ?? 0) / 3600);
      return d ? `${h}h · ${dayjs(d.started_at_datetime).format("h:mm A")} – ${dayjs(d.stopped_at_datetime).format("h:mm A")}` : `${h}h`;
    }
    const s = dayjs(e.started_at_date);
    const t = dayjs(e.stopped_at_date);
    return s.isSame(t, "day") ? "Full day" : `${s.format("MMM D")} – ${s.isSame(t, "month") ? t.format("D") : t.format("MMM D")}`;
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" data-testid="cal-more" className="cursor-pointer self-start rounded px-1 text-xs text-secondary-text hover:text-primary hover:underline">
          +{hidden} more
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80! max-w-[calc(100vw-2rem)] rounded-xl p-0 font-karla shadow-lg" data-testid="cal-more-popover">
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
          <h3 className="text-lg font-bold text-primary-text">{dayjs(date).format("ddd, MMMM D, YYYY")}</h3>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex size-6 cursor-pointer items-center justify-center rounded-md border border-transparent text-primary hover:bg-primary-highlight">
            <X className="size-3" />
          </button>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto px-4 pt-1 pb-4">
          {groups.map((g) => (
            <div key={g.status} className="space-y-1.5">
              <p className="text-xs text-secondary-text">
                {g.label} ({g.items.length})
              </p>
              {g.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-label={`View ${e.user_name}'s time off request`}
                  onClick={() => {
                    setOpen(false);
                    onSelect(e);
                  }}
                  className={cn("flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-medium hover:opacity-80", TONE[e.status])}
                >
                  <AvatarLetter name={e.user_name} src={e.profile_image_url} className="size-5 shrink-0" textClassName="text-[10px]" />
                  <span className="truncate">
                    {e.user_name} · {e.policy_name}
                  </span>
                  <span className="ml-auto shrink-0">{when(e)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthGrid({ month, byDate, onSelect }: { month: string; byDate: Record<string, MonthViewEntry[]>; onSelect: (e: MonthViewEntry) => void }) {
  const m = dayjs(month);
  const today = dayjs();
  return (
    <div className="rounded-xl border border-layout-subtle bg-secondary-surface overflow-hidden" data-testid="cal-month-grid">
      <div className="grid grid-cols-7 border-b border-ui-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-secondary-text">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeksOf(m)
          .flat()
          .map((d) => {
            const key = d.format("YYYY-MM-DD");
            const list = byDate[key] ?? [];
            const more = list.length - 3;
            const isToday = d.isSame(today, "day");
            const inMonth = d.isSame(m, "month");
            return (
              <div
                key={key}
                data-date={key}
                data-testid="cal-day"
                className={cn(
                  "min-h-40 min-[2400px]:min-h-56 flex flex-col gap-1.5 border-r border-b border-ui-border p-2 min-[2400px]:p-2.5",
                  !inMonth && "bg-(--grey-background-color)",
                  isToday && "bg-primary-highlight inset-ring inset-ring-primary",
                )}
              >
                <span
                  className={cn(
                    "mb-0.5 flex size-6 items-center justify-center self-start rounded-full text-xs font-medium",
                    inMonth ? "text-secondary-text" : "text-(--disabled-text-color)",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {d.date()}
                </span>
                {list.slice(0, 3).map((e) => (
                  <Chip key={e.id} e={e} onSelect={onSelect} />
                ))}
                {more > 0 && <MoreChips date={key} entries={list} hidden={more} onSelect={onSelect} />}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function MonthSkeleton({ month }: { month: string }) {
  const counts = [2, 0, 1, 3, 1, 0, 2];
  return (
    <div className="rounded-xl border border-layout-subtle bg-secondary-surface overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ui-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-secondary-text">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeksOf(dayjs(month))
          .flat()
          .map((d, i) => (
            <div key={d.format("YYYY-MM-DD")} className="min-h-40 flex flex-col gap-1.5 border-r border-b border-ui-border p-2">
              <span className="mb-0.5 size-6 shrink-0 animate-pulse rounded-full bg-muted" />
              {Array.from({ length: counts[i % 7] }).map((_, k) => (
                <span key={k} className="h-6 w-full animate-pulse rounded-sm bg-muted" />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------- member rows (Week + Month list) ---------- */

interface Bar {
  leave: WeekViewLeave;
  startColumn: number;
  span: number;
  merged: number;
}

function lanes(days: string[], m: WeekViewMember): Bar[][] {
  const bars: Bar[] = [];
  days.forEach((d, i) => (m.leaves[d] ?? []).forEach((l) => l.bar_start && bars.push({ leave: l, startColumn: i + 1, span: Math.max(1, Math.min(l.visible_span_days, days.length - i)), merged: 1 })));
  // Merge back-to-back full-day bars of the same policy + status.
  const merged: Bar[] = [];
  [...bars]
    .sort((a, b) => a.startColumn - b.startColumn)
    .forEach((b) => {
      const last = merged[merged.length - 1];
      if (last && last.startColumn + last.span === b.startColumn && last.leave.leave_type === "full_day" && b.leave.leave_type === "full_day" && last.leave.status === b.leave.status && last.leave.time_off_policy_id === b.leave.time_off_policy_id) {
        last.span += b.span;
        last.merged += 1;
        last.leave = { ...last.leave, stopped_at_date: b.leave.stopped_at_date, is_end: b.leave.is_end, continues_after: b.leave.continues_after };
        return;
      }
      merged.push({ ...b, leave: { ...b.leave } });
    });
  const out: Bar[][] = [];
  merged.forEach((b) => {
    const lane = out.find((l) => l.every((x) => b.startColumn >= x.startColumn + x.span || x.startColumn >= b.startColumn + b.span));
    if (lane) lane.push(b);
    else out.push([b]);
  });
  return out;
}

function MemberRows({ days, members, unit, onSelect }: { days: string[]; members: WeekViewMember[]; unit: "week" | "month"; onSelect: (m: WeekViewMember, l: WeekViewLeave) => void }) {
  const today = dayjs();
  if (!members.length || !days.length)
    return (
      <div className="rounded-xl border border-layout-subtle bg-secondary-surface py-16 flex flex-col items-center text-center" data-testid="cal-empty">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/no-data-placeholder.svg" alt="No data" width={200} height={200} className="mb-4" />
        <p className="text-sm font-medium text-primary-text">No time off this {unit}</p>
        <p className="text-xs text-secondary-text mt-1">Try another {unit} or clear the filters</p>
      </div>
    );
  const wide = days.length > 7;
  const cols = { gridTemplateColumns: `repeat(${days.length}, ${wide ? "11rem" : "minmax(0, 1fr)"})` };
  const sticky = wide && "sticky left-0 z-20 bg-secondary-surface/50 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]";
  return (
    <div className="rounded-xl border border-layout-subtle bg-secondary-surface overflow-x-auto" data-testid={unit === "week" ? "cal-week" : "cal-month-list"}>
      <div className={wide ? "w-max" : "min-w-3xl"}>
        <div className="grid grid-cols-[14rem_1fr] border-b border-ui-border">
          <div className={cn("bg-secondary-surface px-3 py-2.5 text-xs font-semibold text-secondary-text border-r border-ui-border", wide && "sticky left-0 z-30 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}>Member</div>
          <div className="grid" style={cols}>
            {days.map((d) => {
              const x = dayjs(d);
              const on = x.isSame(today, "day");
              return (
                <div key={d} className="px-2 py-1.5 text-center border-r border-ui-border last:border-r-0">
                  <p className="text-xs text-secondary-text">{x.format("ddd")}</p>
                  <p className={cn("mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold", on ? "bg-primary text-primary-foreground" : "text-primary-text")}>{x.date()}</p>
                </div>
              );
            })}
          </div>
        </div>
        {members.map((m) => {
          const ls = lanes(days, m);
          return (
            <div key={m.user_id} className="grid grid-cols-[14rem_1fr] border-b border-ui-border last:border-b-0" data-testid="cal-member-row">
              <div className={cn("flex items-center gap-2 border-r border-ui-border bg-secondary-surface px-3 py-2", sticky)}>
                <AvatarLetter name={m.full_name} src={m.profile_image_url} className="size-7 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-primary-text">{m.full_name}</p>
                  {m.teams.length > 0 && <p className="truncate text-[11px] text-secondary-text">{m.teams.map((t) => t.name).join(", ")}</p>}
                </div>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 grid" style={cols}>
                  {days.map((d) => (
                    <div key={d} className="border-r border-ui-border last:border-r-0" />
                  ))}
                </div>
                <div className="relative grid min-h-11 content-center gap-y-1 py-1.5" style={cols}>
                  {ls.map((lane, row) =>
                    lane.map((b) => (
                      <button
                        key={b.leave.id}
                        type="button"
                        data-testid="cal-bar"
                        data-status={b.leave.status}
                        onClick={() => onSelect(m, b.leave)}
                        style={{ gridColumn: `${b.startColumn} / span ${b.span}`, gridRow: row + 1 }}
                        className={cn(
                          "mx-1 flex h-6 cursor-pointer items-center overflow-hidden rounded-sm border px-2 text-xs font-medium hover:opacity-80",
                          TONE[b.leave.status],
                          b.leave.continues_before && "ml-0 rounded-l-none",
                          b.leave.continues_after && "mr-0 rounded-r-none",
                        )}
                        title={`${m.full_name} · ${label(b.leave)}${b.merged > 1 ? ` (${b.merged} requests)` : ""}`}
                      >
                        <span className="truncate">{b.leave.policy_name}</span>
                      </button>
                    )),
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RowsSkeleton({ columns }: { columns: number }) {
  const wide = columns > 7;
  const cols = { gridTemplateColumns: `repeat(${columns}, ${wide ? "11rem" : "minmax(0, 1fr)"})` };
  const spans = [
    [1, 3],
    [5, 2],
    [2, 1],
    [4, 4],
    [6, 2],
    [1, 2],
  ];
  return (
    <div className="rounded-xl border border-layout-subtle bg-secondary-surface overflow-x-auto">
      <div className={wide ? "w-max" : "min-w-3xl"}>
        {spans.map(([s, n], i) => (
          <div key={i} className="grid grid-cols-[14rem_1fr] border-b border-ui-border last:border-b-0">
            <div className="flex items-center gap-2 border-r border-ui-border px-3 py-2">
              <span className="size-7 shrink-0 animate-pulse rounded-full bg-muted" />
              <span className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="grid content-center px-1 py-1.5 min-h-11" style={cols}>
              <span style={{ gridColumn: `${s} / span ${n}` }} className="h-6 animate-pulse rounded-sm bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export function AbsenceCalendar() {
  const org = useOrgId();
  const { get, update } = useQueryParams();
  const invalidate = useInvalidateTimeOff();
  const [selected, setSelected] = React.useState<TimeOffRequest | null>(null);
  const view = get("view") === "week" ? "week" : "month";
  const layout = get("layout") === "list" ? "list" : "grid";
  const unit = view === "month" ? "month" : "week";
  const date = (dayjs(get("date") || undefined).isValid() ? dayjs(get("date") || undefined) : dayjs()).startOf(unit).format("YYYY-MM-DD");
  const start = dayjs(date).startOf(unit).format("YYYY-MM-DD");
  const end = dayjs(date).endOf(unit).format("YYYY-MM-DD");
  const status = get("status") ?? "";
  const tz = get("timezone") ?? "";
  const users = get("user_id") ?? "";
  const policies = get("time_off_policy_id") ?? "";
  const teams = get("team_id") ?? "";
  const monthList = view === "month" && layout === "list";
  const qs = new URLSearchParams({ start_date: start, end_date: end });
  if (status) qs.set("status", status);
  if (tz) qs.set("timezone", tz);
  if (users) qs.set("filter_user_id", users);
  if (policies) qs.set("time_off_policy_id", policies);
  if (teams) qs.set("team_id", teams);
  const deps = [start, end, status, tz, users, policies, teams];
  const month = useApiQuery<MonthViewResponse>({ endpoint: `/time-off-request/month-view/${org}?${qs}`, queryKey: ["TIME_OFF_MONTH_VIEW", String(org), ...deps], enabled: view === "month" && layout === "grid" });
  const listQs = new URLSearchParams(qs);
  if (monthList) listQs.set("limit", "200");
  const week = useApiQuery<WeekViewResponse>({ endpoint: `/time-off-request/week-view/${org}?${listQs}`, queryKey: ["TIME_OFF_WEEK_VIEW", String(org), ...deps, monthList], enabled: view === "week" || monthList });

  const byDate = React.useMemo(() => {
    const out: Record<string, MonthViewEntry[]> = {};
    Object.entries(month.data?.data ?? {}).forEach(([d, list]) => {
      const l = list.filter(notDenied);
      if (l.length) out[d] = l;
    });
    return out;
  }, [month.data]);
  const members = React.useMemo(() => (week.data?.items ?? []).map((m) => ({ ...m, leaves: Object.fromEntries(Object.entries(m.leaves).map(([d, l]) => [d, l.filter(notDenied)])) })), [week.data]);

  return (
    <div className="font-karla pt-2 pb-6 flex flex-col" data-testid="absence-calendar-page">
      <AbsenceTabs />
      <div className="mx-auto w-full max-w-[3000px] rounded-xl border border-layout-subtle bg-secondary-surface p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PillTabs
            size="sm"
            value={view}
            onChange={(v) => update({ view: v, date: dayjs().startOf(v === "month" ? "month" : "week").format("YYYY-MM-DD") })}
            items={[
              { value: "month", label: "Month", testId: "view-month" },
              { value: "week", label: "Week", testId: "view-week" },
            ]}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {view === "month" && (
              <PillTabs
                size="md"
                value={layout}
                onChange={(v) => update({ layout: v })}
                items={[
                  { value: "grid", label: <LayoutGrid />, title: "Grid view", testId: "layout-grid" },
                  { value: "list", label: <List />, title: "List view", testId: "layout-list" },
                ]}
              />
            )}
            <DateNav key={`${view}-${date}`} value={date} unit={unit} onChange={(d) => update({ date: dayjs(d).startOf(unit).format("YYYY-MM-DD") })} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TimeOffFilterBar />
          <Legend />
        </div>
        {view === "month" && layout === "grid" ? (
          month.isLoading ? (
            <MonthSkeleton month={date} />
          ) : (
            <MonthGrid month={date} byDate={byDate} onSelect={(e) => setSelected(entryToRequest(e))} />
          )
        ) : week.isLoading ? (
          <RowsSkeleton columns={monthList ? dayjs(date).daysInMonth() : 7} />
        ) : (
          <MemberRows days={week.data?.days ?? []} members={members} unit={monthList ? "month" : "week"} onSelect={(m, l) => setSelected(toRequest(m, l))} />
        )}
      </div>
      {selected && (
        <ViewRequestDialog
          data={selected}
          onClose={() => {
            setSelected(null);
            invalidate();
          }}
        />
      )}
      <span className="hidden">{ORG_TZ}</span>
    </div>
  );
}
