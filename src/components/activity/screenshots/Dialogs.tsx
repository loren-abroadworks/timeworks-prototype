"use client";

import * as React from "react";
import dayjs from "dayjs";
import { Download, Loader2, X } from "lucide-react";
import { apiGet, apiSend } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker, type DateRange } from "@/components/dashboard/shared/DateRangePicker";
import { SURFACE_BUTTON } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";

const NEGATIVE_BUTTON = cn(SURFACE_BUTTON, "border-transparent bg-destructive text-white hover:bg-destructive/90");
const BRAND_BUTTON = cn(SURFACE_BUTTON, "border-transparent bg-brand-blue text-primary-foreground hover:bg-brand-blue/90");

/** "Delete selected time slots?" confirm (reason optional, like the live code). */
export function DeleteSlotsDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md" data-testid="delete-slots-dialog">
        <DialogTitle>Delete selected time slots?</DialogTitle>
        <DialogDescription className="sr-only">Confirm deletion of the selected screenshot time slots.</DialogDescription>
        <p className="text-sm text-muted-foreground">Please provide a reason for deleting the selected time slots.</p>
        <textarea
          data-slot="textarea"
          rows={3}
          placeholder="Enter reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="placeholder:text-muted-foreground dark:bg-input/30 border-ui-border w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={SURFACE_BUTTON} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={NEGATIVE_BUTTON} onClick={() => onConfirm(reason)} data-testid="delete-slots-confirm">
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Bulk Download Screenshots": Member, Timezone, Date Range → POST bulk-download/async, then polls the status
 * endpoint. The replica never produces a zip (status turns "ready" with download_url null) — a toast says so.
 */
export function BulkDownloadDialog({ open, onOpenChange, userId, userName, date, timezone }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string; userName: string; date: string; timezone: string }) {
  const { organizationId } = useSession();
  const [range, setRange] = React.useState<DateRange>({ start: null, end: null });
  const [state, setState] = React.useState<"idle" | "starting" | "preparing" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (open) {
      const d = dayjs(date).isValid() ? dayjs(date).toDate() : new Date();
      setRange({ start: d, end: d });
      setState("idle");
    }
  }, [open, date]);
  React.useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const start = async () => {
    const s = range.start ? dayjs(range.start).format("YYYY-MM-DD") : date;
    const e = range.end ? dayjs(range.end).format("YYYY-MM-DD") : s;
    setState("starting");
    try {
      const res = await apiSend<{ status: string; task_id: string | null }>("POST", `/bulk-activity-screenshots/${organizationId}/bulk-download/async`, { member_id: userId, start_date: s, end_date: e, timezone });
      if (res.status === "empty" || !res.task_id) {
        toast.error("No screenshots found for the selected range");
        setState("idle");
        onOpenChange(false);
        return;
      }
      setState("preparing");
      toast.success(`Preparing download: ${userName || "Member"} · ${s}${e !== s ? ` – ${e}` : ""}`);
      timer.current = setInterval(async () => {
        try {
          const st = await apiGet<{ status: string; file_name: string; screenshot_count: number }>(`/bulk-activity-screenshots/${organizationId}/bulk-download/status/${res.task_id}`);
          if (st.status === "ready") {
            if (timer.current) clearInterval(timer.current);
            toast.success(`${st.screenshot_count} screenshots ready (${st.file_name}) — replica: no file is generated`);
            setState("idle");
            onOpenChange(false);
          } else if (st.status === "failed") {
            if (timer.current) clearInterval(timer.current);
            setState("failed");
          }
        } catch {
          if (timer.current) clearInterval(timer.current);
          setState("failed");
        }
      }, 700);
    } catch {
      setState("failed");
    }
  };

  const busy = state === "starting" || state === "preparing";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="bulk-download-dialog">
        <DialogTitle>Bulk Download Screenshots</DialogTitle>
        <DialogDescription className="sr-only">Pick a date range to download screenshots in bulk.</DialogDescription>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Member</span>
            <span className="font-medium">{userName || "—"}</span>
            <span className="text-muted-foreground">Timezone</span>
            <span className="font-medium">{timezone}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Date Range</span>
            <DateRangePicker value={range} onDateRangeChange={setRange} disableFuture triggerClassName="w-full" />
          </div>
          {state === "preparing" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your download. You can wait here, or continue in the background — it will download automatically when ready.
            </p>
          )}
          {state === "failed" && <p className="text-sm text-destructive">Something went wrong. You can try again.</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={SURFACE_BUTTON} onClick={() => onOpenChange(false)}>
            {state === "preparing" ? (
              "Continue in Background"
            ) : (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            )}
          </button>
          <button type="button" className={BRAND_BUTTON} onClick={start} disabled={busy || !userId} data-testid="bulk-download-submit">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {state === "preparing" ? "Preparing…" : state === "failed" ? "Try Again" : "Download"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
