"use client";

/**
 * Calendar › Timeoff Requests (/organizations/{org}/timeoff/requests) and Absence & Leave › Requests
 * (/organizations/{org}/absence_leave/requests) — one component, the A&L variant adds the tab bar.
 * Port of the live chunk 2vnwr-9yq0c25: filters (Timezone, User, Time Off Policy, Team), ‹ date range › (one-day steps),
 * stat cards, Pending / Approved / Denied / All tabs with counts, "+ Time off", View column menu, table with row ⋮ actions,
 * "Page x of y" pager. URL params: status, page, perPage, start_date, end_date, timezone, user_id, time_off_policy_id, team_id, sort.
 */
import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { DropdownMenu } from "radix-ui";
import { CircleCheck, CircleX, Clock, Eye, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import type { TimeOffRequest, TimeOffRequestsResponse, TimeOffStatus } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { FiltersPopover } from "@/components/filters/FiltersPopover";
import { TimezoneSelect } from "@/components/filters/TimezoneSelect";
import { DotsIcon } from "@/components/filters/ActionMenu";
import { ACTION_MENU_CONTENT, ACTION_MENU_ITEM } from "@/components/filters/styles";
import { DateRangePicker } from "@/components/dashboard/shared/DateRangePicker";
import { AbsenceTabs, AvatarLetter, ColumnsMenu, DataTable, MultiPickChip, ORG_TZ, StatusChip, TablePager, useAllMembers, useAllPolicies, useOrgId, useTeams, type Column, type SortState } from "./shared";
import { AttachmentList, DeleteRequestDialog, RequestFormDialog, StatusConfirm, useInvalidateTimeOff, ViewRequestDialog } from "./RequestDialogs";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/components/filters/toast";

const TABS: { value: "" | TimeOffStatus; label: string; count: keyof TimeOffRequestsResponse["status_counts"] | "all" }[] = [
  { value: "submitted", label: "Pending", count: "submitted" },
  { value: "approved", label: "Approved", count: "approved" },
  { value: "denied", label: "Denied", count: "denied" },
  { value: "", label: "All", count: "all" },
];

const NAV_BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 cursor-pointer dark:bg-input/30 text-primary-foreground size-9 bg-secondary-surface border border-ui-border dark:border-secondary-surface rounded-lg shadow-none disabled:pointer-events-none disabled:opacity-50";

function StatCard({ label, value, bar }: { label: string; value: number; bar: string }) {
  return (
    <div className="group relative overflow-hidden rounded-md bg-secondary-surface shadow-xs border border-ui-border px-6 py-4" data-testid="stat-card">
      <div className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full scale-y-0 group-hover:scale-y-100 origin-center transition-transform", bar)} />
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="font-medium uppercase tracking-wider text-muted-foreground text-[11px]">{label}</span>
          <div className="font-bold text-primary-text truncate tabular-nums leading-tight text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}

/** ‹ [Oct 23, 2026 - Nov 30, 2026] › — moves the range by one day; › stops at today + 3 months. */
function RangeControl({ start, end, onChange }: { start: string; end: string; onChange: (s: string, e: string) => void }) {
  const max = dayjs().add(3, "month").format("YYYY-MM-DD");
  const [draft, setDraft] = React.useState<{ start: Date | null; end: Date | null } | null>(null);
  const shift = (n: number) => onChange(dayjs(start).add(n, "day").format("YYYY-MM-DD"), dayjs(end).add(n, "day").format("YYYY-MM-DD"));
  return (
    <div className="flex items-center gap-2">
      <button data-slot="button" type="button" className={NAV_BTN} aria-label="Previous period" data-testid="range-prev" onClick={() => shift(-1)}>
        <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
      <DateRangePicker
        value={draft ?? { start: dayjs(start).toDate(), end: dayjs(end).toDate() }}
        triggerClassName="w-60 max-w-md border border-ui-border shadow-none rounded-lg bg-secondary-surface h-9 flex items-center justify-start text-left font-normal"
        onDateRangeChange={(r) => {
          if (r.start && r.end) {
            setDraft(null);
            onChange(dayjs(r.start).format("YYYY-MM-DD"), dayjs(r.end).format("YYYY-MM-DD"));
          } else setDraft(r);
        }}
      />
      <button data-slot="button" type="button" className={NAV_BTN} aria-label="Next period" data-testid="range-next" disabled={end >= max} onClick={() => shift(1)}>
        <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
    </div>
  );
}

function trunc(text: string, n: number) {
  if (!text || text.length <= n) return <span>{text || "—"}</span>;
  return (
    <span className="inline-flex items-center gap-2" title={text}>
      {text.slice(0, n)}...
      <Info className="size-3.5 shrink-0" />
    </span>
  );
}

const fmtDay = (d: string) => dayjs(d).format("ddd, MMM, DD, YYYY");
const hoursOf = (r: TimeOffRequest) => r.details.reduce((s, d) => s + dayjs(d.stopped_at_datetime).diff(dayjs(d.started_at_datetime), "hour", true), 0);

type Dialog = { kind: "view" | "edit" | "delete"; row: TimeOffRequest } | { kind: "status"; row: TimeOffRequest; status: "approved" | "denied" } | null;

function RowActions({ row, onOpen }: { row: TimeOffRequest; onOpen: (d: Dialog) => void }) {
  const { userId } = useSession();
  const own = row.user_id === userId;
  const s = row.status;
  const items = [
    { label: "View", icon: <Eye className="size-4 text-blue-500" />, show: true, cls: "hover:bg-blue-50 dark:hover:bg-blue-500/15", on: () => onOpen({ kind: "view", row }) },
    { label: "Edit", icon: <Pencil className="size-4 text-blue-500" />, show: s === "submitted", cls: "hover:bg-blue-50 dark:hover:bg-blue-500/15", on: () => onOpen({ kind: "edit", row }) },
    { label: "Approve", icon: <CircleCheck className="size-4 text-green-600" />, show: !own && (s === "submitted" || s === "denied"), cls: "hover:bg-green-50 dark:hover:bg-green-500/15", text: "text-green-600", on: () => onOpen({ kind: "status", row, status: "approved" }) },
    { label: "Reject", icon: <CircleX className="size-4 text-amber-600" />, show: !own && (s === "submitted" || s === "approved"), cls: "hover:bg-amber-50 dark:hover:bg-amber-500/15", text: "text-amber-600", on: () => onOpen({ kind: "status", row, status: "denied" }) },
    { label: "Delete", icon: <Trash2 className="size-4 text-red-600" />, show: s === "submitted", cls: "hover:bg-red-100 dark:hover:bg-red-500/20", text: "text-red-600", on: () => onOpen({ kind: "delete", row }) },
  ].filter((i) => i.show);
  return (
    <div className="flex justify-end w-full">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <div data-slot="action-menu-trigger" role="button" tabIndex={0} data-testid="row-actions" className="w-8 h-8 duration-200 flex items-center justify-center cursor-pointer rounded-lg shadow-xs border bg-secondary border-border">
            <DotsIcon />
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className={ACTION_MENU_CONTENT} data-testid="row-actions-menu">
            <DropdownMenu.Label className="text-sm font-medium px-3 py-2 border-b border-border">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Actions</span>
            </DropdownMenu.Label>
            {items.map((i) => (
              <DropdownMenu.Item key={i.label} className={cn(ACTION_MENU_ITEM, i.cls)} onSelect={i.on} data-testid={`row-action-${i.label.toLowerCase()}`}>
                <div className="flex items-center gap-3">
                  {i.icon}
                  <span className={cn("font-medium text-sm", i.text ?? "text-gray-700 dark:text-gray-300")}>{i.label}</span>
                </div>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: "timezoneFilter", label: "Timezone", description: "Default Filter", locked: true },
  { key: "userFilter", label: "User" },
  { key: "policyFilter", label: "Time Off Policy" },
  { key: "teamFilter", label: "Team" },
];

export function TimeOffFilterBar() {
  const { get, update } = useQueryParams();
  const [shown, setShown] = React.useState<Record<string, boolean>>(() => ({ timezoneFilter: true, userFilter: !!get("user_id"), policyFilter: !!get("time_off_policy_id"), teamFilter: !!get("team_id") }));
  const { data: members } = useAllMembers();
  const { data: policies } = useAllPolicies();
  const teams = useTeams();
  const list = (k: string) => (get(k) ?? "").split(",").filter(Boolean);
  const param = { userFilter: "user_id", policyFilter: "time_off_policy_id", teamFilter: "team_id" } as Record<string, string>;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FiltersPopover
        options={FILTER_OPTIONS}
        values={shown}
        onToggle={(k) => {
          if (shown[k] && param[k]) update({ [param[k]]: null, page: null });
          setShown((s) => ({ ...s, [k]: !s[k] }));
        }}
        onClear={() => {
          update({ user_id: null, time_off_policy_id: null, team_id: null, page: null });
          setShown({ timezoneFilter: true, userFilter: false, policyFilter: false, teamFilter: false });
        }}
      />
      <TimezoneSelect value={get("timezone") || ORG_TZ} onChange={(tz) => update({ timezone: tz })} onClear={() => update({ timezone: null })} />
      {shown.userFilter && (
        <MultiPickChip
          label="Users"
          title="Filter by user"
          searchPlaceholder="Search members"
          allLabel="All Users"
          testId="users-filter"
          options={(members ?? []).map((m) => ({ value: m.user_id, label: m.full_name, sub: m.email, avatar: { name: m.full_name, src: m.profile_image_url } }))}
          value={list("user_id")}
          onApply={(v) => update({ user_id: v.join(",") || null, page: null })}
        />
      )}
      {shown.policyFilter && (
        <MultiPickChip
          label="Time Off Policy"
          title="Filter by Timeoff Policy"
          searchPlaceholder="Search time off policy"
          testId="policy-filter"
          options={(policies?.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
          value={list("time_off_policy_id")}
          onApply={(v) => update({ time_off_policy_id: v.join(",") || null, page: null })}
        />
      )}
      {shown.teamFilter && (
        <MultiPickChip
          label="Team"
          title="Filter by team"
          searchPlaceholder="Search teams"
          allLabel="All Teams"
          testId="team-filter"
          options={teams.map((t) => ({ value: String(t.id), label: t.name }))}
          value={list("team_id")}
          onApply={(v) => update({ team_id: v.join(",") || null, page: null })}
        />
      )}
    </div>
  );
}

export function RequestsPage({ variant }: { variant: "calendar" | "absence" }) {
  const org = useOrgId();
  const { get, update } = useQueryParams();
  const invalidate = useInvalidateTimeOff();
  const status = (get("status") ?? "") as "" | TimeOffStatus;
  const start = get("start_date") || dayjs().subtract(7, "day").format("YYYY-MM-DD");
  const end = get("end_date") || (variant === "calendar" ? dayjs().add(1, "month").endOf("month").format("YYYY-MM-DD") : dayjs().add(3, "month").format("YYYY-MM-DD"));
  const timezone = get("timezone") || ORG_TZ;
  const page = Math.max(0, Number(get("page") ?? 0) || 0);
  const perPage = Number(get("perPage") ?? 25) || 0;
  const sortParam = get("sort") ?? "";
  const sort: SortState | null = sortParam ? { key: sortParam.replace(/^-/, ""), dir: sortParam.startsWith("-") ? "desc" : "asc" } : null;
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [creating, setCreating] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const qs = new URLSearchParams({ limit: String(perPage || 1000), offset: String(page * (perPage || 1000)), start_date: start, end_date: end, timezone });
  if (status) qs.set("status", status);
  for (const [k, p] of [
    ["user_id", "filter_user_id"],
    ["time_off_policy_id", "time_off_policy_id"],
    ["team_id", "team_id"],
  ])
    if (get(k)) qs.set(p, get(k)!);
  if (sortParam) qs.set("sort", sortParam);
  const { data, isLoading } = useApiQuery<TimeOffRequestsResponse>({
    endpoint: `/time-off/requests/${org}?${qs.toString()}`,
    queryKey: ["list", "TIMEOFF_REQUESTS", { organizationId: org }, start, end, status, timezone, get("user_id") ?? "", get("time_off_policy_id") ?? "", get("team_id") ?? "", { page }, { perPage }, { sort: sortParam }],
  });
  const counts = data?.status_counts ?? { submitted: 0, approved: 0, denied: 0 };
  const all = counts.submitted + counts.approved + counts.denied;

  const columns: Column<TimeOffRequest>[] = [
    {
      id: "user_name",
      header: "Member",
      menuLabel: "User name",
      sortKey: "user_name",
      cell: (r) => (
        <Link href={`/organizations/${org}/members/${r.user_id}`}>
          <div className="py-0.5 flex items-center gap-1">
            <AvatarLetter name={r.user_name} src={r.profile_image_url} />
            <span className="text-primary font-semibold">{r.user_name}</span>
          </div>
        </Link>
      ),
    },
    {
      id: "leave_type",
      header: "Leave Type",
      cell: (r) => (
        <span className="font-semibold flex items-center gap-1">
          <Clock className="size-4 text-primary" />
          {r.leave_type === "full_day" ? "Full Day Leave" : "Partial Leave"}
        </span>
      ),
    },
    { id: "policy_name", header: "Policy Name", cell: (r) => trunc(r.policy_name, 30) },
    { id: "notes", header: "Notes", cell: (r) => trunc(r.notes, 40) },
    { id: "started_at_date", header: "Start", menuLabel: "Started at date", sortKey: "started_at_date", cell: (r) => fmtDay(r.started_at_date) },
    { id: "stopped_at_date", header: "End", menuLabel: "Stopped at date", sortKey: "stopped_at_date", cell: (r) => fmtDay(r.stopped_at_date) },
    { id: "details", header: "Days", menuLabel: "Details", cell: (r) => <span className="p-1.5 w-16">{`${r.details.length} ${r.details.length === 1 ? "day" : "days"}`}</span> },
    {
      id: "hours",
      header: "Hours",
      menuLabel: "Hours requested",
      cell: (r) => (
        <button type="button" className="cursor-pointer font-bold text-primary" onClick={() => setDialog({ kind: "view", row: r })}>
          {hoursOf(r).toFixed(1)} hrs
        </button>
      ),
    },
    { id: "status", header: "Status", cell: (r) => <StatusChip status={r.status} /> },
    ...(status === "approved" ? [{ id: "approved_by", header: "Approved By", cell: (r: TimeOffRequest) => <span>{r.approved_by ?? "-"}</span> }] : []),
    { id: "created_at", header: "Requested on", sortKey: "created_at", cell: (r) => fmtDay(r.created_at.slice(0, 10)) },
    { id: "attachments", header: "Attachments", cell: (r) => <AttachmentList attachments={r.attachments} requestId={r.id} /> },
    { id: "actions", header: "Action", cell: (r) => <RowActions row={r} onOpen={setDialog} /> },
  ];

  const setStatus = async () => {
    if (dialog?.kind !== "status") return;
    setPending(true);
    try {
      await apiSend("PATCH", `/status-update/time-off/${org}/${dialog.row.id}`, { status: dialog.status, reason_notes: dialog.status === "denied" ? reason : "", timezone: ORG_TZ });
      toast.success("Status updated successfully");
      invalidate();
      setDialog(null);
    } catch (e) {
      toast.error((e as Error).message || "Failed to update status");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="font-karla pt-2 pb-6 flex flex-col md:min-h-0 md:flex-1" data-testid={variant === "absence" ? "absence-requests-page" : "timeoff-requests-page"}>
      {variant === "absence" && <AbsenceTabs />}
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="flex shrink-0 justify-between gap-2 flex-wrap">
          <TimeOffFilterBar />
          <RangeControl start={start} end={end} onChange={(s, e) => update({ start_date: s, end_date: e, page: null })} />
        </div>
        <div className="grid shrink-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Requests" value={counts.submitted} bar="bg-yellow-400" />
          <StatCard label="Approved" value={counts.approved} bar="bg-green-400" />
          <StatCard label="Rejected" value={counts.denied} bar="bg-red-400" />
          <StatCard label="This Month" value={data?.current_month_total ?? 0} bar="bg-blue-400" />
        </div>
        <div className="flex flex-col h-full min-h-0 w-full font-karla">
          <div className="bg-transparent shrink-0 mb-4">
            <div className="flex flex-wrap items-center gap-2 justify-between lg:flex-row">
              <div className="flex flex-1 items-center gap-2">
                <div role="tablist" data-slot="tabs-list" data-variant="pill" className="inline-flex items-center border border-ui-border bg-secondary-surface p-0.5 text-foreground rounded-md w-fit max-w-full overflow-x-auto h-10">
                  {TABS.map((t) => {
                    const on = status === t.value;
                    const n = t.count === "all" ? all : counts[t.count];
                    return (
                      <button
                        key={t.label}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        data-state={on ? "active" : "inactive"}
                        data-slot="tabs-trigger"
                        data-testid={`status-tab-${t.label.toLowerCase()}`}
                        onClick={() => update({ status: t.value || null, page: null })}
                        className={cn("inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap text-sm rounded-sm px-4 h-8 cursor-pointer", on ? "bg-primary text-primary-foreground" : "dark:text-foreground")}
                      >
                        {t.label}
                        <span className={cn("text-xs font-semibold", on ? "text-primary-foreground/80" : "text-muted-foreground")}>({n})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-0 flex items-center flex-wrap gap-2">
                <button
                  data-slot="button"
                  type="button"
                  data-testid="add-timeoff"
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer font-medium h-9 gap-2 px-4 text-sm bg-[image:var(--gradient-theme)] text-white rounded-lg hover:opacity-90 [&_svg]:size-4"
                >
                  <Plus />
                  Time off
                </button>
                <ColumnsMenu columns={columns.filter((c) => c.id !== "actions")} hidden={hidden} onChange={setHidden} />
              </div>
            </div>
          </div>
          <div className="relative h-1 w-full shrink-0" />
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(r) => r.id}
            hidden={hidden}
            onHide={(id) => setHidden((h) => [...h, id])}
            onResetColumns={() => setHidden([])}
            sort={sort}
            onSort={(s) => update({ sort: s ? `${s.dir === "desc" ? "-" : ""}${s.key}` : null, page: null })}
            selected={selected}
            onSelect={setSelected}
            loading={isLoading}
            testId="requests-table"
          />
          <TablePager total={data?.total ?? 0} page={page} perPage={perPage} onPage={(p) => update({ page: p ? String(p) : null })} onPerPage={(n) => update({ perPage: String(n), page: null })} sizes={[10, 25, 50, 100]} />
        </div>
      </div>
      <RequestFormDialog open={creating || dialog?.kind === "edit"} editing={dialog?.kind === "edit" ? dialog.row : null} onClose={() => (setCreating(false), setDialog(null))} />
      {dialog?.kind === "view" && <ViewRequestDialog data={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && <DeleteRequestDialog data={dialog.row} onClose={() => setDialog(null)} />}
      <StatusConfirm
        open={dialog?.kind === "status"}
        status={dialog?.kind === "status" ? dialog.status : null}
        reason={reason}
        setReason={setReason}
        touched={touched}
        setTouched={setTouched}
        pending={pending}
        onCancel={() => (setDialog(null), setReason(""), setTouched(false))}
        onContinue={setStatus}
      />
    </div>
  );
}
