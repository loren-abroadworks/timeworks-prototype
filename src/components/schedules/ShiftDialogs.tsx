"use client";

/**
 * Schedules dialogs (live chunks 1m93nb46ko10x / 04swdmkx34_jk):
 *  - ShiftFormDialog: "Create Shift" (name, type, members, timezone, expected hours, weekly limit, buffer, effective from,
 *    repeat forever, weekly schedule) and the "Edit Shift" form for one day (status, type, members disabled, day row)
 *  - ShiftPopup: "Shift ● Missed / Upcoming" details with Delete + Edit (Edit disabled for past shifts)
 *  - EditScopeDialog: "Only this shift" / "This and all future shifts"
 */
import * as React from "react";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog as DialogPrimitive, Select, Switch } from "radix-ui";
import { Check, ChevronDown, Clock, Info, Lock, LockOpen, XIcon } from "lucide-react";
import { apiSend, useApiQuery } from "@/lib/api-client";
import type { ShiftDay } from "@/lib/types/schedules";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MonthCalendar } from "@/components/filters/DateControls";
import { toast } from "@/components/filters/toast";
import { AvatarLetter, MultiPickChip, useAllMembers, useOrgId } from "@/components/timeoff/shared";

export const ORG_TZ_LABEL = "New York, United States (EDT)";
export const ORG_TZ = "America/New_York";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPES: [string, string][] = [
  ["fixed", "Fixed"],
  ["flexible", "Flexible"],
  ["hybrid_flex", "Hybrid Flex"],
];
export const typeLabel = (t: string | null) => TYPES.find(([v]) => v === t)?.[1] ?? "Fixed";
export const h12 = (t: string | null) => (t ? dayjs(`2000-01-01T${t}`).format("h:mm A") : "");

export function useInvalidateSchedules() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => (q.queryKey as unknown[]).includes("SCHEDULE_DATA") || (q.queryKey as unknown[]).includes("SHIFT_RULE_OVERVIEW") });
}

function Shell({ open, onClose, title, children, className, testId, header }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; className?: string; testId?: string; header?: React.ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-testid={testId}
          onInteractOutside={(e) => {
            const t = e.detail.originalEvent.target as HTMLElement | null;
            if (t?.closest("[data-radix-popper-content-wrapper]")) e.preventDefault();
          }}
          className={cn("fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-layout-subtle bg-background p-4 shadow-lg font-karla", className)}
        >
          <div className="flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            <div className="flex items-center gap-3">
              {header}
              <DialogPrimitive.Close aria-label="Close" className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-foreground/60 opacity-80 hover:opacity-100 [&_svg]:size-3.5">
                <XIcon />
              </DialogPrimitive.Close>
            </div>
          </div>
          <DialogPrimitive.Description className="sr-only">Shift details</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const LABEL = "text-xs font-semibold text-foreground";
const INPUT = "h-9 w-full rounded-md border border-ui-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-60";

function TypeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger data-testid="shift-type" className={cn(INPUT, "flex cursor-pointer items-center justify-between")}>
        <Select.Value />
        <ChevronDown className="size-4 opacity-50" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-120 w-(--radix-select-trigger-width) rounded-md border border-ui-border bg-popover p-1 shadow-md">
          <Select.Viewport>
            {TYPES.map(([v, l]) => (
              <Select.Item key={v} value={v} data-testid={`shift-type-${v}`} className="relative flex cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent">
                <Select.ItemText>{l}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2">
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function TimePill({ value, onChange, disabled, testId }: { value: string; onChange: (v: string) => void; disabled?: boolean; testId?: string }) {
  return (
    <label className={cn("flex h-7 items-center gap-1.5 rounded-md border border-blue-400/60 bg-secondary-surface px-2 text-xs", disabled && "opacity-50")}>
      <Clock className="size-3.5 text-muted-foreground" />
      <input type="time" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-[5.6rem] bg-transparent outline-none" data-testid={testId} />
    </label>
  );
}

interface DayRow {
  on: boolean;
  from: string;
  to: string;
  dayLock: boolean;
}

export interface ShiftEditData {
  userId: string;
  userName: string;
  date: string;
  day: ShiftDay;
  scope: "only_this" | "this_and_future";
}

/** Create Shift (any entry point) or Edit Shift for one day (`edit`). */
export function ShiftFormDialog({ open, onClose, defaultMembers, defaultDate, edit }: { open: boolean; onClose: () => void; defaultMembers?: string[]; defaultDate?: string; edit?: ShiftEditData | null }) {
  const org = useOrgId();
  const invalidate = useInvalidateSchedules();
  const { data: members } = useAllMembers();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("fixed");
  const [users, setUsers] = React.useState<string[]>([]);
  const [expected, setExpected] = React.useState("");
  const [weekly, setWeekly] = React.useState("");
  const [buffer, setBuffer] = React.useState("");
  const [from, setFrom] = React.useState(dayjs().format("YYYY-MM-DD"));
  const [forever, setForever] = React.useState(true);
  const [status, setStatus] = React.useState("active");
  const [rows, setRows] = React.useState<DayRow[]>([]);
  const [pending, setPending] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [dateOpen, setDateOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (edit) {
      const d = edit.day;
      setName("");
      setType(d.shift_type ?? "fixed");
      setUsers([edit.userId]);
      setExpected(d.minimum_hour_interval.replace(/^(\d):/, "0$1:").slice(0, 5));
      setBuffer(d.shift_buffer_seconds ? `${String(Math.floor(d.shift_buffer_seconds / 60)).padStart(2, "0")}:${String(d.shift_buffer_seconds % 60).padStart(2, "0")}` : "");
      setFrom(edit.date);
      setStatus(d.status ?? "active");
      setRows([{ on: true, from: (d.start ?? "09:00:00").slice(0, 5), to: (d.end ?? "17:00:00").slice(0, 5), dayLock: d.is_day_lock }]);
    } else {
      setName("");
      setType("fixed");
      setUsers(defaultMembers ?? []);
      setExpected("");
      setWeekly("");
      setBuffer("");
      setFrom(defaultDate ?? dayjs().format("YYYY-MM-DD"));
      setForever(true);
      setRows(DAYS.map((_, i) => ({ on: i < 5, from: "09:00", to: "17:00", dayLock: false })));
    }
  }, [open, edit, defaultMembers, defaultDate]);

  const workDays = rows.filter((r) => r.on).length;
  const noMembers = users.length === 0;
  const hhmm = (v: string) => (/^\d{1,2}:\d{2}$/.test(v) ? `${v.padStart(5, "0")}:00` : undefined);
  const bufSec = (v: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
  };

  const submit = async () => {
    setTouched(true);
    if (noMembers) return;
    if (rows.some((r) => r.on && r.to <= r.from)) return toast.error("End time must be after start time");
    setPending(true);
    try {
      if (edit) {
        const r = rows[0];
        const body = {
          source_timezone: ORG_TZ,
          name: name || "Shift",
          status,
          shift_type: type,
          shift_rule_id: edit.day.shift_rule_id,
          start_time: `${r.from}:00`,
          end_time: `${r.to}:00`,
          shift_date: edit.date,
          minimum_hour: hhmm(expected),
          shift_buffer_seconds: type === "fixed" ? bufSec(buffer) : undefined,
          is_day_lock: r.dayLock,
          is_time_lock: false,
        };
        if (edit.scope === "only_this") await apiSend("PUT", `/shift-update/${org}/${edit.userId}`, body);
        else await apiSend("PUT", `/user/shift-rule-update/${org}/${edit.userId}?effective_from=${edit.date}&shift_type=${type}`, body);
        toast.success("Shift updated successfully");
      } else {
        await apiSend("POST", `/shift-create/${org}`, {
          users,
          name,
          status: "active",
          shift_type: type,
          minimum_hour: hhmm(expected),
          shift_buffer_seconds: type === "fixed" ? bufSec(buffer) : undefined,
          weekly_limit: hhmm(weekly),
          timezone: ORG_TZ,
          days_of_week: rows.map((r, i) => ({ r, day: i + 1 })).filter((x) => x.r.on).map(({ r, day }) => ({ day, start_time: `${r.from}:00`, end_time: `${r.to}:00`, is_day_lock: r.dayLock, is_time_lock: false })),
          effective_from: from,
          effective_to: forever ? undefined : dayjs(from).add(3, "month").format("YYYY-MM-DD"),
        });
        toast.success("Shift created successfully");
      }
      invalidate();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || (edit ? "Failed to update shift" : "Failed to create shift"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Shell open={open} onClose={onClose} title={edit ? "Edit Shift" : "Create Shift"} className="md:max-w-170 lg:max-w-3xl" testId="shift-form-dialog">
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {edit ? (
          <div className="space-y-1">
            <p className={LABEL}>Status</p>
            <Select.Root value={status} onValueChange={setStatus}>
              <Select.Trigger className={cn(INPUT, "flex cursor-pointer items-center justify-between")}>
                <Select.Value />
                <ChevronDown className="size-4 opacity-50" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content position="popper" sideOffset={4} className="z-120 w-(--radix-select-trigger-width) rounded-md border border-ui-border bg-popover p-1 shadow-md">
                  <Select.Viewport>
                    {[
                      ["active", "Active"],
                      ["inactive", "Inactive"],
                    ].map(([v, l]) => (
                      <Select.Item key={v} value={v} className="flex cursor-pointer items-center rounded-sm py-1.5 px-2 text-sm outline-none data-highlighted:bg-accent">
                        <Select.ItemText>{l}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        ) : (
          <div className="space-y-1">
            <p className={LABEL}>Shift Name</p>
            <input className={INPUT} placeholder="e.g., Morning Shift" value={name} onChange={(e) => setName(e.target.value)} data-testid="shift-name" />
          </div>
        )}
        <div className="space-y-1">
          <p className={LABEL}>Shift Type</p>
          <TypeSelect value={type} onChange={setType} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <p className={LABEL}>Members</p>
          {edit ? (
            <div className={cn(INPUT, "flex items-center gap-2 opacity-60")}>
              <AvatarLetter name={edit.userName} className="size-5" textClassName="text-[10px]" />
              {edit.userName}
            </div>
          ) : (
            <div className="[&>button]:w-full">
              <MultiPickChip
                label={users.length ? (members ?? []).filter((m) => users.includes(m.user_id)).map((m) => m.full_name).join(", ") || `${users.length} selected` : "Select Members"}
                title="Select Members"
                searchPlaceholder="Search members"
                testId="shift-members"
                options={(members ?? []).map((m) => ({ value: m.user_id, label: m.full_name, sub: m.email, avatar: { name: m.full_name, src: m.profile_image_url } }))}
                value={users}
                onApply={setUsers}
              />
            </div>
          )}
          {!edit && noMembers && <p className={cn("text-xs text-red-500", !touched && "opacity-90")}>Select at least one member</p>}
        </div>
        <div className="space-y-1">
          <p className={LABEL}>Timezone</p>
          <div className={cn(INPUT, "flex items-center justify-between opacity-60")}>
            {ORG_TZ_LABEL}
            <ChevronDown className="size-4 opacity-50" />
          </div>
        </div>
        <div className="space-y-1">
          <p className={cn(LABEL, "flex items-center gap-1")}>
            Expected Hours per Day <Info className="size-3 text-muted-foreground" />
          </p>
          <input className={INPUT} placeholder="HH:mm" value={expected} onChange={(e) => setExpected(e.target.value)} data-testid="shift-expected" />
        </div>
        {!edit && (
          <div className="space-y-1">
            <p className={cn(LABEL, "flex items-center gap-1")}>
              Weekly Limit <Info className="size-3 text-muted-foreground" />
            </p>
            <input className={INPUT} placeholder="HH:mm" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <p className={cn(LABEL, "flex items-center gap-1")}>
            Shift Buffer <Info className="size-3 text-muted-foreground" />
          </p>
          <input className={INPUT} placeholder="mm:ss" value={buffer} disabled={type !== "fixed"} onChange={(e) => setBuffer(e.target.value)} />
        </div>
        {!edit && (
          <div className="space-y-1">
            <p className={LABEL}>Effective Period</p>
            <p className="text-xs text-muted-foreground">Effective From</p>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger type="button" className={cn(INPUT, "flex cursor-pointer items-center gap-2")} data-testid="shift-from">
                <CalendarIcon />
                {dayjs(from).format("MMM D, YYYY")}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto! p-0">
                <MonthCalendar value={from} disableFuture={false} onSelect={(d) => (setFrom(d), setDateOpen(false))} />
              </PopoverContent>
            </Popover>
          </div>
        )}
        {!edit && (
          <div className="flex items-start justify-end gap-2 pt-1 text-xs text-muted-foreground">
            Repeat forever
            <Switch.Root checked={forever} onCheckedChange={setForever} className="relative h-5 w-9 cursor-pointer rounded-full bg-muted data-[state=checked]:bg-primary">
              <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
            </Switch.Root>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-ui-border bg-secondary-surface/60 p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {edit ? "Shift Day" : "Weekly Schedule"}
            {!edit && <span className="rounded-md border border-primary px-1.5 py-0.5 text-[11px] font-medium text-primary">{workDays} work days</span>}
          </p>
          <p className="text-sm font-semibold">Shift Timings</p>
        </div>
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const dayName = edit ? dayjs(edit.date).format("dddd") : DAYS[i];
            const upd = (p: Partial<DayRow>) => setRows((x) => x.map((y, k) => (k === i ? { ...y, ...p } : y)));
            return (
              <div key={dayName} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5", r.on ? "border-green-700/60 bg-green-900/20" : "border-ui-border bg-background/40")} data-testid="shift-day-row">
                <button type="button" title={r.dayLock ? "Day locked" : "Lock day"} onClick={() => upd({ dayLock: !r.dayLock })} className={cn("flex size-6 cursor-pointer items-center justify-center rounded-md", r.dayLock ? "bg-red-500 text-white" : "bg-green-700/40 text-green-200")}>
                  {r.dayLock ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                </button>
                {!edit && <Checkbox checked={r.on} onCheckedChange={(v) => upd({ on: v === true })} aria-label={dayName} />}
                <span className={cn("flex-1 text-sm", r.on ? "font-semibold" : "text-muted-foreground")}>{dayName}</span>
                {r.on ? (
                  <>
                    <TimePill value={r.from} onChange={(v) => upd({ from: v })} testId={`shift-from-${i}`} />
                    <span className="text-muted-foreground">—</span>
                    <TimePill value={r.to} onChange={(v) => upd({ to: v })} testId={`shift-to-${i}`} />
                    <span className="flex size-6 items-center justify-center rounded-md border border-ui-border text-muted-foreground">
                      <LockOpen className="size-3" />
                    </span>
                  </>
                ) : (
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">OFF</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={pending} data-testid="shift-submit" className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-positive)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Saving..." : edit ? "Update" : "Create Shift"}
        </button>
      </div>
    </Shell>
  );
}

const TAG: Record<string, { label: string; dot: string }> = {
  "on-time": { label: "On Time", dot: "bg-[#41B88D]" },
  missed: { label: "Missed", dot: "bg-[#D62839]" },
  late: { label: "Late", dot: "bg-muted-foreground" },
  abandoned: { label: "Abandoned", dot: "bg-[#FF8800]" },
  overtime: { label: "Over Time", dot: "bg-[#DEB200]" },
  upcoming: { label: "Upcoming", dot: "bg-muted-foreground" },
};

/** Shift details popup: Delete (red) + Edit (disabled for past shifts). */
export function ShiftPopup({ userId, userName, date, day, onClose, onEdit }: { userId: string; userName: string; date: string; day: ShiftDay; onClose: () => void; onEdit: () => void }) {
  const org = useOrgId();
  const invalidate = useInvalidateSchedules();
  const past = dayjs(date).isBefore(dayjs(), "day");
  const tag = TAG[day.status_tag ?? ""] ?? { label: "Today", dot: "bg-primary" };
  const rows: [React.ReactNode, string][] = [
    ["Shift Type", typeLabel(day.shift_type)],
    ["Shift Hours", `${h12(day.start)} — ${h12(day.end)}`],
    [
      <span key="b" className="flex items-center gap-1">
        Shift Buffer <Info className="size-3" />
      </span>,
      day.shift_buffer_interval ? day.shift_buffer_interval.slice(3) : "00:00",
    ],
    [
      <span key="e" className="flex items-center gap-1">
        Expected Hours per Day <Info className="size-3" />
      </span>,
      day.minimum_hour_interval.replace(/^(\d):/, "0$1:").slice(0, 5),
    ],
    ["Time Zone", ORG_TZ],
  ];
  return (
    <Shell
      open
      onClose={onClose}
      testId="shift-popup"
      className="sm:max-w-sm"
      title={
        <span className="flex items-center gap-2">
          Shift
          <span className="flex items-center gap-1 text-xs font-medium" data-testid="shift-popup-tag">
            <span className={cn("size-2 rounded-full", tag.dot)} />
            {tag.label}
          </span>
        </span>
      }
      header={<span className="text-xs text-muted-foreground">{dayjs(date).format("ddd, MMM D, YYYY")}</span>}
    >
      <a href={`/organizations/${org}/members/${userId}`} className="-mt-2 flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <AvatarLetter name={userName} className="size-6" textClassName="text-[11px]" />
        {userName}
      </a>
      <div className="divide-y divide-ui-border rounded-md border border-ui-border text-xs">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex items-center justify-between px-2 py-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid="shift-delete"
          onClick={async () => {
            try {
              await apiSend("DELETE", `/shift-delete/${org}`, { user_id: userId, shift_date: date, shift_rule_id: day.shift_rule_id });
              toast.success("Shift deleted successfully");
              invalidate();
              onClose();
            } catch (e) {
              toast.error((e as Error).message || "Failed to delete shift");
            }
          }}
          className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-negative)] px-4 text-sm font-medium text-white hover:opacity-90"
        >
          Delete
        </button>
        <button type="button" data-testid="shift-edit" disabled={past} onClick={onEdit} className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-theme)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
          Edit
        </button>
      </div>
    </Shell>
  );
}

/** Step 1 of Edit: "Only this shift" / "This and all future shifts". */
export function EditScopeDialog({ userId, date, onClose, onContinue }: { userId: string; date: string; onClose: () => void; onContinue: (scope: "only_this" | "this_and_future") => void }) {
  const org = useOrgId();
  const [scope, setScope] = React.useState<"only_this" | "this_and_future">("only_this");
  const { data, isLoading } = useApiQuery<{ shift_rules: { effective_from: string; effective_to: string | null }[] }>({ endpoint: `/user/shift-rule-overview/${org}/${userId}`, queryKey: ["SHIFT_RULE_OVERVIEW", String(org), userId] });
  const rule = data?.shift_rules.find((r) => r.effective_from <= date && (!r.effective_to || r.effective_to >= date));
  const opts = [
    { value: "only_this" as const, label: "Only this shift", description: "Change the timings for this single day" },
    { value: "this_and_future" as const, label: "This and all future shifts", description: `Edit the shift rule behind this day (${rule ? dayjs(rule.effective_from).format("MMM D, YYYY") : "—"} – ${rule?.effective_to ? dayjs(rule.effective_to).format("MMM D, YYYY") : "forever"})` },
  ];
  return (
    <Shell open onClose={onClose} title="Edit shift" header={<span className="text-xs text-muted-foreground">{dayjs(date).format("ddd, MMM D, YYYY")}</span>} className="sm:max-w-md" testId="edit-scope-dialog">
      <div className="space-y-2">
        {opts.map((o) => {
          const on = scope === o.value;
          return (
            <button key={o.value} type="button" data-testid={`scope-${o.value}`} onClick={() => setScope(o.value)} className={cn("flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors", on ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30 hover:bg-muted/50")}>
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary" : "border-muted-foreground/40")}>{on && <span className="size-1.5 rounded-full bg-primary-foreground" />}</span>
              <div className="min-w-0">
                <p className={cn("text-sm font-medium leading-none", on ? "text-primary" : "text-foreground")}>{o.label}</p>
                {o.value === "this_and_future" && isLoading ? <span className="mt-2 block h-3 w-52 animate-pulse rounded bg-muted" /> : <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm hover:bg-muted">
          Cancel
        </button>
        <button type="button" data-testid="scope-continue" onClick={() => onContinue(scope)} className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-brand-blue px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          Continue
        </button>
      </div>
    </Shell>
  );
}
