"use client";

import * as React from "react";
import dayjs from "dayjs";
import { Activity, Eye, ImageOff, KeyRound, MousePointer2, ShieldAlert, SquarePen, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { detectionLabel, isContextKind, isMeetingKind, type ActivityShot, type FraudFlag } from "@/lib/types/screenshots";

/**
 * 10-minute slot cards of Activity › Screenshots (port of the live ScreenshotCard / NoActivityCard /
 * ManualCard components, chunks 0vlzn2u7zn-gi.js + 17kyf9zgfxf5l.js).
 */

const CARD = "text-card-foreground flex flex-col gap-6";
const PILL = "text-sm bg-secondary-surface border border-primary/20 px-6 py-1 rounded-full mb-4 w-full truncate text-center capitalize";
const TASK = "text-xs px-4 mb-2 w-full truncate text-center capitalize";
const TRASH_BTN =
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shrink-0 outline-none bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:bg-destructive/60 absolute top-3 right-3 z-50 size-6 rounded-full cursor-pointer";
const VIEW_BTN =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all shrink-0 outline-none text-primary-foreground shadow-xs focus-visible:ring-brand-blue/30 size-9 bg-black/50 hover:bg-black/90 cursor-pointer rounded-full";

export type ViewMode = "every_ten_minutes" | "all_records";

/** "Low <30 red, 30–50 amber, ≥50 green" — screenshot card activity bar. */
const barColor = (v: number) => (v < 30 ? "bg-red-500" : v < 50 ? "bg-amber-500" : "bg-green-500");
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

function DeletedTag() {
  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/55 backdrop-blur-md text-white text-[9px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full pointer-events-none">
      <Trash2 className="size-2.5" />
      Deleted
    </div>
  );
}

function SlotHeader({ project, task, muted }: { project?: string | null; task?: string | null; muted?: boolean }) {
  return (
    <div className="mb-1 flex flex-col justify-between items-center">
      <div title={project || "Not Available"} className={cn(PILL, muted && "text-muted-foreground italic normal-case")}>
        {project || "not available"}
      </div>
      <div title={task || "Not Available"} className={cn(TASK, muted && "text-muted-foreground italic normal-case")}>
        {task || "not available"}
      </div>
    </div>
  );
}

function HoverControls({
  hovered,
  selected,
  onToggle,
  onDelete,
}: {
  hovered: boolean;
  selected: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  return (
    <>
      {(hovered || selected) && onToggle && (
        <Checkbox
          variant="brand"
          checked={selected}
          onCheckedChange={() => onToggle()}
          className="absolute top-3 left-3 z-50 rounded-full border-2"
          onClick={(e) => e.stopPropagation()}
          aria-label="Select slot"
          data-testid="slot-select"
        />
      )}
      {hovered && onDelete && (
        <button
          type="button"
          title="Delete time slot"
          aria-label="Delete time slot"
          data-testid="slot-delete"
          className={TRASH_BTN}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </>
  );
}

function InputStats({ keys, mouse, activity, muted }: { keys: number | null; mouse: number | null; activity: number | null; muted?: boolean }) {
  return (
    <div className={cn("text-xs flex items-center justify-between p-1 gap-2", muted ? "text-muted-foreground" : "text-gray-600 dark:text-gray-300")}>
      <div className="flex items-center gap-1 justify-start" title={muted ? "No Keyboard Activity" : "Key Presses"}>
        <KeyRound className="size-3 shrink-0" strokeWidth={1.5} />
        <span>{keys === null ? "--" : fmt(keys)}</span>
      </div>
      <div className="flex items-center gap-1 justify-start" title={muted ? "No Mouse Activity" : "Mouse Clicks"}>
        <MousePointer2 className="size-3 shrink-0 -scale-x-100" strokeWidth={1.5} />
        <span>{mouse ? fmt(mouse) : "--"}</span>
      </div>
      <div className="flex items-center gap-1 justify-start" title={muted ? "No Activity" : "Activity Percentage"}>
        <Activity className="size-3 shrink-0" strokeWidth={1.5} />
        <span>{activity === null ? "-- %" : `${Math.round(activity)} %`}</span>
      </div>
    </div>
  );
}

/* ---------------- detection badge + dialog ---------------- */

function Chip({ tone, size = "md", className, children }: { tone: "positive" | "warning" | "negative" | "primary"; size?: "sm" | "md"; className?: string; children: React.ReactNode }) {
  const tones = {
    positive:
      "bg-[color-mix(in_oklab,var(--positive)_30%,var(--card))] text-[oklch(from_var(--positive)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--positive)_34%,var(--card))] dark:text-[oklch(from_var(--positive)_0.86_c_h)]",
    warning:
      "bg-[color-mix(in_oklab,var(--warning)_42%,var(--card))] text-[oklch(from_var(--warning)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--warning)_34%,var(--card))] dark:text-[oklch(from_var(--warning)_0.86_c_h)]",
    negative:
      "bg-[color-mix(in_oklab,var(--negative)_26%,var(--card))] text-[oklch(from_var(--negative)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--negative)_34%,var(--card))] dark:text-[oklch(from_var(--negative)_0.86_c_h)]",
    primary:
      "bg-[color-mix(in_oklab,var(--primary)_28%,var(--card))] text-[oklch(from_var(--primary)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--primary)_34%,var(--card))] dark:text-[oklch(from_var(--primary)_0.86_c_h)]",
  };
  return (
    <span
      data-slot="chip"
      className={cn(
        "inline-flex w-fit items-center justify-center gap-1 rounded-full border border-transparent whitespace-nowrap dark:border-white/10 font-semibold leading-none",
        size === "sm" ? "h-5 min-w-14 px-2 text-[11px]" : "h-6 min-w-16 px-2.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function evidenceValue(v: unknown, key: string): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.map((x) => String(x).replace(/_/g, " ")).join(", ") : "-";
  if (typeof v === "number" && !/(^|_)(id|ids|uuid|year|version)$/i.test(key)) return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(v);
  return String(v);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground min-w-40 shrink-0 capitalize">{label}</span>
      <span className="text-foreground break-all">{value ?? "-"}</span>
    </div>
  );
}

function Evidence({ evidence }: { evidence: Record<string, unknown> }) {
  const flat: [string, string][] = [];
  const nested: [string, Record<string, unknown>][] = [];
  Object.entries(evidence).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) nested.push([k, v as Record<string, unknown>]);
    else flat.push([k, evidenceValue(v, k)]);
  });
  return (
    <div className="flex flex-col gap-4">
      {flat.length > 0 && (
        <div className="flex flex-col gap-2">
          {flat.map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, " ")} value={v} />
          ))}
        </div>
      )}
      {nested.map(([k, obj]) => (
        <div key={k} className="rounded-lg border border-layout-subtle overflow-hidden">
          <div className="bg-secondary-surface px-3 py-2 border-b border-layout-subtle">
            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">{k.replace(/_/g, " ")}</span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {Object.entries(obj).map(([kk, vv]) => (
              <Row key={kk} label={kk.replace(/_/g, " ")} value={evidenceValue(vv, kk)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OsIcon({ os }: { os: string }) {
  return os === "windows" ? (
    <svg viewBox="0 0 24 24" className="shrink-0 size-3.5" fill="currentColor" aria-hidden="true">
      <path d="M3 5.5 10.5 4.5v7H3zM11.5 4.4 21 3v8.5h-9.5zM3 12.5h7.5v7L3 18.5zM11.5 12.5H21V21l-9.5-1.4z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="shrink-0 size-3.5" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-.9-3.2-.8c-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4c.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-1-2.4-4zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z" />
    </svg>
  );
}

export function DetectionDialog({ open, onOpenChange, flags, timeSlot }: { open: boolean; onOpenChange: (o: boolean) => void; flags: FraudFlag[]; timeSlot: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-hidden" data-testid="detection-dialog">
        <div data-slot="dialog-header" className="flex flex-col gap-2 text-center sm:text-left shrink-0">
          <DialogTitle>Detection Details</DialogTitle>
          <DialogDescription>
            {flags.length} detection{flags.length !== 1 ? "s" : ""} recorded for {timeSlot}
          </DialogDescription>
        </div>
        <div className="-mr-6 flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto pr-4 pb-2">
          {flags.map((f, i) => {
            const context = isContextKind(f.kind);
            return (
              <div key={f.id} className="flex flex-col gap-6">
                {i > 0 && <div role="none" data-slot="divider" className="shrink-0 bg-border h-px w-full" />}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Detection Overview</h3>
                  <div className="flex flex-col gap-2">
                    <Row
                      label="Category"
                      value={
                        <Chip tone={context ? "primary" : "negative"} className="capitalize w-20 overflow-hidden">
                          <span className="min-w-0 truncate">{context ? "Context" : "Fraud"}</span>
                        </Chip>
                      }
                    />
                    <Row label="Detection Kind" value={<span className="font-medium">{detectionLabel(f.kind)}</span>} />
                    <Row label="Kind Key" value={f.kind} />
                    <Row
                      label="Policy Action"
                      value={
                        f.policy_action ? (
                          <Chip tone={f.policy_action === "flag" ? "negative" : "warning"} className="capitalize w-20 overflow-hidden">
                            <span className="min-w-0 truncate">{f.policy_action}</span>
                          </Chip>
                        ) : (
                          "-"
                        )
                      }
                    />
                    <Row label="Detected At" value={dayjs(`${f.detected_at}Z`).isValid() ? dayjs(`${f.detected_at}Z`).format("MMM DD, YYYY hh:mm A") : "-"} />
                    <Row label="Time Slot" value={timeSlot} />
                    <Row
                      label="OS Source"
                      value={
                        f.os_source ? (
                          <span className="flex items-center gap-1.5">
                            <OsIcon os={f.os_source} />
                            {f.os_source === "macos" ? "macOS" : f.os_source.charAt(0).toUpperCase() + f.os_source.slice(1)}
                          </span>
                        ) : (
                          "-"
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Evidence</h3>
                  {f.evidence && Object.keys(f.evidence).length > 0 ? <Evidence evidence={f.evidence} /> : <p className="text-sm text-muted-foreground">No evidence recorded for this detection.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AUDIO_RE = /(mic|microphone|audio|speak|speaking|talking|voice|video|camera|webcam|screen_share|sharing)/i;
const OFF = new Set(["off", "false", "0", "no", "none", "muted", "mute", "disabled", "inactive"]);
const truthy = (v: unknown) => (typeof v === "boolean" ? v : typeof v === "number" ? v > 0 : typeof v === "string" && !OFF.has(v.trim().toLowerCase()));
const hasAudio = (f: FraudFlag) =>
  Object.entries(f.evidence ?? {}).some(([k, v]) =>
    v === null || Array.isArray(v) ? false : typeof v === "object" ? Object.entries(v as object).some(([kk, vv]) => AUDIO_RE.test(kk) && vv !== null && truthy(vv)) : AUDIO_RE.test(k) && truthy(v),
  );

/** "Meeting" (green) / "N detections" (amber) / fraud kind (red) chip that opens Detection Details. */
export function DetectionBadge({ flags, timeSlot, hasInteraction }: { flags: FraudFlag[]; timeSlot: string; hasInteraction: boolean }) {
  const [open, setOpen] = React.useState(false);
  const visible = flags.filter((f) => f.kind !== "meeting_teammate_confirmed");
  const first = visible[0];
  if (!first) return null;
  const fraud = visible.some((f) => !isContextKind(f.kind));
  const meeting = !fraud && visible.every((f) => isMeetingKind(f.kind)) && (hasInteraction || visible.some(hasAudio));
  const label = visible.length === 1 ? detectionLabel(first.kind) : `${visible.length} detections`;
  return (
    <>
      <button type="button" className="w-fit max-w-full" onClick={() => setOpen(true)} data-testid="detection-badge">
        <Chip tone={fraud ? "negative" : meeting ? "positive" : "warning"} size="sm" className="max-w-full cursor-pointer shadow-sm">
          <span className="-ml-0.5 flex [&_svg]:size-3.5">{fraud ? <TriangleAlert /> : <ShieldAlert />}</span>
          <span className="min-w-0 truncate">{label}</span>
        </Chip>
      </button>
      <DetectionDialog open={open} onOpenChange={setOpen} flags={flags} timeSlot={timeSlot} />
    </>
  );
}

/* ---------------- cards ---------------- */

interface CardCommon {
  timeSlot: string;
  selected?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  isDeleted?: boolean;
}

/** Card with a screenshot thumbnail (10-min view and "All" view). */
export function ScreenshotSlotCard({
  shots,
  timeSlot,
  activity,
  keyPresses,
  mouse,
  onView,
  mode,
  selected = false,
  onToggle,
  onDelete,
  isDeleted = false,
  flags,
}: CardCommon & {
  shots: ActivityShot[];
  activity: number;
  keyPresses: number;
  mouse: number;
  onView: () => void;
  mode: ViewMode;
  flags?: FraudFlag[];
}) {
  const [hovered, setHovered] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const shot = shots[0];
  return (
    <div data-testid="slot-card" data-time={timeSlot}>
      <SlotHeader project={shot?.project} task={shot?.task} />
      <div
        data-slot="card"
        className={cn(CARD, "p-2 rounded-xl shadow-none cursor-pointer relative bg-secondary-surface", isDeleted ? "border-2 border-red-300" : "border border-ui-border")}
        onClick={onView}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <HoverControls hovered={hovered} selected={selected} onToggle={onToggle} onDelete={onDelete} />
        <div className="relative aspect-video w-full overflow-hidden rounded bg-muted border">
          {isDeleted && <DeletedTag />}
          {failed || !shot?.url ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-white/5">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <ImageOff className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-sm">Screenshot failed to load</p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Screenshot at ${timeSlot}`}
              loading="lazy"
              decoding="async"
              className="object-cover"
              src={shot.url}
              onError={() => setFailed(true)}
              style={{ position: "absolute", height: "100%", width: "100%", inset: 0, color: "transparent" }}
            />
          )}
          <div className="absolute inset-0  bg-linear-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center p-2">
            {mode === "every_ten_minutes" && (
              <div className="absolute bottom-2 left-2 text-xs text-white">
                {shots.length} screenshot{shots.length !== 1 ? "s" : ""} available
              </div>
            )}
            <button
              type="button"
              data-slot="button"
              aria-label="View screenshot"
              data-testid="slot-view"
              className={VIEW_BTN}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="size-4 fill-white" />
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {flags?.length ? (
            <div className="relative h-0 -mb-2">
              <div className="absolute bottom-0 right-0 z-30 max-w-full" onClick={(e) => e.stopPropagation()}>
                <DetectionBadge flags={flags} timeSlot={timeSlot} hasInteraction={keyPresses + mouse > 0} />
              </div>
            </div>
          ) : null}
          <div className="flex justify-between items-center">
            <span className={cn("normal-case whitespace-normal text-xs font-medium px-2 py-1", isDeleted ? "text-red-400/80 line-through" : "text-gray-600 dark:text-gray-300")}>{timeSlot}</span>
          </div>
          {mode === "every_ten_minutes" && (
            <>
              <div className="w-full items-center flex gap-2">
                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", barColor(activity))} style={{ width: `${activity}%` }} />
                </div>
              </div>
              <InputStats keys={keyPresses} mouse={mouse} activity={activity} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Slot with tracked input but no screenshot ("No Screenshot"), or no activity at all ("No Activity"). */
export function NoShotCard({
  timeSlot,
  activity,
  keyPresses,
  mouse,
  project,
  task,
  selected = false,
  onToggle,
  onDelete,
  isDeleted = false,
}: CardCommon & { activity?: number; keyPresses?: number; mouse?: number; project?: string | null; task?: string | null }) {
  const [hovered, setHovered] = React.useState(false);
  const hasInput = (keyPresses ?? 0) > 0 || (mouse ?? 0) > 0;
  return (
    <div data-testid="slot-card" data-time={timeSlot}>
      <SlotHeader project={project} task={task} muted />
      <div
        data-slot="card"
        className={cn(CARD, "p-2 rounded-xl shadow-none relative", isDeleted ? "border border-red-300/60" : "border border-ui-border bg-secondary-surface")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <HoverControls hovered={hovered} selected={selected} onToggle={onToggle} onDelete={onDelete} />
        <div className={cn("relative aspect-video w-full overflow-hidden rounded-lg bg-muted flex flex-col items-center justify-center gap-2", hasInput && "border-2 border-dashed border-ui-border")}>
          {isDeleted && <DeletedTag />}
          {hasInput ? (
            <div className="rounded-xl bg-card border border-border p-3 shadow-sm">
              <ImageOff className="size-6 text-blue-300" strokeWidth={1.5} />
            </div>
          ) : (
            <div className="rounded-xl bg-card border border-border p-3  border-dashed shadow-xs">
              <SquarePen className="size-6 text-amber-300" strokeWidth={1.5} />
            </div>
          )}
          <span className="text-muted-foreground text-[11px] tracking-wide">{hasInput ? "No Screenshot" : "No Activity"}</span>
        </div>
        <div className="mt-2 space-y-1">
          <span className={cn("text-xs font-medium px-2 py-1 block", isDeleted ? "text-red-400/80 line-through" : hasInput ? "text-gray-600 dark:text-gray-300" : "text-muted-foreground")}>{timeSlot}</span>
          {hasInput ? (
            <>
              <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", (activity ?? 0) >= 70 ? "bg-green-500" : (activity ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${activity}%` }} />
              </div>
              <InputStats keys={keyPresses ?? null} mouse={mouse ?? null} activity={activity ?? 0} />
            </>
          ) : (
            <>
              <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full" />
              <InputStats keys={null} mouse={null} activity={null} muted />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** Manually added time: dotted placeholder with a "MANUAL" pill. */
export function ManualSlotCard({ timeSlot, project, task, selected = false, onToggle, onDelete, isDeleted = false }: CardCommon & { project?: string | null; task?: string | null }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div data-testid="slot-card" data-time={timeSlot}>
      <SlotHeader project={project} task={task} />
      <div
        data-slot="card"
        className={cn(CARD, "p-2 rounded-xl shadow-none relative overflow-hidden bg-card/50", isDeleted ? "border border-red-300/60" : "border border-gray-300")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <HoverControls hovered={hovered} selected={selected} onToggle={onToggle} onDelete={onDelete} />
        <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100 dark:bg-white/5 border flex flex-col items-center justify-center gap-3">
          {isDeleted && <DeletedTag />}
          <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#6b7280" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <div className="size-11 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <PenIcon className="text-violet-600" />
            </div>
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1 shadow-xs">
              <div className="size-1.5 rounded-full bg-violet-400" />
              <span className="text-[10px] font-semibold text-violet-600 tracking-widest uppercase">Manual</span>
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className={cn("text-xs font-medium px-2 py-1", isDeleted ? "text-red-400/80 line-through" : "text-gray-600 dark:text-gray-300")}>{timeSlot}</span>
          </div>
          <div className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-full" />
          <div className="text-xs flex items-center justify-center text-gray-400 p-1">
            <span className="text-[10px] tracking-wide">Manually logged — no tracking data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
