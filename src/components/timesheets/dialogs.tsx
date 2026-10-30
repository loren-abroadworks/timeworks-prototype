"use client";

import * as React from "react";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import { Calendar, CircleAlert, Clock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { apiSend, type HttpMethod } from "@/lib/api-client";
import type { TimesheetEntry } from "@/lib/types/timesheets";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/filters/toast";
import {
  BTN_NEGATIVE,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_THEMED,
  DateField,
  DialogFooter,
  FieldError,
  FieldLabel,
  NameAvatar,
  ProjectSelect,
  TaskSelect,
  TEXTAREA,
  TimeInput,
  TsDialog,
  UserSelectDisabled,
  fromSec,
  humanDur,
  toSec,
  twelve,
} from "./fields";

/** Ported from chunk 2yh5g29-jee56.js: Add / Edit / Split / Delete time entry dialogs + bulk delete + paid-time confirm. */

function useWrite() {
  const qc = useQueryClient();
  const [pending, setPending] = React.useState(false);
  const run = async (method: HttpMethod, endpoint: string, body: unknown, success: string, fallback: string) => {
    setPending(true);
    try {
      const res = await apiSend<{ error?: string }>(method, endpoint, body);
      if (res?.error) {
        toast.error(res.error || "Failed to add time entry");
        return false;
      }
      qc.invalidateQueries({ queryKey: ["list", "USER_TIMESHEETS"] });
      qc.invalidateQueries({ queryKey: ["DASHBOARD"] });
      toast.success(success);
      return true;
    } catch (e) {
      toast.error((e as Error).message || fallback);
      return false;
    } finally {
      setPending(false);
    }
  };
  return { run, pending };
}

const timeOf = (iso: string) => iso.slice(11, 19);
const dateOf = (iso: string) => iso.slice(0, 10);
const label12 = (iso: string) => (iso ? dayjs(iso).format("h:mm a") : "");

/* ------------------------------------------------------------------ */
/* Paid time                                                           */
/* ------------------------------------------------------------------ */

export function PaidAlert() {
  return (
    <div role="alert" data-slot="alert" className="relative w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm grid grid-cols-[calc(var(--spacing)*4)_1fr] gap-x-3 gap-y-0.5 items-start text-destructive">
      <TriangleAlert className="size-4 translate-y-0.5" />
      <div className="col-start-2 font-medium tracking-tight">This time has already been paid</div>
      <div className="col-start-2 text-sm text-destructive/90">
        <p>Reducing or deleting it adjusts hours that were already paid. The difference is carried over as a deduction on the next Olamee payment cycle. TimeWorks timesheet data is unchanged.</p>
      </div>
    </div>
  );
}

export function PaidConfirm({ open, pending, onCancel, onConfirm }: { open: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [ack, setAck] = React.useState(false);
  const cancel = () => {
    setAck(false);
    onCancel();
  };
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && !pending && cancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-110 bg-black/50" />
        <AlertDialog.Content className="fixed top-[50%] left-[50%] z-110 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg bg-background sm:max-w-md font-karla" data-testid="paid-confirm">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <AlertDialog.Title className="text-lg font-semibold flex items-center gap-2.5">
              <TriangleAlert className="size-5 text-negative shrink-0" />
              Confirm change to paid time
            </AlertDialog.Title>
            <AlertDialog.Description className="text-muted-foreground text-sm">
              This time has already been paid. Reducing or deleting it adjusts hours that were already paid, and the difference is carried over to the next Olamee payment cycle. TimeWorks timesheet data is unchanged.
            </AlertDialog.Description>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm leading-5 text-foreground has-[:disabled]:cursor-not-allowed">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} disabled={pending} className="mt-0.5 shrink-0" data-testid="paid-ack" />
            <span>I understand this adjusts already-paid hours and will affect the next payment cycle.</span>
          </label>
          <DialogFooter>
            <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              className={BTN_NEGATIVE}
              disabled={!ack || pending}
              onClick={() => {
                setAck(false);
                onConfirm();
              }}
            >
              {pending ? "Confirming..." : "Confirm and reconcile"}
            </button>
          </DialogFooter>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Add Time Entry                                                      */
/* ------------------------------------------------------------------ */

const QUICK = [1, 2, 3, 4, 5, 6, 7, 8].map((h) => ({ label: `${h}h`, value: `${String(h).padStart(2, "0")}:00:00` }));

export interface AddTimeData {
  date: string;
  userId: string;
  userName: string;
  timezone: string;
  organizationId: number;
}

export function AddTimeDialog({ open, onOpenChange, data, disableDatePicker = true }: { open: boolean; onOpenChange: (o: boolean) => void; data: AddTimeData; disableDatePicker?: boolean }) {
  const [project, setProject] = React.useState({ id: "", name: "" });
  const [task, setTask] = React.useState({ id: "", name: "" });
  const [date, setDate] = React.useState(data.date);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [dur, setDur] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { run, pending } = useWrite();

  React.useEffect(() => {
    if (open) {
      setProject({ id: "", name: "" });
      setTask({ id: "", name: "" });
      setDate(data.date);
      setFrom("");
      setTo("");
      setDur("");
      setNotes("");
      setErrors({});
    }
  }, [open, data.date]);

  const applyDuration = (v: string) => {
    setDur(v);
    const t = toSec(v);
    if (!v || !Number.isFinite(t)) return;
    if (from) setTo(fromSec(toSec(from) + t));
    else if (to) setFrom(fromSec(toSec(to) - t));
  };
  const onFrom = (v: string) => {
    setFrom(v);
    if (v && to) {
      const d = toSec(to) - toSec(v);
      setDur(d > 0 ? fromSec(d) : "");
    } else if (v && Number.isFinite(toSec(dur))) setTo(fromSec(toSec(v) + toSec(dur)));
  };
  const onTo = (v: string) => {
    setTo(v);
    if (from && v) {
      const d = toSec(v) - toSec(from);
      setDur(d > 0 ? fromSec(d) : "");
    } else if (v && Number.isFinite(toSec(dur))) setFrom(fromSec(toSec(v) - toSec(dur)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!project.id) errs.project = "Project is required";
    if (!from) errs.from = "Invalid time";
    if (!to) errs.to = "Invalid time";
    else if (from && toSec(to) <= toSec(from)) errs.to = "End time must be after start time on the same day";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ok = await run(
      "POST",
      `/add/time-entries-slot/${data.organizationId}/${data.userId}?timezone_str=${data.timezone}`,
      { started_at_utc: `${date}T${from}`, project_id: project.id, task_id: task.id || undefined, stopped_at_utc: `${date}T${to}`, notes },
      "Time entry updated successfully",
      "Failed to update time entry",
    );
    if (ok) onOpenChange(false);
  };

  return (
    <TsDialog open={open} onOpenChange={onOpenChange} title="Add Time Entry" description="Log a manual time entry for the selected date." className="border-0 md:max-w-3xl" testId="add-time-dialog">
      <form onSubmit={submit} className="space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center lg:grid lg:grid-cols-3 gap-2">
          <div className="space-y-2 flex flex-col w-full min-w-0 lg:col-span-1">
            <label className="text-sm font-medium leading-none text-foreground">User *</label>
            <NameAvatar name={data.userName} />
          </div>
          <div className="space-y-2 flex flex-col w-full min-w-0 lg:col-span-2">
            <label className="text-sm font-medium leading-none text-foreground">Project *</label>
            <ProjectSelect
              userId={data.userId}
              value={project}
              onChange={(p) => {
                setProject(p);
                setTask({ id: "", name: "" });
              }}
              className="sm:w-full h-11 bg-primary-background"
            />
            <FieldError msg={errors.project} />
          </div>
        </div>
        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium leading-none text-foreground">To-Do</label>
          <TaskSelect projectId={project.id} userId={data.userId} value={task} onChange={(t) => setTask(t ?? { id: "", name: "" })} className="w-full h-11 bg-primary-background" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Date ({data.timezone}) *</label>
          <DateField value={date} onChange={setDate} disabled={disableDatePicker} className="h-11 bg-primary-background" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-2 min-w-0">
            <label className="text-sm font-medium leading-none text-foreground">From ({data.timezone}) *</label>
            <TimeInput large value={from} onChange={onFrom} name="started_at_utc" testId="add-from" />
            <FieldError msg={errors.from} />
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-sm font-medium leading-none text-foreground">To ({data.timezone}) *</label>
            <TimeInput large value={to} onChange={onTo} name="stopped_at_utc" testId="add-to" />
            <FieldError msg={errors.to} />
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-sm font-medium leading-none text-foreground">Duration</label>
            <div className="relative">
              <input data-slot="input" type="text" inputMode="numeric" placeholder="HH:MM:SS" value={dur} onChange={(e) => applyDuration(e.target.value)} className="file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 flex w-full min-w-0 border px-3 py-1 text-base shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-11 pr-10 rounded-lg border-ui-border bg-secondary-surface" />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.value}
              type="button"
              disabled={!(from || to)}
              onClick={() => applyDuration(q.value)}
              className={cn(dur === q.value ? BTN_THEMED : BTN_SECONDARY, "h-8 gap-1.5 rounded-full px-6 min-w-16")}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium leading-none text-foreground">
            Note
          </label>
          <div data-slot="textarea-field" className="flex flex-col gap-1.5">
            <textarea
              id="notes"
              data-slot="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes for editing this time entry..."
              className="flex w-full resize-y rounded-lg border shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 px-4 py-2 text-base border-ui-border bg-secondary-surface"
            />
          </div>
        </div>
        <DialogFooter>
          <button type="button" className={BTN_SECONDARY} onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className={cn(BTN_THEMED, "w-20")} disabled={pending}>
            {pending ? "Updating..." : "Save"}
          </button>
        </DialogFooter>
      </form>
    </TsDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Edit Time Entry                                                     */
/* ------------------------------------------------------------------ */

export interface EntryDialogData {
  entry: TimesheetEntry;
  organizationId: number;
  userId: string;
  userName: string;
  timezone: string;
}

const ids = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

export function EditTimeDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: EntryDialogData }) {
  const { entry: e, timezone: tz } = data;
  const [project, setProject] = React.useState({ id: e.project_id, name: e.project_name });
  const [task, setTask] = React.useState({ id: e.task_id ?? "", name: e.task_name ?? "" });
  const [from, setFrom] = React.useState(timeOf(e.started_at));
  const [to, setTo] = React.useState(timeOf(e.stopped_at));
  const [notes, setNotes] = React.useState(e.notes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirm, setConfirm] = React.useState(false);
  const { run, pending } = useWrite();
  const date = dateOf(e.started_at);

  React.useEffect(() => {
    if (open) {
      setProject({ id: e.project_id, name: e.project_name });
      setTask({ id: e.task_id ?? "", name: e.task_name ?? "" });
      setFrom(timeOf(e.started_at));
      setTo(timeOf(e.stopped_at));
      setNotes(e.notes);
      setErrors({});
    }
  }, [open, e]);

  const save = async () => {
    const q = new URLSearchParams({ old_started_at: e.started_at, old_stopped_at: e.stopped_at, timezone_str: tz ?? "UTC" }).toString();
    const slot = !!e.local_activity_duration_id;
    const path = slot
      ? e.is_manual
        ? `/manual-entry-edit/time-entries-slot/${data.organizationId}/${data.userId}?${q}`
        : `/edit/time-entries-slot/${data.organizationId}/${data.userId}?${q}`
      : e.is_manual
        ? `/manual-entry-edit/time-entries/${data.organizationId}/${data.userId}?${q}`
        : `/edit/time-entries/${data.organizationId}/${data.userId}?${q}`;
    const body = { started_at_utc: `${date}T${from}`, project_id: project.id, stopped_at_utc: `${date}T${to}`, notes, task_id: task.id || null };
    const ok = await run("PUT", path, slot ? { entries: body, local_activity_duration_id: ids(e.local_activity_duration_id), client_local_id: ids(e.client_local_id) } : body, "Time entry updated successfully", "Failed to update time entry");
    setConfirm(false);
    if (ok) onOpenChange(false);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!project.id) errs.project = "Project is required";
    if (!from) errs.from = "From time is required";
    if (!to) errs.to = "To time is required";
    if (!notes.trim()) errs.notes = "Reason is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (e.is_paid) setConfirm(true);
    else save();
  };

  const before = humanDur(e.duration_seconds);
  const after = humanDur(toSec(to || "0:0:0") - toSec(from || "0:0:0"));

  return (
    <TsDialog open={open} onOpenChange={onOpenChange} title="Edit Time Entry" description="Update the selected time entry and save." color="primary" className="md:max-w-3xl overflow-x-hidden" testId="edit-time-dialog">
      <form onSubmit={submit} className="space-y-5 min-w-0">
        {e.is_paid && <PaidAlert />}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 lg:grid lg:grid-cols-3">
          <div className="space-y-2 flex flex-col w-full min-w-0 lg:col-span-1">
            <FieldLabel required>User</FieldLabel>
            <UserSelectDisabled name={data.userName} />
          </div>
          <div className="space-y-2 flex flex-col w-full min-w-0 lg:col-span-2">
            <FieldLabel required>Project</FieldLabel>
            <ProjectSelect
              userId={data.userId}
              value={project}
              onChange={(p) => {
                setProject(p);
                setTask({ id: "", name: "" });
              }}
              className="h-9 bg-card sm:w-full"
            />
            <FieldError msg={errors.project} />
          </div>
        </div>
        <div className="space-y-2 flex flex-col">
          <FieldLabel>To-Do</FieldLabel>
          <TaskSelect projectId={project.id} userId={data.userId} value={task} onChange={(t) => setTask(t ?? { id: "", name: "" })} className="h-9 bg-card" />
        </div>
        <div className="space-y-2">
          <FieldLabel required>Time Span ({tz.replace("/", " - ")})</FieldLabel>
          <DateField value={date} disabled className="h-9 bg-secondary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2 min-w-0">
            <FieldLabel>From</FieldLabel>
            <TimeInput blueIcon value={from} onChange={setFrom} name="from_time" testId="edit-from" />
            <FieldError msg={errors.from} />
          </div>
          <div className="space-y-2 min-w-0">
            <FieldLabel>To</FieldLabel>
            <TimeInput blueIcon value={to} onChange={setTo} name="to_time" testId="edit-to" />
            <FieldError msg={errors.to} />
          </div>
        </div>
        {(before || after) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wide">Before</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{before ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wide">After</span>
              </div>
              <span className="text-sm font-semibold text-blue-700" data-testid="edit-after">
                {after ?? "—"}
              </span>
            </div>
          </div>
        )}
        <div>
          <FieldLabel upper={false} required htmlFor="notes">
            Notes
          </FieldLabel>
          <textarea id="notes" name="notes" rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Enter notes for editing this time entry..." className={cn(TEXTAREA, errors.notes && "border-red-500")} />
        </div>
        <DialogFooter>
          <button type="button" className={BTN_SECONDARY} onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className={cn(BTN_PRIMARY, "w-20")} disabled={pending}>
            {pending ? "Updating..." : "Save"}
          </button>
        </DialogFooter>
      </form>
      <PaidConfirm open={confirm} pending={pending} onCancel={() => setConfirm(false)} onConfirm={save} />
    </TsDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Split Time Entry                                                    */
/* ------------------------------------------------------------------ */

interface SplitRow {
  key: number;
  project: { id: string; name: string };
  task: { id: string; name: string };
  from: string;
  to: string;
}

let splitKey = 0;

export function SplitTimeDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: EntryDialogData }) {
  const { entry: e, timezone: tz } = data;
  const origStart = timeOf(e.started_at);
  const origEnd = timeOf(e.stopped_at);
  const fresh = (): SplitRow[] => [
    { key: ++splitKey, project: { id: e.project_id, name: e.project_name }, task: { id: e.task_id ?? "", name: e.task_name ?? "" }, from: origStart, to: "" },
    { key: ++splitKey, project: { id: e.project_id, name: e.project_name }, task: { id: e.task_id ?? "", name: e.task_name ?? "" }, from: "", to: origEnd },
  ];
  const [rows, setRows] = React.useState<SplitRow[]>(fresh);
  const [notes, setNotes] = React.useState("");
  const [rootError, setRootError] = React.useState("");
  const [notesError, setNotesError] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const { run, pending } = useWrite();
  const date = dateOf(e.started_at);

  React.useEffect(() => {
    if (open) {
      setRows(fresh());
      setNotes("");
      setRootError("");
      setNotesError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, e]);

  const patch = (i: number, p: Partial<SplitRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const addSplit = () => {
    const prev = rows[rows.length - 2];
    if (!prev?.to) {
      toast.error("Please complete the end time of the previous split first");
      return;
    }
    const last = rows[rows.length - 1];
    const inserted: SplitRow = { key: ++splitKey, project: { id: e.project_id, name: e.project_name }, task: { id: "", name: "" }, from: prev.to, to: "" };
    setRows([...rows.slice(0, -1), inserted, { ...last, from: inserted.to }]);
  };

  const removeSplit = (i: number) => {
    if (rows.length <= 2) return toast.error("Cannot remove splits. At least two splits are required.");
    if (i === 0 || i === rows.length - 1) return toast.error("Cannot remove the first or last split.");
    setRows(rows.filter((_, j) => j !== i));
  };

  const save = async () => {
    const parts = rows.map((r) => ({ started_at_utc: `${date}T${r.from}`, stopped_at_utc: `${date}T${r.to}`, project_id: r.project.id, task_id: r.task.id || null, notes }));
    const slot = !!e.local_activity_duration_id;
    const path = slot
      ? `/split/time-entries-slot/${data.organizationId}/${data.userId}?${new URLSearchParams({ timezone_str: tz ?? "UTC" })}`
      : `/split/time-entries/${data.organizationId}/${data.userId}?${new URLSearchParams({ started_at: e.started_at, stopped_at: e.stopped_at, timezone_str: tz ?? "UTC" })}`;
    const ok = await run("PUT", path, slot ? { entries: parts, local_activity_duration_id: ids(e.local_activity_duration_id), client_local_id: ids(e.client_local_id) } : parts, "Time entry splitted successfully", "Failed to split time entry");
    setConfirm(false);
    if (ok) onOpenChange(false);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setNotesError(notes.trim() ? "" : "Notes is required");
    // zod refinements (root error)
    let err = "";
    if (rows.some((r) => r.from && r.to && toSec(r.to) <= toSec(r.from))) err = "End time must be after start time for each split";
    for (let i = 0; !err && i < rows.length - 1; i++) {
      const a = rows[i].to;
      const b = rows[i + 1].from;
      if (!a || !b || a === b) continue;
      err =
        toSec(b) > toSec(a)
          ? `Splits must be sequential with no gaps or overlaps. There is a gap between Split ${i + 1} (ends at ${twelve(a)}) and Split ${i + 2} (starts at ${twelve(b)})`
          : `Splits must be sequential with no gaps or overlaps. Split ${i + 2} (starts at ${twelve(b)}) overlaps with Split ${i + 1} (ends at ${twelve(a)})`;
    }
    setRootError(err);
    if (err || !notes.trim() || rows.some((r) => !r.project.id || !r.from || !r.to)) return;
    // custom validation (toast)
    let msg = "";
    if (rows[0].from !== origStart) msg = `The first split must start at ${twelve(origStart)} (original start time)`;
    else if (rows[rows.length - 1].to !== origEnd) msg = `The last split must end at ${twelve(origEnd)} (original end time)`;
    else
      rows.forEach((r, i) => {
        if (msg) return;
        if (toSec(r.from) < toSec(origStart) || toSec(r.from) > toSec(origEnd)) msg = `Split ${i + 1}: Start time must be between ${twelve(origStart)} and ${twelve(origEnd)}`;
        else if (toSec(r.to) < toSec(origStart) || toSec(r.to) > toSec(origEnd)) msg = `Split ${i + 1}: End time must be between ${twelve(origStart)} and ${twelve(origEnd)}`;
      });
    if (msg) return void toast.error(msg || "Invalid split configuration");
    if (e.is_paid) setConfirm(true);
    else save();
  };

  const tzLabel = tz.replace("/", " - ");
  return (
    <TsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Split Time Entry"
      description="Split the selected time entry into separate entries."
      color="primary"
      className="md:max-w-200 max-h-[90vh] overflow-y-auto"
      testId="split-time-dialog"
      header={
        <p className="text-sm text-muted-foreground mt-2">
          Split this time entry into multiple segments. The first split must start at <span className="font-semibold text-brand-blue">{twelve(origStart)}</span> and the last split must end at{" "}
          <span className="font-semibold text-brand-blue">{twelve(origEnd)}</span>. All times must be within this range.
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5 min-w-0">
        {e.is_paid && <PaidAlert />}
        <div className="flex items-start gap-2">
          <div className="space-y-2 flex flex-col w-full">
            <FieldLabel required>User</FieldLabel>
            <UserSelectDisabled name={data.userName} />
          </div>
          <div className="space-y-2 flex flex-col w-full">
            <FieldLabel required>Date</FieldLabel>
            <DateField value={date} disabled className="h-9 bg-secondary" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-base font-semibold">Time Splits</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Original:</span>
                <span className="text-xs font-semibold text-foreground">{humanDur(e.duration_seconds)}</span>
              </div>
              <button type="button" onClick={addSplit} className={cn(BTN_SECONDARY, "h-8 px-3 gap-2 rounded-lg")} data-testid="add-split">
                <Plus className="h-4 w-4" />
                Add Split
              </button>
            </div>
          </div>
          {rootError && <p className="text-sm text-red-600">{rootError}</p>}
          <div className="space-y-4 max-h-100 overflow-y-scroll border border-ui-border rounded-xl p-2">
            {rows.map((r, i) => {
              const first = i === 0;
              const last = i === rows.length - 1;
              const d = r.from && r.to ? humanDur(toSec(r.to) - toSec(r.from)) : null;
              return (
                <div key={r.key} data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm relative pb-4" data-testid="split-card">
                  <div data-slot="card-content" className="px-6 pt-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">
                        Split {i + 1}
                        {first && <span className="ml-2 text-xs text-blue-600 font-normal">(Must start at {twelve(origStart)})</span>}
                        {last && <span className="ml-2 text-xs text-blue-600 font-normal">(Must end at {twelve(origEnd)})</span>}
                      </h3>
                      <div className="flex items-center gap-2">
                        {d && (
                          <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-xs font-semibold text-blue-700">{d}</span>
                          </div>
                        )}
                        {!first && !last && (
                          <button type="button" onClick={() => removeSplit(i)} className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:text-red-700 hover:bg-red-50" aria-label="Remove split">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <FieldLabel required>Project</FieldLabel>
                      <ProjectSelect userId={data.userId} value={r.project} onChange={(p) => patch(i, { project: p, task: p.id === r.project.id ? r.task : { id: "", name: "" } })} className="h-9 bg-card sm:w-full" testId={`split-project-${i}`} />
                      {!r.project.id && rootError === "" && null}
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <FieldLabel>To-Do</FieldLabel>
                      <TaskSelect projectId={r.project.id} userId={data.userId} value={r.task} onChange={(t) => patch(i, { task: t ?? { id: "", name: "" } })} className="h-9 bg-card" testId={`split-task-${i}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <FieldLabel>From ({tzLabel})</FieldLabel>
                        <TimeInput blueIcon value={r.from} disabled={first} min={origStart} max={origEnd} onChange={(v) => patch(i, { from: v })} name={`splits.${i}.from_time`} testId={`split-from-${i}`} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>To ({tzLabel})</FieldLabel>
                        <TimeInput
                          blueIcon
                          value={r.to}
                          disabled={last}
                          min={r.from || origStart}
                          max={origEnd}
                          name={`splits.${i}.to_time`}
                          testId={`split-to-${i}`}
                          onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, to: v } : j === i + 1 ? { ...x, from: v } : x)))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel required>Notes</FieldLabel>
          <textarea id="notes" name="notes" rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Enter notes for splitting this time entry..." className={cn(TEXTAREA, notesError && "border-red-500")} />
          <FieldError msg={notesError} />
        </div>
        <DialogFooter>
          <button type="button" className={cn(BTN_SECONDARY, "w-20")} onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className={cn(BTN_PRIMARY, "w-20")} disabled={pending}>
            {pending ? "Splitting..." : "Save"}
          </button>
        </DialogFooter>
      </form>
      <PaidConfirm open={confirm} pending={pending} onCancel={() => setConfirm(false)} onConfirm={save} />
    </TsDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Delete time                                                         */
/* ------------------------------------------------------------------ */

function ReasonField({ id, value, onChange, error, placeholder }: { id: string; value: string; onChange: (v: string) => void; error: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} required>
        REASON
      </FieldLabel>
      <textarea id={id} name="reason" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(TEXTAREA, "resize-none", error && "border-red-500 focus-visible:ring-red-500")} />
      <FieldError msg={error} />
    </div>
  );
}

export function DeleteTimeDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: EntryDialogData }) {
  const { entry: e, timezone: tz } = data;
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const { run, pending } = useWrite();
  React.useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    const q = new URLSearchParams({ started_at_utc: e.started_at, stopped_at_utc: e.stopped_at, timezone_str: tz ?? "UTC" }).toString();
    const block = !!e.local_activity_duration_id;
    const path = block
      ? `/delete/time-entries-block/${data.organizationId}/${data.userId}?${q}`
      : e.is_manual
        ? `/manual-delete/time-entries/${data.organizationId}/${data.userId}?${q}`
        : `/delete/time-entries/${data.organizationId}/${data.userId}?${q}`;
    const ok = await run("DELETE", path, block ? { local_activity_duration_id: ids(e.local_activity_duration_id), reasons: reason } : { reason }, "Time entry deleted successfully", "Failed to delete time entry");
    setConfirm(false);
    if (ok) onOpenChange(false);
  };

  return (
    <TsDialog open={open} onOpenChange={onOpenChange} title="Delete time" description="Confirm deletion of the selected time entry." color="negative" className="md:max-w-2xl" testId="delete-time-dialog">
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!reason.trim()) return setError("Reason is required");
          setError("");
          if (e.is_paid) setConfirm(true);
          else save();
        }}
        className="space-y-5"
      >
        {e.is_paid && <PaidAlert />}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">MEMBER</h4>
              <NameAvatar name={data.userName} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">PROJECT</h4>
              <NameAvatar name={e.project_name} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase text-muted-foreground">TIME SPAN</div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {dayjs(e.started_at).format("ddd, MMM D, YYYY")} <span className="font-medium">from</span> <span className="font-semibold">{label12(e.started_at)}</span> <span className="font-medium">to</span>{" "}
                <span className="font-semibold">{label12(e.stopped_at)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <CircleAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{`This is ${label12(e.started_at)} - ${e.stopped_at ? label12(e.stopped_at) : "--:--:--"} in ${tz} time zone.`}</p>
        </div>
        <ReasonField id="reason" value={reason} onChange={setReason} error={error} placeholder="Why are you deleting this time entry?" />
        <DialogFooter className="gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className={BTN_NEGATIVE} disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </button>
        </DialogFooter>
      </form>
      <PaidConfirm open={confirm} pending={pending} onCancel={() => setConfirm(false)} onConfirm={save} />
    </TsDialog>
  );
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  entries,
  organizationId,
  userId,
  timezone,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entries: TimesheetEntry[];
  organizationId: number;
  userId: string;
  timezone: string;
  onDeleted: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const { run, pending } = useWrite();
  const paid = entries.some((e) => e.is_paid);
  const days = new Set(entries.map((e) => dateOf(e.started_at))).size;
  const n = entries.length;
  React.useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    const items = entries.map((t) => {
      const base = { started_at_utc: t.started_at, stopped_at_utc: t.stopped_at };
      const lad = ids(t.local_activity_duration_id);
      return lad.length ? { ...base, type: "block", local_activity_duration_id: lad, reasons: reason } : { ...base, type: t.is_manual ? "manual" : "tracked" };
    });
    const ok = await run("POST", `/bulk-delete/time-entries/${organizationId}/${userId}`, { timezone_str: timezone, items }, `${n} time ${n === 1 ? "entry" : "entries"} deleted successfully`, "Failed to delete time entries");
    setConfirm(false);
    if (ok) {
      onDeleted();
      onOpenChange(false);
    }
  };

  return (
    <TsDialog open={open} onOpenChange={onOpenChange} title="Delete time" description="Confirm deletion of the selected time entries." color="negative" className="md:max-w-2xl" testId="bulk-delete-dialog">
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!reason.trim()) return setError("Reason is required");
          setError("");
          if (paid) setConfirm(true);
          else save();
        }}
        className="space-y-5"
      >
        {paid && <PaidAlert />}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <CircleAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            {n} {n === 1 ? "entry" : "entries"} across {days} {days === 1 ? "day" : "days"} will be deleted, in the {timezone} time zone.
          </p>
        </div>
        <ReasonField id="bulk-delete-reason" value={reason} onChange={setReason} error={error} placeholder="Why are you deleting these time entries?" />
        <DialogFooter className="gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className={BTN_NEGATIVE} disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </button>
        </DialogFooter>
      </form>
      <PaidConfirm open={confirm} pending={pending} onCancel={() => setConfirm(false)} onConfirm={save} />
    </TsDialog>
  );
}
