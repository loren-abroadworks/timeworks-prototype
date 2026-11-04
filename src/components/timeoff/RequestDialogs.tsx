"use client";

/**
 * Time off request dialogs, ported from the live chunks 0u81bbkq0eygt (view) and 2vnwr-9yq0c25 (form, delete):
 *  - ViewRequestDialog   "Time Off Request" (member card, date / hours / policy tiles, Balance Summary, Reason, Attachments,
 *                        Created / Last Updated, Back + Deny / Approve by status — never on your own request)
 *  - RequestFormDialog   "Time Off Request (America/New_York)" / "Edit Time Off Request (…)" (+ auto-approve confirm)
 *  - DeleteRequestDialog "Delete Time Off Request" with a required deletion reason
 */
import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Command } from "cmdk";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Clock, FileText, Info, Paperclip, Search, ShieldCheck, Trash2, Upload, X, XIcon } from "lucide-react";
import { ApiRequestError, API_BASE, apiSend } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { TimeOffAttachment, TimeOffRequest } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MonthCalendar } from "@/components/filters/DateControls";
import { toast } from "@/components/filters/toast";
import { AvatarLetter, ConfirmDialog, ORG_TZ, StatusIcon, useBalanceSummary, useOrgId, useUserPolicies } from "./shared";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/** Everything that shows time off data refetches after a write. */
export function useInvalidateTimeOff() {
  const qc = useQueryClient();
  return React.useCallback(() => {
    for (const k of ["TIMEOFF_REQUESTS", "TIME_OFF_MONTH_VIEW", "TIME_OFF_WEEK_VIEW", "TIME_OFF_REQUEST_BALANCE_SUMMARY", "TIME_OFF_BALANCES", "TIME_OFF_AUDIT_TRAIL", "SCHEDULE_DATA", "USER_TIME_OFF_POLICIES"])
      qc.invalidateQueries({ predicate: (q) => (q.queryKey as unknown[]).includes(k) });
  }, [qc]);
}

const hours = (r: { details: { started_at_datetime: string; stopped_at_datetime: string }[] }) =>
  r.details.reduce((s, d) => s + dayjs(d.stopped_at_datetime).diff(dayjs(d.started_at_datetime), "hour", true), 0);

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function Shell({ open, onOpenChange, className, children, testId }: { open: boolean; onOpenChange: (o: boolean) => void; className?: string; children: React.ReactNode; testId?: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-testid={testId}
          onInteractOutside={(e) => {
            const t = e.detail.originalEvent.target as HTMLElement | null;
            if (t?.closest("[data-radix-popper-content-wrapper]")) e.preventDefault();
          }}
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-lg shadow-lg duration-200 bg-background dark:border dark:border-layout-subtle sm:max-w-3xl",
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close data-slot="dialog-close" className="absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 hover:opacity-100 [&_svg]:size-4" aria-label="Close">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Balance Summary                                                     */
/* ------------------------------------------------------------------ */

function SummaryRow({ label, description, value, highlight, tone }: { label: string; description?: string; value: number; highlight?: boolean; tone?: "negative" | "positive" }) {
  const t = tone ?? (value < 0 ? "negative" : undefined);
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4", highlight ? "bg-page-start py-1.5" : "py-2")}>
      <div className="min-w-0">
        <p className={cn("text-sm leading-5 text-primary-text", highlight ? "font-bold" : "font-semibold")}>{label}</p>
        {description && <p className="text-xs leading-4 text-secondary-text">{description}</p>}
      </div>
      <p className={cn("flex shrink-0 items-center gap-3 font-montserrat text-sm font-semibold leading-5 tracking-[-0.1px] tabular-nums", t === "negative" ? "text-red-text" : t === "positive" ? "text-green-text" : "text-primary-text")}>
        {value.toFixed(2)}
        <span className="font-karla text-xs font-normal leading-4 text-secondary-text">hrs</span>
      </p>
    </div>
  );
}

export function BalanceSummaryBlock({
  userId,
  policyId,
  details,
  excludeRequestId,
  variant = "request",
}: {
  userId?: string;
  policyId?: number | null;
  details: { started_at_datetime: string; stopped_at_datetime: string }[];
  excludeRequestId?: number;
  variant?: "request" | "review";
}) {
  const review = variant === "review";
  const { data, isLoading, isError, error } = useBalanceSummary({ userId, policyId, details, excludeRequestId });
  if (!policyId && !review) return null;
  const msg = !policyId ? "Time off policy not found" : isError ? (error as Error)?.message || "Time off policy not found" : null;
  const after = data?.remaining_balance_hours ?? 0;
  return (
    <div data-testid="balance-summary">
      <p className={cn("mb-2 text-primary-text", review ? "text-base font-semibold leading-[22px]" : "text-sm font-medium leading-none")}>Balance Summary</p>
      <div className="divide-y divide-layout-subtle overflow-hidden rounded-xl border border-layout-border font-karla">
        {msg ? (
          <p className="px-4 py-6 text-center text-sm font-medium text-secondary-text">{msg}</p>
        ) : isLoading || !data ? (
          [40, 24, 44, 36].map((w) => (
            <div key={w} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w * 4}px` }} />
              <span className="h-3.5 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))
        ) : (
          <>
            <SummaryRow label="Current Policy Balance" value={data.current_balance_hours} />
            <SummaryRow label="This Request" value={-Math.abs(data.this_request_hours)} tone="negative" />
            {data.pending_requests_hours !== 0 && <SummaryRow label="Other Pending Requests" value={-Math.abs(data.pending_requests_hours)} tone="negative" />}
            <SummaryRow
              label={review ? "Balance After Approvals" : "Balance After"}
              description="Remaining balance for this policy after all pending requests."
              value={after}
              highlight
              tone={after < 0 ? "negative" : "positive"}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

const fmtSize = (i: number) => (i < 1024 ? `${i} B` : i < 1048576 ? `${(i / 1024).toFixed(1)} KB` : `${(i / 1048576).toFixed(1)} MB`);

export function AttachmentList({ attachments, requestId, layout = "row", onDeleted }: { attachments: TimeOffAttachment[]; requestId: number; layout?: "row" | "chip"; onDeleted?: (id: number) => void }) {
  const org = useOrgId();
  const [deleting, setDeleting] = React.useState<TimeOffAttachment | null>(null);
  const invalidate = useInvalidateTimeOff();
  if (!attachments.length) return <span className="text-muted-foreground">—</span>;
  if (layout === "row")
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {attachments.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.file_name} className="flex size-7 items-center justify-center rounded-md border border-ui-border bg-secondary-surface text-primary hover:bg-muted">
            <FileText className="size-3.5" />
          </a>
        ))}
      </div>
    );
  return (
    <>
      <div className="grid gap-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex w-full items-center gap-2.5 rounded-lg border border-ui-border px-3 py-2" data-testid="attachment">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-500">
              <FileText className="size-4" />
            </span>
            <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{a.file_name}</p>
              <p className="text-xs text-muted-foreground">{fmtSize(a.file_size)}</p>
            </a>
            <button type="button" aria-label="Delete attachment" className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15" onClick={() => setDeleting(a)}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!deleting}
        title="Delete attachment?"
        description={`"${deleting?.file_name ?? ""}" will be removed from this request.`}
        continueText="Delete"
        continueVariant="negative"
        onCancel={() => setDeleting(null)}
        onContinue={async () => {
          if (!deleting) return;
          try {
            await apiSend("DELETE", `/time-off/request/${org}/${requestId}/attachments/${deleting.id}`);
            toast.success("Attachment deleted");
            onDeleted?.(deleting.id);
            invalidate();
          } catch {
            toast.error("Failed to delete attachment");
          }
          setDeleting(null);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* View dialog                                                         */
/* ------------------------------------------------------------------ */

function Tile({ icon, iconClassName, value, label }: { icon: React.ReactNode; iconClassName: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-layout-subtle bg-secondary-surface p-3">
      <span className={cn("flex h-13.5 shrink-0 items-center justify-center rounded-lg", iconClassName)}>{icon}</span>
      <div className="min-w-0">
        <p title={value} className="line-clamp-2 font-montserrat text-base font-semibold leading-5 tracking-[-0.1px] text-primary-text">
          {value}
        </p>
        <p className="mt-1 truncate text-xs leading-4 text-secondary-text">{label}</p>
      </div>
    </div>
  );
}

const BADGE: Record<string, string> = {
  approved: "bg-positive-selected text-green-text",
  submitted: "bg-[var(--warning-color-selected)] text-amber-700 dark:bg-warning/15 dark:text-warning",
  denied: "bg-[var(--negative-color-selected)] text-red-text",
};

export function ViewRequestDialog({ data, onClose }: { data: TimeOffRequest; onClose: () => void }) {
  const org = useOrgId();
  const { userId } = useSession();
  const invalidate = useInvalidateTimeOff();
  const [confirm, setConfirm] = React.useState<null | "approved" | "denied">(null);
  const [reason, setReason] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [atts, setAtts] = React.useState(data.attachments);
  const start = dayjs(data.started_at_date);
  const end = dayjs(data.stopped_at_date);
  const single = data.started_at_date === data.stopped_at_date;
  const sameMonth = start.isSame(end, "month");
  const own = data.user_id === userId;
  const canApprove = !own && (data.status === "submitted" || data.status === "denied");
  const canDeny = !own && (data.status === "submitted" || data.status === "approved");
  const details = React.useMemo(() => data.details.map((d) => ({ started_at_datetime: d.started_at_datetime, stopped_at_datetime: d.stopped_at_datetime })), [data.details]);
  const text = data.status === "denied" ? data.reason_notes : data.notes;
  const fmt = (s: string) => dayjs.utc(s).tz(ORG_TZ).format("MMM DD, YYYY h:mm A");

  const submit = async () => {
    if (!confirm) return;
    setPending(true);
    try {
      await apiSend("PATCH", `/status-update/time-off/${org}/${data.id}`, { status: confirm, reason_notes: confirm === "denied" ? reason : "", timezone: ORG_TZ });
      toast.success("Status updated successfully");
      invalidate();
      setConfirm(null);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update status");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Shell open onOpenChange={(o) => !o && onClose()} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 font-karla" testId="timeoff-view-dialog">
        <div className="shrink-0 px-6 py-5">
          <div className="flex flex-col gap-3">
            <DialogPrimitive.Title className="font-montserrat text-2xl font-semibold leading-7.5 tracking-[-0.1px] text-primary-text">Time Off Request</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Details of the selected time off request.</DialogPrimitive.Description>
            <div className="flex items-center gap-3 rounded-xl border border-layout-subtle bg-secondary-surface py-3 pl-4 pr-3">
              <AvatarLetter name={data.user_name} src={data.profile_image_url} className="size-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold leading-5.5 text-primary-text">{data.user_name}</p>
                <p className="truncate text-sm leading-5 text-secondary-text">{data.user_email}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-base font-semibold leading-5.5 text-primary-text">Request</span>
              <span className={cn("flex shrink-0 items-center gap-1 rounded-md p-1.5 text-xs font-bold capitalize shadow-xs", BADGE[data.status])} data-testid="view-status">
                <StatusIcon status={data.status} />
                {data.status === "submitted" ? "Pending" : data.status}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile
                icon={
                  <span className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[11px] font-bold uppercase tracking-[0.5px]">{start.format("MMM")}</span>
                    <span className="mt-1 font-montserrat text-xl font-semibold whitespace-nowrap">{single || !sameMonth ? start.format("D") : `${start.format("D")}-${end.format("D")}`}</span>
                  </span>
                }
                iconClassName="min-w-[54px] px-2 bg-primary text-on-primary"
                value={single ? start.format("dddd") : `${start.format("ddd")} - ${end.format("ddd")}`}
                label={single ? start.format("MMM D, YYYY") : `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`}
              />
              <Tile icon={<Clock className="size-5" />} iconClassName="size-[54px] bg-positive-selected text-green-text" value={`${hours(data).toFixed(2)} hrs`} label="Total Hours" />
              <Tile icon={<ShieldCheck className="size-5" />} iconClassName="size-[54px] bg-brand-selected text-brand dark:text-brand-foreground" value={data.policy_name ?? "N/A"} label="Policy Type" />
            </div>
          </div>
          <BalanceSummaryBlock userId={data.user_id} policyId={data.time_off_policy_id} details={details} excludeRequestId={data.id} variant="review" />
          {text && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-base font-semibold leading-5.5 text-primary-text">{data.status === "denied" ? "Rejection Reason" : "Reason"}</span>
              </div>
              <p className="rounded-lg border border-layout-subtle bg-grey-background p-3 text-sm leading-5 whitespace-pre-wrap text-primary-text" data-testid="view-reason">
                {text}
              </p>
            </div>
          )}
          {atts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-base font-semibold leading-5.5 text-primary-text">
                  <Paperclip className="size-3.5 text-secondary-text" />
                  Attachments
                </span>
                <span className="text-xs text-secondary-text">{atts.length}</span>
              </div>
              <AttachmentList attachments={atts} requestId={data.id} layout="chip" onDeleted={(id) => setAtts((a) => a.filter((x) => x.id !== id))} />
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-x-6">
              <div>
                <p className="mb-0.5 text-xs leading-4 text-secondary-text">Created</p>
                <p className="text-sm font-semibold leading-5 text-primary-text">{fmt(data.created_at)}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs leading-4 text-secondary-text">Last Updated</p>
                <p className="text-sm font-semibold leading-5 text-primary-text">{fmt(data.updated_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="inline-flex h-9 min-w-24 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium text-primary-text shadow-xs hover:bg-muted">
                Back
              </button>
              {canDeny && (
                <button
                  type="button"
                  data-testid="view-deny"
                  disabled={pending}
                  onClick={() => {
                    setReason("");
                    setTouched(false);
                    setConfirm("denied");
                  }}
                  className="inline-flex h-9 min-w-24 cursor-pointer items-center justify-center rounded-lg bg-[image:var(--gradient-negative)] px-4 text-sm font-medium text-white hover:opacity-90"
                >
                  Deny
                </button>
              )}
              {canApprove && (
                <button
                  type="button"
                  data-testid="view-approve"
                  disabled={pending}
                  onClick={() => setConfirm("approved")}
                  className="inline-flex h-9 min-w-24 cursor-pointer items-center justify-center rounded-lg bg-[image:var(--gradient-theme)] px-4 text-sm font-medium text-white hover:opacity-90"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>
      </Shell>
      <StatusConfirm open={!!confirm} status={confirm} reason={reason} setReason={setReason} touched={touched} setTouched={setTouched} pending={pending} onCancel={() => setConfirm(null)} onContinue={submit} />
    </>
  );
}

/** "Approve Time Off" / "Reject Time Off" confirm (reject needs a reason). */
export function StatusConfirm({
  open,
  status,
  reason,
  setReason,
  touched,
  setTouched,
  pending,
  onCancel,
  onContinue,
}: {
  open: boolean;
  status: "approved" | "denied" | null;
  reason: string;
  setReason: (s: string) => void;
  touched: boolean;
  setTouched: (b: boolean) => void;
  pending: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const deny = status === "denied";
  return (
    <ConfirmDialog
      open={open}
      title={deny ? "Reject Time Off" : "Approve Time Off"}
      description={deny ? "Are you sure you want to reject this time off request?" : "Are you sure you want to approve this time off request?"}
      continueVariant={deny ? "negative" : "positive"}
      continueDisabled={pending || (deny && !reason.trim())}
      onCancel={onCancel}
      onContinue={onContinue}
      testId="status-confirm"
    >
      {deny && (
        <div className="space-y-1.5">
          <label htmlFor="view-reject-reason" className="text-sm font-medium">
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="view-reject-reason"
            placeholder="Enter reason for rejection..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            className={cn("w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none dark:bg-input/30", touched && !reason.trim() && "border-destructive")}
          />
          {touched && !reason.trim() && <p className="text-xs text-destructive">Rejection reason is required.</p>}
        </div>
      )}
    </ConfirmDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Request form                                                        */
/* ------------------------------------------------------------------ */

function DateButton({ value, onChange, min, testId }: { value: string; onChange: (d: string) => void; min?: string; testId?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        data-testid={testId}
        className="flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-lg border border-ui-border px-3 text-left text-sm font-normal shadow-xs hover:bg-accent dark:bg-input/30"
      >
        <CalendarIcon />
        {dayjs(value).format("MMM D, YYYY")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto! p-0 bg-white dark:bg-popover border border-gray-200 dark:border-white/10 rounded-lg">
        <MonthCalendar
          key={value}
          value={value}
          disableFuture={false}
          onSelect={(d) => {
            if (min && d < min) return;
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function PolicySelect({ value, onChange, error }: { value: number | null; onChange: (id: number) => void; error?: string }) {
  const { data } = useUserPolicies();
  const [open, setOpen] = React.useState(false);
  const list = data?.data ?? [];
  const sel = list.find((p) => p.id === value);
  return (
    <div>
      <label className="text-sm font-medium leading-none">Policy</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          role="combobox"
          data-testid="policy-select"
          className={cn(
            "mt-1.5 flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-sm shadow-xs bg-secondary",
            error ? "border-red-500" : open ? "border-primary ring-2 ring-primary/30" : "border-ui-border",
          )}
        >
          <span className={cn("truncate", !sel && "text-foreground font-medium")}>{sel?.name ?? "Select time off policy"}</span>
          <ChevronDown className="size-4 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width)! p-0 rounded-lg border border-ui-border">
          <Command>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input placeholder="Search time off policy" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-sm text-muted-foreground">No time off policy found.</Command.Empty>
              {list.map((p) => (
                <Command.Item
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-accent"
                  data-testid="policy-option"
                >
                  {p.name}
                  {p.id === value && <Check className="size-4" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

const mins = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

function daysOf(start: string, end: string, excludeWeekends: boolean) {
  const out: string[] = [];
  for (let d = dayjs(start); !d.isAfter(dayjs(end), "day"); d = d.add(1, "day")) if (!excludeWeekends || (d.day() !== 0 && d.day() !== 6)) out.push(d.format("YYYY-MM-DD"));
  return out;
}

const INPUT = "h-9 w-full min-w-0 rounded-md border border-ui-border bg-transparent px-3 py-1 text-sm shadow-xs outline-none dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50";

/** "+ Time off" (always for the logged-in user) and "Edit Time Off Request". */
export function RequestFormDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: TimeOffRequest | null }) {
  const org = useOrgId();
  const { userId } = useSession();
  const invalidate = useInvalidateTimeOff();
  const { data: policies } = useUserPolicies();
  const today = dayjs().format("YYYY-MM-DD");
  const minDate = dayjs().subtract(14, "day").format("YYYY-MM-DD");
  const [policyId, setPolicyId] = React.useState<number | null>(null);
  const [start, setStart] = React.useState(today);
  const [end, setEnd] = React.useState(today);
  const [excludeWeekends, setExcludeWeekends] = React.useState(true);
  const [allDay, setAllDay] = React.useState(true);
  const [from, setFrom] = React.useState("09:00");
  const [to, setTo] = React.useState("17:00");
  const [notes, setNotes] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const [confirmAuto, setConfirmAuto] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      const d0 = editing.details[0];
      const full = editing.leave_type === "full_day";
      setPolicyId(editing.time_off_policy_id);
      setStart(editing.started_at_date);
      setEnd(editing.stopped_at_date);
      setAllDay(full);
      setFrom(!full && d0 ? d0.started_at_datetime.slice(11, 16) : "09:00");
      setTo(!full && d0 ? d0.stopped_at_datetime.slice(11, 16) : "17:00");
      setNotes(editing.notes ?? "");
    } else {
      setPolicyId(null);
      setStart(today);
      setEnd(today);
      setAllDay(true);
      setFrom("09:00");
      setTo("17:00");
      setNotes("");
    }
    setExcludeWeekends(true);
    setFiles([]);
    setFileError(null);
    setErrors({});
  }, [open, editing, today]);

  const days = React.useMemo(() => daysOf(start, end, excludeWeekends), [start, end, excludeWeekends]);
  const details = React.useMemo(() => days.map((d) => ({ started_at_datetime: `${d}T${allDay ? "09:00" : from}:00`, stopped_at_datetime: `${d}T${allDay ? "17:00" : to}:00` })), [days, allDay, from, to]);
  const policy = policies?.data.find((p) => p.id === policyId);
  const autoApprove = policy?.requires_approval === false;
  const existing = editing?.attachments ?? [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!policyId) e.policy = "Time off policy is required";
    if (!notes.trim()) e.notes = "Notes are required";
    if (end < start) e.end = "End date must be same or after start date";
    if (!allDay && mins(to) <= mins(from)) e.time = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const send = async () => {
    const data = { started_at_date: start, stopped_at_date: end, notes, leave_type: allDay ? "full_day" : "partial", status: "submitted", timezone: ORG_TZ, details, time_off_policy_id: policyId };
    const fd = new FormData();
    fd.append("data", JSON.stringify(data));
    files.forEach((f) => fd.append("files", f));
    setPending(true);
    try {
      const res = await fetch(`${API_BASE}/time-off/request/${org}${editing ? `/${editing.id}` : ""}`, { method: editing ? "PUT" : "POST", body: fd, credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as { message?: string; detail?: string } | null;
      if (!res.ok) throw new ApiRequestError(res.status, json?.detail ?? json?.message ?? "Failed", json);
      toast.success(editing ? "Time off request updated successfully" : "Time off request submitted successfully");
      invalidate();
      setConfirmAuto(false);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || (editing ? "Failed to update time off request" : "Failed to create time off request"));
      setConfirmAuto(false);
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!allDay && mins(to) <= mins(from)) {
      toast.error("End time must be after start time for each day.");
      return;
    }
    if (autoApprove) setConfirmAuto(true);
    else void send();
  };

  return (
    <>
      <Shell open={open} onOpenChange={(o) => !o && !pending && onClose()} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 font-karla" testId="timeoff-form-dialog">
        <div className="shrink-0 px-6 pt-6 pb-4">
          <DialogPrimitive.Title className="text-xl font-bold">
            {editing ? "Edit Time Off Request" : "Time Off Request"} <span className="text-brand-blue">({ORG_TZ})</span>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">All dates and times are recorded in the {ORG_TZ} timezone.</DialogPrimitive.Description>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto px-6 pb-5">
            <PolicySelect value={policyId} onChange={(id) => (setPolicyId(id), setErrors((x) => ({ ...x, policy: "" })))} error={errors.policy || undefined} />
            {autoApprove && (
              <div className="-mt-1.5 flex items-start gap-2 text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-xs leading-snug">This policy is auto-approved — your request is approved as soon as you submit it and cannot be edited afterwards.</p>
              </div>
            )}
            {editing && <BalanceSummaryBlock userId={editing.user_id ?? userId} policyId={policyId} details={details} excludeRequestId={editing.id} />}
            {!editing && policyId && <BalanceSummaryBlock userId={userId} policyId={policyId} details={details} />}
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium leading-none">Date(s)</span>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox id="exclude_weekends" variant="brand" className="rounded-none" checked={excludeWeekends} onCheckedChange={(v) => setExcludeWeekends(v === true)} />
                  Exclude weekends
                </label>
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateButton
                  value={start}
                  min={minDate}
                  testId="request-start-date"
                  onChange={(d) => {
                    setStart(d);
                    if (d > end) setEnd(d);
                  }}
                />
                <DateButton value={end} min={minDate} testId="request-end-date" onChange={setEnd} />
              </div>
              {errors.end && <p className="mt-1 text-sm text-red-500">{errors.end}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium leading-none">Time Range</span>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    id="all_day"
                    variant="brand"
                    className="rounded-none"
                    checked={allDay}
                    data-testid="all-day"
                    onCheckedChange={(v) => {
                      setAllDay(v === true);
                      if (v === true) {
                        setFrom("09:00");
                        setTo("17:00");
                      }
                    }}
                  />
                  All day (8 hrs)
                </label>
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="time" value={from} disabled={allDay} onChange={(e) => setFrom(e.target.value)} className={cn(INPUT, errors.time && "border-red-500")} data-testid="time-from" />
                <div>
                  <input type="time" value={to} disabled={allDay} onChange={(e) => setTo(e.target.value)} className={cn(INPUT, errors.time && "border-red-500")} data-testid="time-to" />
                  {errors.time && <p className="mt-1 text-sm text-red-500">{errors.time}</p>}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="text-sm font-medium leading-none">
                Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                data-testid="request-notes"
                onChange={(e) => (setNotes(e.target.value), e.target.value.trim() && setErrors((x) => ({ ...x, notes: "" })))}
                placeholder="Add a note for your approver..."
                className={cn("mt-1.5 flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none dark:bg-input/30", errors.notes && "border-red-500")}
              />
              {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes}</p>}
            </div>
            <div>
              <span className="text-sm font-medium leading-none">Attachment</span>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                className="hidden"
                data-testid="request-file"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  if (!list.length) return;
                  const next = [...files, ...list];
                  if (existing.length + next.length > 3) setFileError("You can attach a maximum of 3 files.");
                  else if (list.some((f) => f.size > 10 * 1024 * 1024)) setFileError(`"${list.find((f) => f.size > 10 * 1024 * 1024)!.name}" exceeds the 10 MB size limit.`);
                  else {
                    setFileError(null);
                    setFiles(next);
                  }
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              {existing.length + files.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Upload className="size-4 shrink-0" />
                  <span>Upload file · JPG, PNG, PDF, DOC, DOCX up to 10MB</span>
                </button>
              )}
              {fileError && <p className="mt-1 text-sm text-red-500">{fileError}</p>}
              {editing && existing.length > 0 && (
                <div className="mt-2">
                  <AttachmentList attachments={existing} requestId={editing.id} layout="chip" />
                </div>
              )}
              {files.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex w-full items-center gap-2.5 rounded-lg border border-ui-border px-3 py-2">
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtSize(f.size)}</p>
                      </div>
                      <button type="button" className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-red-500 hover:bg-red-50" onClick={() => setFiles((x) => x.filter((_, k) => k !== i))}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-xs font-medium leading-snug">
                Please specify the Time Off Policy you are applying for. Ensure that your <strong className="text-brand-blue">client</strong> or <strong className="text-brand-blue">manager</strong> has approved this time off and that a notification has been
                sent to <strong className="text-brand-blue">attendance@acme-remote.example</strong>
              </p>
            </div>
          </div>
          <div className="shrink-0 px-6 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 w-24 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface text-sm font-medium text-primary-text shadow-xs hover:bg-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                data-testid="request-submit"
                className="inline-flex h-9 min-w-28 cursor-pointer items-center justify-center rounded-lg bg-[image:var(--gradient-positive)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving..." : editing ? "Save changes" : "Add time off"}
              </button>
            </div>
          </div>
        </form>
      </Shell>
      <ConfirmDialog
        open={confirmAuto}
        title="Submit and approve now?"
        description="This policy is auto-approved — the request is approved the moment you submit it, and can no longer be edited, resubmitted or withdrawn."
        cancelText="Keep editing"
        continueText="Submit and approve"
        continueDisabled={pending}
        onCancel={() => setConfirmAuto(false)}
        onContinue={() => void send()}
        testId="auto-approve-confirm"
      >
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          {policy?.name && (
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Policy</span>
              <span className="text-right font-medium">{policy.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Dates</span>
            <span className="font-medium">
              {dayjs(start).format("MMM DD")}
              {start !== end && ` → ${dayjs(end).format("MMM DD, YYYY")}`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Total hours</span>
            <span className="font-medium">{details.reduce((s, d) => s + dayjs(d.stopped_at_datetime).diff(dayjs(d.started_at_datetime), "hour", true), 0).toFixed(1)} hrs</span>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

export function DeleteRequestDialog({ data, onClose }: { data: TimeOffRequest; onClose: () => void }) {
  const org = useOrgId();
  const invalidate = useInvalidateTimeOff();
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const statusCls = { approved: "bg-green-100 text-green-700", submitted: "bg-blue-100 text-blue-700", denied: "bg-red-100 text-red-700" }[data.status];
  return (
    <Shell open onOpenChange={(o) => !o && onClose()} className="md:max-w-137.5 xl:max-w-2xl gap-0 p-0 font-karla" testId="timeoff-delete-dialog">
      <div className="px-6 pt-6 pb-4 border-b flex flex-col gap-2">
        <DialogPrimitive.Title className="text-xl font-semibold">Delete Time Off Request</DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-sm text-muted-foreground">Review the details before deleting this request</DialogPrimitive.Description>
      </div>
      <form
        className="flex flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!notes.trim()) return setErr(true);
          setPending(true);
          try {
            await apiSend("DELETE", `/time-off/request/${org}/${data.id}`, { timezone: ORG_TZ, deleted_notes: notes });
            toast.success("Time off request deleted successfully");
            invalidate();
            onClose();
          } catch (x) {
            toast.error((x as Error).message || "Failed to delete time off request");
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-start gap-3">
            <AvatarLetter name={data.user_name} src={data.profile_image_url} className="size-10" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{data.user_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{data.user_email}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date:</span>
              <span className="font-medium text-foreground">
                {dayjs(data.started_at_date).format("MMM DD")} - {dayjs(data.stopped_at_date).format("MMM DD, YYYY")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              <div className={cn("px-2 py-0.5 rounded-md text-xs font-medium capitalize", statusCls)}>{data.status}</div>
            </div>
            {data.notes && (
              <div className="flex items-start gap-2 w-full">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Notes:</span>
                <span className="text-xs text-foreground line-clamp-2">{data.notes}</span>
              </div>
            )}
          </div>
          {data.details.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Schedule Details ({data.details.length} {data.details.length === 1 ? "day" : "days"})
              </p>
              <div className="rounded-lg border bg-card max-h-60 overflow-y-auto">
                <div className="p-3 space-y-2">
                  {data.details.map((d, i) => {
                    const a = dayjs(d.started_at_datetime);
                    const b = dayjs(d.stopped_at_datetime);
                    return (
                      <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">{i + 1}</div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{a.format("ddd, MMM DD, YYYY")}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {a.format("h:mm A")} - {b.format("h:mm A")}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">{b.diff(a, "hour")}h</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="reason_notes" className="text-sm font-medium text-foreground">
              Deletion Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reason_notes"
              value={notes}
              data-testid="delete-reason"
              onChange={(e) => (setNotes(e.target.value), err && e.target.value.trim() && setErr(false))}
              placeholder="Please provide a reason for deleting this request..."
              rows={3}
              className={cn("w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none dark:bg-input/30", err && "border-destructive")}
            />
            {err && <p className="text-xs text-destructive">Deletion reason is required.</p>}
            <p className="text-xs text-muted-foreground">This action cannot be undone and will permanently remove the time off request.</p>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-row gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 min-w-25 cursor-pointer items-center justify-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium text-primary-text shadow-xs hover:bg-muted">
            Cancel
          </button>
          <button type="submit" disabled={pending} data-testid="delete-submit" className="inline-flex h-9 min-w-25 cursor-pointer items-center justify-center rounded-lg bg-[image:var(--gradient-negative)] px-4 text-sm font-medium text-white hover:opacity-90">
            {pending ? "Deleting..." : "Delete Request"}
          </button>
        </div>
      </form>
    </Shell>
  );
}
