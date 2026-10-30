"use client";

import * as React from "react";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, Download, FileText, Globe, Trash2, X } from "lucide-react";
import { apiSend, useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import { cn } from "@/lib/utils";
import { DETECTION_KINDS, type ActivityHourlySlot, type ActivityScreenshotsResponse, type ActivityShot, type ActivityTenMinuteSlot } from "@/lib/types/screenshots";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiltersPopover, type FilterOption } from "@/components/filters/FiltersPopover";
import { MemberSelect } from "@/components/filters/MemberSelect";
import { TimezoneSelect } from "@/components/filters/TimezoneSelect";
import { OptionChip, useProjects } from "@/components/filters/OptionChip";
import { DayNavigator } from "@/components/filters/DateControls";
import { ActionMenu } from "@/components/filters/ActionMenu";
import { SURFACE_BUTTON, THEMED_BUTTON } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";
import { ManualSlotCard, NoShotCard, ScreenshotSlotCard, type ViewMode } from "./SlotCards";
import { ScreenshotLightbox } from "./Lightbox";
import { BulkDownloadDialog, DeleteSlotsDialog } from "./Dialogs";

/**
 * Activity › Screenshots (live chunks 27rrbvodphkw4.js, 17kyf9zgfxf5l.js, 0vlzn2u7zn-gi.js, 2iy_hhaxgwkjs.js).
 * URL params: date, user_id, user_name, view (every_ten_minutes|all_records), timezone, project_id, project_name,
 * time_type (comma list), activity_level, detection_kind (comma list). Filters are applied client-side like the live app.
 */

const FILTER_OPTIONS: FilterOption[] = [
  { key: "user", label: "Member", description: "Default Filter", locked: true },
  { key: "timezone", label: "Timezone", description: "Default Filter", locked: true },
  { key: "project", label: "Project", description: "Filter by project" },
  { key: "timeType", label: "Time Type", description: "Normal, Idle or Manual" },
  { key: "activityLevel", label: "Activity Level", description: "Filter by activity %" },
  { key: "detectionKind", label: "Detection Kinds", description: "Filter by fraud detection" },
];
const TIME_TYPES = [
  { label: "Normal", value: "normal" },
  { label: "Idle", value: "idle" },
  { label: "Manual", value: "manual" },
  { label: "Deleted", value: "deleted" },
];
const ACTIVITY_LEVELS = [
  { label: "Low (≤20%)", value: "low" },
  { label: "Medium (20–60%)", value: "medium" },
  { label: "High (≥60%)", value: "high" },
];
const KINDS = Object.entries(DETECTION_KINDS).map(([value, label]) => ({ value, label }));

const hourLabel = (hourSlot: string) => {
  const h = Number(hourSlot.slice(0, 2));
  const f = (x: number) => dayjs().hour(x % 24).minute(0).format("hh:mm A");
  return `${f(h)} – ${f(h + 1)}`;
};
const slotLabel = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const a = dayjs().hour(h).minute(m);
  return `${a.format("hh:mm A")} - ${a.add(10, "minute").format("hh:mm A")}`;
};
const durationPill = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s % 60}s` : `${s % 60}s`;
};
const ids = (s: ActivityTenMinuteSlot) => (s.local_activity_duration_ids || "").split(",").map((x) => x.trim()).filter(Boolean);
const hasActivity = (s: ActivityTenMinuteSlot) => s.activity_percentage > 0 || s.screenshots.length > 0 || s.key_presses > 0 || s.mouse_clicks > 0 || s.mouse_movements > 0;
const isActive = (s: ActivityTenMinuteSlot) => hasActivity(s) || s.is_manual || s.is_deleted || !!s.local_activity_duration_ids;

function applyFilters(data: ActivityScreenshotsResponse, f: { projectName: string; timeType: string; activityLevel: string; detectionKind: string }): ActivityScreenshotsResponse {
  const { projectName: N, timeType, activityLevel: k, detectionKind } = f;
  if (!N && !timeType && !k && !detectionKind) return data;
  const t = timeType.split(",").filter(Boolean);
  const s = detectionKind.split(",").filter(Boolean);
  if (data.hourly_slots) {
    return {
      ...data,
      hourly_slots: data.hourly_slots
        .map((h) => ({
          ...h,
          ten_minute_slots: h.ten_minute_slots
            .filter((e) => {
              const a = e.activity_percentage;
              const typeOk =
                !t.length ||
                t.some((x) =>
                  x === "deleted" ? e.is_deleted : x === "manual" ? e.is_manual && !e.is_deleted : x === "normal" ? !e.is_manual && !e.is_deleted && a > 0 : !e.is_manual && !e.is_deleted && a === 0,
                );
              const levelOk = !k || (k === "low" ? a <= 20 : k === "medium" ? a > 20 && a < 60 : a >= 60);
              const kindOk = !s.length || e.fraud_flags?.some((fl) => s.includes(fl.kind));
              const projOk = !N || !(e.screenshots.length > 0) || e.screenshots.some((x) => x.project === N);
              return typeOk && levelOk && kindOk && projOk;
            })
            .map((e) => ({ ...e, screenshots: N ? e.screenshots.filter((x) => x.project === N) : e.screenshots })),
        }))
        .filter((h) => h.ten_minute_slots.length > 0),
    };
  }
  if (data.hourly_buckets && N) {
    return { ...data, hourly_buckets: data.hourly_buckets.map((b) => ({ ...b, screenshots: b.screenshots.filter((x) => x.project === N) })).filter((b) => b.screenshots.length > 0) };
  }
  return data;
}

function Benchmarks({ data, shotCount }: { data: ActivityScreenshotsResponse; shotCount: number }) {
  const avg = data.avg_activity_percentage;
  const bar = avg < 30 ? "bg-red-400" : avg < 50 ? "bg-amber-400" : "bg-green-400";
  const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="group relative overflow-hidden rounded-md bg-secondary-surface shadow-xs transition-shadow hover:shadow-sm border border-ui-border px-6 py-4" data-testid="benchmark">
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-center bg-gray-400" />
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="font-medium uppercase tracking-wider text-muted-foreground text-[11px]">{label}</span>
          <div className="font-bold text-primary-text truncate tabular-nums leading-tight text-2xl" data-testid="benchmark-value">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div className="mb-4 font-karla">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Activity Benchmarks</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Worked Time" value={data.total_work} />
        <div className="group relative overflow-hidden flex items-center gap-4 bg-secondary-surface border border-gray-300 rounded-md px-6 py-4 shadow-xs hover:shadow-sm transition-shadow" data-testid="benchmark">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Activity</span>
            <span className="text-xl font-bold text-foreground tabular-nums leading-tight" data-testid="benchmark-value">
              {avg}
              <span className="text-sm font-semibold text-muted-foreground">%</span>
            </span>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${avg}%` }} />
            </div>
          </div>
        </div>
        <Stat label="Screenshots" value={shotCount} />
        <Stat label="Total Slots" value={data.total_hourly_slots} />
      </div>
    </div>
  );
}

function EmptyScreenshots({ date, timezone }: { date: string; timezone: string }) {
  return (
    <div className="w-full flex-1 min-h-[60vh] md:min-h-fit bg-secondary-surface/50 rounded-xl border border-layout-subtle shadow-sm py-16 flex flex-col items-center justify-center text-center" data-testid="screenshots-empty">
      <div className="flex flex-col items-center text-center max-w-md w-full mx-auto px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="No data" loading="lazy" width={360} height={349} decoding="async" className="-mb-20" src="/no-data-placeholder.svg" style={{ color: "transparent" }} />
        <p className="text-sm font-medium text-secondary-text mt-2">No screenshots for the selected date</p>
        <p className="text-xs text-muted-foreground mt-1">Try a different date to see screenshots and activity.</p>
        <div className="w-full h-px my-4 bg-linear-to-r from-transparent via-border to-transparent" />
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap justify-center">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>{dayjs(date).format("dddd, MMMM D, YYYY")}</span>
          </div>
          <div className="size-1 rounded-full bg-border" />
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 shrink-0" />
            <span>{timezone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HourGroup({
  hour,
  selected,
  onToggleIds,
  onDelete,
  onView,
}: {
  hour: ActivityHourlySlot;
  selected: Set<string>;
  onToggleIds: (ids: string[], on: boolean) => void;
  onDelete: (ids: string[]) => void;
  onView: (shot: ActivityShot) => void;
}) {
  const items = hour.ten_minute_slots;
  const first = items.findIndex(isActive);
  let last = -1;
  items.forEach((s, i) => isActive(s) && (last = i));
  if (first === -1) return null;
  const visible = items.slice(first, last + 1);
  const groupIds = visible.filter((s) => !s.is_deleted).flatMap(ids);
  const all = groupIds.length > 0 && groupIds.every((x) => selected.has(x));
  const some = !all && groupIds.some((x) => selected.has(x));
  return (
    <div className="p-4" data-testid="hour-group">
      <div className="flex flex-col w-full relative bg-transparent">
        <div className="absolute left-2 top-6 w-0.5 h-full bg-gray-400" />
        <Checkbox
          variant="brand"
          shape="circle"
          checked={some ? "indeterminate" : all}
          disabled={groupIds.length === 0}
          onCheckedChange={() => groupIds.length && onToggleIds(groupIds, !all)}
          className="absolute left-0.5 top-1 z-10 cursor-pointer"
          aria-label="Select hour"
        />
        <div className="flex flex-col w-full pl-10">
          <div className="mb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="text-sm leading-relaxed tracking-wide normal-case whitespace-normal font-semibold text-gray-600" data-testid="hour-label">
                {hourLabel(hour.hour_slot)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hour.total_duration_seconds > 0 && (
                <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 overflow-hidden border-transparent bg-primary text-primary-foreground">
                  {durationPill(hour.total_duration_seconds)}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 3xl:grid-cols-6 4xl:grid-cols-6 gap-4">
            {visible.map((s) => {
              const sIds = ids(s);
              const can = sIds.length > 0 && !s.is_deleted;
              const isSel = can && sIds.some((x) => selected.has(x));
              const common = {
                timeSlot: slotLabel(s.time_slot),
                isDeleted: s.is_deleted,
                selected: isSel,
                onToggle: can ? () => onToggleIds(sIds, !isSel) : undefined,
                onDelete: can ? () => onDelete(sIds) : undefined,
              };
              return (
                <div key={s.time_slot}>
                  {s.is_manual ? (
                    <ManualSlotCard {...common} project={s.project} task={s.task} />
                  ) : hasActivity(s) && s.screenshots.length > 0 ? (
                    <ScreenshotSlotCard
                      {...common}
                      shots={s.screenshots}
                      activity={s.activity_percentage}
                      keyPresses={s.key_presses}
                      mouse={s.mouse_clicks + s.mouse_movements}
                      onView={() => onView(s.screenshots[0])}
                      mode="every_ten_minutes"
                      flags={s.fraud_flags}
                    />
                  ) : hasActivity(s) ? (
                    <NoShotCard {...common} activity={s.activity_percentage} keyPresses={s.key_presses} mouse={s.mouse_clicks + s.mouse_movements} project={s.project} task={s.task} />
                  ) : (
                    <NoShotCard {...common} project={s.project} task={s.task} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AllRecords({ data, onView }: { data: ActivityScreenshotsResponse; onView: (shot: ActivityShot) => void }) {
  return (
    <>
      {(data.hourly_buckets ?? []).map((b) => (
        <div className="p-4" key={b.hour_slot} data-testid="hour-group">
          <div className="flex flex-col w-full relative bg-transparent">
            <div className="absolute left-1.25 top-4.75 w-0.5 h-full bg-gray-400" />
            <div className="absolute top-0.5 w-3 h-3 bg-white border-2 border-gray-400 rounded-full" />
            <div className="flex flex-col w-full pl-8">
              <div className="flex mb-4">
                <p className="text-sm leading-relaxed normal-case whitespace-normal font-medium text-gray-800 dark:text-gray-500">{hourLabel(b.hour_slot)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-4 4xl:grid-cols-4 gap-4">
                {b.screenshots.map((s) => (
                  <ScreenshotSlotCard
                    key={s.id}
                    shots={[s]}
                    timeSlot={s.captured_at_user_tz.split(" ").slice(1, 3).join(" ")}
                    activity={0}
                    keyPresses={0}
                    mouse={0}
                    onView={() => onView(s)}
                    mode="all_records"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function ScreenshotsPage() {
  const { get, update } = useQueryParams();
  const { user, userId: me, user_time_zone, organizationId } = useSession();
  const qc = useQueryClient();
  const date = get("date") || dayjs().format("YYYY-MM-DD");
  const userId = get("user_id") || me || "";
  const userName = get("user_name") || (userId === me ? user?.full_name : "") || "";
  const view: ViewMode = get("view") === "all_records" ? "all_records" : "every_ten_minutes";
  const timezone = get("timezone") || user_time_zone || "America/New_York";
  const projectId = get("project_id") || "";
  const projectName = get("project_name") || "";
  const timeType = get("time_type") || "";
  const activityLevel = get("activity_level") || "";
  const detectionKind = get("detection_kind") || "";

  const [toggles, setToggles] = React.useState<Record<string, boolean>>(() => ({
    user: true,
    timezone: true,
    project: !!projectId,
    timeType: !!timeType,
    activityLevel: !!activityLevel,
    detectionKind: !!detectionKind,
  }));
  const { data: projects = [] } = useProjects(userId);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = React.useState<string[] | null>(null);
  const [viewer, setViewer] = React.useState<{ shots: ActivityShot[]; id: number } | null>(null);

  const query = new URLSearchParams({ activity_date: date, timezone, view_mode: view, ...(userId ? { user_id: userId } : {}) }).toString();
  const { data: raw, isLoading } = useApiQuery<ActivityScreenshotsResponse>({
    endpoint: `/activity-screenshots/${organizationId}?${query}`,
    queryKey: ["screenshots", String(organizationId ?? ""), query, timezone],
    enabled: !!organizationId,
  });
  const data = React.useMemo(() => (raw ? applyFilters(raw, { projectName, timeType, activityLevel, detectionKind }) : undefined), [raw, projectName, timeType, activityLevel, detectionKind]);
  React.useEffect(() => setSelected(new Set()), [query]);

  const hours = data?.hourly_slots ?? [];
  const allShots = React.useMemo(
    () => (view === "all_records" ? (data?.hourly_buckets ?? []).flatMap((b) => b.screenshots) : hours.flatMap((h) => h.ten_minute_slots.flatMap((s) => s.screenshots))),
    [data, hours, view],
  );
  const empty = !isLoading && (view === "all_records" ? !data?.hourly_buckets?.length : !hours.some((h) => h.ten_minute_slots.some(isActive)));
  const anyChip = toggles.project || toggles.timeType || toggles.activityLevel || toggles.detectionKind;

  const toggle = (key: string) => {
    const on = toggles[key];
    if (on) {
      if (key === "project") update({ project_id: null, project_name: null });
      if (key === "timeType") update({ time_type: null });
      if (key === "activityLevel") update({ activity_level: null });
      if (key === "detectionKind") update({ detection_kind: null });
    }
    setToggles((t) => ({ ...t, [key]: !on }));
  };
  const clearAll = () => {
    update({ project_id: null, project_name: null, time_type: null, activity_level: null, detection_kind: null, timezone: null });
    setToggles({ user: true, timezone: true, project: false, timeType: false, activityLevel: false, detectionKind: false });
  };

  const doDelete = async (reason: string) => {
    if (!pendingDelete) return;
    const list = pendingDelete;
    setPendingDelete(null);
    setSelected(new Set());
    try {
      await apiSend("DELETE", `/delete/screenshot-slot/${organizationId}/${userId}`, { local_activity_duration_id: list, ...(reason.trim() ? { delete_reason: reason.trim() } : {}) });
      toast.success("Slots deleted successfully");
      qc.invalidateQueries({ queryKey: ["screenshots", String(organizationId ?? "")] });
      qc.invalidateQueries({ queryKey: ["deleted-screenshots"] });
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete time slot");
    }
  };

  return (
    <div className="font-karla pt-2 flex flex-col md:min-h-0 md:flex-1 pb-2" data-testid="screenshots-page">
      <div className="flex flex-col w-full gap-2 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FiltersPopover options={FILTER_OPTIONS} values={toggles} onToggle={toggle} onClear={clearAll} />
            <MemberSelect value={userId} onChange={(m) => update({ user_id: m.user_id, user_name: m.full_name })} onClear={() => update({ user_id: null, user_name: null })} />
            <TimezoneSelect value={timezone} onChange={(tz) => update({ timezone: tz })} onClear={() => update({ timezone: null })} />
            {anyChip && (
              <div className="flex items-center gap-2 flex-wrap">
                {toggles.project && (
                  <OptionChip
                    label="Project"
                    title="Filter by Project"
                    searchPlaceholder="Search project"
                    options={projects.map((p) => ({ value: p.id, label: p.name }))}
                    value={projectId ? [projectId] : []}
                    onChange={(v) => update({ project_id: v[0] ?? null, project_name: projects.find((p) => p.id === v[0])?.name ?? null })}
                    icon={<BriefcaseBusiness className="size-4 shrink-0" />}
                    testId="project-chip"
                  />
                )}
                {toggles.timeType && (
                  <OptionChip label="Time Type" title="Time Type" searchPlaceholder="Search time type" options={TIME_TYPES} value={timeType.split(",").filter(Boolean)} onChange={(v) => update({ time_type: v.join(",") })} multiple testId="time-type-chip" />
                )}
                {toggles.activityLevel && (
                  <OptionChip label="Activity" title="Filter by Activity Level" searchPlaceholder="Search activity level" options={ACTIVITY_LEVELS} value={activityLevel ? [activityLevel] : []} onChange={(v) => update({ activity_level: v[0] ?? null })} testId="activity-chip" />
                )}
                {toggles.detectionKind && (
                  <OptionChip label="Detection Kinds" title="Filter by Detection Kind" searchPlaceholder="Search detection kind" options={KINDS} value={detectionKind.split(",").filter(Boolean)} onChange={(v) => update({ detection_kind: v.join(",") })} multiple testId="detection-chip" />
                )}
                <button type="button" title="Clear Filters" className={cn(THEMED_BUTTON, "h-9 px-3 rounded-lg")} onClick={clearAll} data-testid="clear-filters-chip">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view === "all_records" ? "All" : "10 min"} onValueChange={(v) => update({ view: v === "All" ? "all_records" : "every_ten_minutes" })}>
              <TabsList>
                {["10 min", "All"].map((t) => (
                  <TabsTrigger key={t} value={t} className="text-sm">
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <DayNavigator value={date} onChange={(d) => update({ date: d })} />
            <ActionMenu
              label="Actions"
              testId="screenshots-actions"
              items={[
                {
                  label: "View Timesheet",
                  icon: <FileText className="size-4" />,
                  onSelect: () => window.open(`/organizations/${organizationId}/timesheets/view_edit?date=${date}&start_date=${date}&end_date=${date}${userId ? `&user_id=${userId}` : ""}`, "_blank"),
                },
                { label: "Bulk Download Screenshots", icon: <Download className="size-4" />, onSelect: () => setBulkOpen(true), testId: "bulk-download-item" },
              ]}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-2 grid grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer aspect-video rounded-xl bg-primary/10 dark:bg-primary/15" />
          ))}
        </div>
      ) : empty || !data ? (
        <EmptyScreenshots date={date} timezone={timezone} />
      ) : (
        <div className="p-2 flex flex-col h-[74vh] md:h-[76vh] lg:h-[78vh] xl:h-[80vh] 2xl:h-[82vh]" style={{ width: "100%", overflow: "hidden" }}>
          {view === "every_ten_minutes" && <Benchmarks data={data} shotCount={allShots.length} />}
          {view === "every_ten_minutes" && selected.size > 0 && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-muted rounded-md border border-border" data-testid="selection-bar">
              <span className="text-sm text-muted-foreground flex-1">
                {selected.size} slot{selected.size !== 1 ? "s" : ""} selected
              </span>
              <button type="button" className={cn(SURFACE_BUTTON, "h-8 px-3 gap-1.5")} onClick={() => setSelected(new Set())}>
                <X className="size-3.5" />
                Cancel
              </button>
              <button type="button" className={cn(SURFACE_BUTTON, "h-8 px-3 gap-1.5 border-transparent bg-destructive text-white hover:bg-destructive/90")} onClick={() => setPendingDelete([...selected])} data-testid="selection-delete">
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
          <div className="overflow-auto flex-1 w-full" data-testid="screenshots-scroll">
            {view === "every_ten_minutes" ? (
              hours.map((h) => (
                <HourGroup
                  key={h.hour_slot}
                  hour={h}
                  selected={selected}
                  onToggleIds={(list, on) =>
                    setSelected((prev) => {
                      const n = new Set(prev);
                      list.forEach((x) => (on ? n.add(x) : n.delete(x)));
                      return n;
                    })
                  }
                  onDelete={(list) => setPendingDelete(list)}
                  onView={(shot) => setViewer({ shots: allShots, id: shot.id })}
                />
              ))
            ) : (
              <AllRecords data={data} onView={(shot) => setViewer({ shots: allShots, id: shot.id })} />
            )}
          </div>
        </div>
      )}

      {viewer && <ScreenshotLightbox shots={viewer.shots} initialId={viewer.id} userId={userId} timezone={timezone} onClose={() => setViewer(null)} />}
      <DeleteSlotsDialog open={!!pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={doDelete} />
      <BulkDownloadDialog open={bulkOpen} onOpenChange={setBulkOpen} userId={userId} userName={userName} date={date} timezone={timezone} />
    </div>
  );
}
