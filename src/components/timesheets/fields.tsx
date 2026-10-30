"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Check, ChevronDown, Clock, Search, XIcon } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { TaskOption } from "@/lib/types/timesheets";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MonthCalendar } from "@/components/filters/DateControls";
import { useProjects } from "@/components/filters/OptionChip";
import { COMMAND_GROUP, COMMAND_ITEM, COMMAND_LIST } from "@/components/filters/styles";
import dayjs from "dayjs";

/** Form primitives used by the Timesheets dialogs (classes from the live DOM). */

const BTN_BASE =
  "inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer rounded-lg font-medium";
export const BTN_SECONDARY = `${BTN_BASE} border h-9 gap-2 px-4 text-sm border-ui-border bg-secondary-surface text-primary-text shadow-xs hover:bg-muted`;
export const BTN_THEMED = `${BTN_BASE} h-9 gap-2 px-4 text-sm bg-[image:var(--gradient-theme)] text-white hover:opacity-90`;
export const BTN_PRIMARY = `${BTN_BASE} h-9 gap-2 px-4 text-sm bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90`;
export const BTN_NEGATIVE = `${BTN_BASE} h-9 gap-2 px-4 text-sm bg-[image:var(--gradient-negative)] text-negative-foreground hover:opacity-90`;

const INPUT_BASE =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex min-w-0 border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";
export const INPUT_LG = `${INPUT_BASE} w-full h-11 pr-10 rounded-lg border-ui-border bg-secondary-surface`;
export const INPUT_SM = `${INPUT_BASE} border-ui-border h-9 w-full rounded-md bg-transparent pr-10`;
export const TEXTAREA =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const TRIGGER =
  "inline-flex items-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50 px-4 py-2 has-[>svg]:px-3 justify-between text-sm border border-ui-border dark:border-ui-border rounded-lg shadow-xs";

/** Uppercase dialog label with a red "*" (live `Label variant="plain" required`). */
export function FieldLabel({ children, required, upper = true, htmlFor, className }: { children: React.ReactNode; required?: boolean; upper?: boolean; htmlFor?: string; className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("peer-disabled:cursor-not-allowed peer-disabled:opacity-70", upper ? "text-xs font-medium uppercase text-muted-foreground" : "text-sm font-medium leading-none", className)}
    >
      {children}
      {required && <span className="text-red-600">*</span>}
    </label>
  );
}

export const FieldError = ({ msg }: { msg?: string }) => (msg ? <p className="text-sm text-red-600">{msg}</p> : null);

/** Avatar + name (live "UserAvatar" used in Add Time / Delete dialogs). */
export function NameAvatar({ name }: { name: string }) {
  return (
    <div className="py-0.5 flex items-center gap-1">
      <span data-slot="avatar" data-size="default" className="group/avatar relative flex shrink-0 overflow-hidden select-none size-8 rounded-full">
        <span data-slot="avatar-fallback" className="rounded-full text-sm font-bold text-primary-foreground aspect-square bg-primary border-2 border-gray-400 flex items-center justify-center size-full shrink-0">
          {name.charAt(0).toUpperCase()}
        </span>
      </span>
      <span className="text-primary font-semibold">{name}</span>
    </div>
  );
}

/** Time input with the clock icon. */
export function TimeInput({ value, onChange, large, blueIcon, disabled, min, max, name, testId }: { value: string; onChange: (v: string) => void; large?: boolean; blueIcon?: boolean; disabled?: boolean; min?: string; max?: string; name?: string; testId?: string }) {
  return (
    <div className="relative">
      <input
        data-slot="input"
        type="time"
        step="1"
        name={name}
        data-testid={testId}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value)}
        className={large ? INPUT_LG : INPUT_SM}
      />
      <Clock className={cn("absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", blueIcon ? "text-blue-500" : "text-muted-foreground")} />
    </div>
  );
}

/** Date field (disabled in Edit / Split; enabled in the header "Add Time"). */
export function DateField({ value, onChange, disabled, className }: { value: string; onChange?: (d: string) => void; disabled?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger
        disabled={disabled}
        data-testid="dialog-date"
        className={cn(
          "gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none hover:bg-accent hover:text-accent-foreground px-4 py-2 has-[>svg]:px-3 flex items-center w-72 max-w-96 justify-start text-left font-normal border border-ui-border rounded-lg shadow-xs min-w-full",
          disabled && "cursor-not-allowed",
          className,
        )}
      >
        <CalendarIcon />
        {value ? dayjs(value).format("MMM D, YYYY") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto! p-0 bg-white dark:bg-popover border border-gray-200 dark:border-white/10 rounded-lg">
        <MonthCalendar
          value={value}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ComboList<T extends { id: string; name: string }>({
  items,
  selectedId,
  placeholder,
  empty,
  onSelect,
}: {
  items: T[];
  selectedId?: string;
  placeholder: string;
  empty: string;
  onSelect: (item: T) => void;
}) {
  const [search, setSearch] = React.useState("");
  const list = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Command shouldFilter={false} data-slot="command" className="text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent">
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input placeholder={placeholder} className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" value={search} onValueChange={setSearch} />
        </div>
      </div>
      <Command.List data-slot="command-list" className={COMMAND_LIST}>
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">{empty}</Command.Empty>
        <Command.Group data-slot="command-group" className={COMMAND_GROUP}>
          {list.map((i) => (
            <Command.Item key={i.id} value={i.id} title={i.name} data-slot="command-item" className={COMMAND_ITEM} onSelect={() => onSelect(i)}>
              <span className="min-w-0 flex-1 truncate text-foreground">{i.name}</span>
              {i.id === selectedId && <Check className="ml-auto stroke-3 text-primary" />}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command>
  );
}

/** "Select Project" combobox (member's projects). */
export function ProjectSelect({ userId, value, onChange, className, testId = "project-select" }: { userId: string; value: { id: string; name: string }; onChange: (p: { id: string; name: string }) => void; className?: string; testId?: string }) {
  const [open, setOpen] = React.useState(false);
  const { data = [] } = useProjects(userId);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger role="combobox" title={value.name || "Select Project"} className={cn(TRIGGER, "w-full", className)} data-testid={testId}>
        <span className="min-w-0 flex-1 truncate text-left">{value.name || "Select Project"}</span>
        <ChevronDown className="shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden rounded-2xl border border-border p-0 shadow-xl w-64" style={{ width: "var(--radix-popover-trigger-width)" }} data-testid={`${testId}-popover`}>
        <ComboList
          items={data}
          selectedId={value.id}
          placeholder="Search project"
          empty="No projects found."
          onSelect={(p) => {
            onChange({ id: p.id, name: p.name });
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** "Select Task" combobox — GET /project/all-tasks/{org}/{project}/{user} (["All","PROJECT_TASKS",…]). */
export function TaskSelect({ projectId, userId, value, onChange, className, testId = "task-select" }: { projectId: string; userId: string; value: { id: string; name: string }; onChange: (t: { id: string; name: string } | null) => void; className?: string; testId?: string }) {
  const [open, setOpen] = React.useState(false);
  const { organizationId } = useSession();
  const { data } = useApiQuery<{ items: TaskOption[] }>({
    endpoint: `/project/all-tasks/${organizationId}/${projectId}/${userId}`,
    queryKey: ["All", "PROJECT_TASKS", { organizationId }, { userId }, { projectId }],
    enabled: open && !!organizationId && !!projectId && !!userId,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger role="combobox" title={value.name || "Select Task"} className={cn(TRIGGER, "w-full", className)} data-testid={testId}>
        <span className="min-w-0 flex-1 truncate text-left">{value.name || "Select Task"}</span>
        <ChevronDown className="ml-2 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden rounded-2xl border border-border p-0 shadow-xl w-64" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <ComboList
          items={data?.items ?? []}
          selectedId={value.id}
          placeholder="Search task..."
          empty={projectId ? "No task found." : "Select a project first."}
          onSelect={(t) => {
            onChange(t.id === value.id ? null : t);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Disabled user "select" shown in Edit / Split. */
export function UserSelectDisabled({ name }: { name: string }) {
  return (
    <button type="button" disabled role="combobox" title={name} className={cn(TRIGGER, "h-9 bg-card w-full")}>
      <span className="min-w-0 flex-1 text-left truncate">{name}</span>
      <ChevronDown className="shrink-0 opacity-50" />
    </button>
  );
}

/**
 * Dialog shell (live DialogContent frame="flat"): `color` tints the close button (primary / negative),
 * plain dialogs get the faint X.
 */
export function TsDialog({
  open,
  onOpenChange,
  title,
  description,
  color,
  className,
  children,
  header,
  testId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  color?: "primary" | "negative";
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  testId?: string;
}) {
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
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg p-6 shadow-lg duration-200 bg-background dark:border dark:border-subtle-layout sm:max-w-lg font-karla",
            className,
          )}
        >
          <div data-slot="dialog-header" className="flex flex-col gap-2 text-center sm:text-left">
            <DialogPrimitive.Title data-slot="dialog-title" className="text-lg leading-none font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description data-slot="dialog-description" className="text-muted-foreground text-sm sr-only">
              {description}
            </DialogPrimitive.Description>
            {header}
          </div>
          {children}
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "ring-offset-background focus:ring-ring absolute top-4 right-4 transition-opacity focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              color ? cn("cursor-pointer rounded-full p-1 text-white hover:opacity-80", color === "negative" ? "bg-negative" : "bg-primary") : "rounded-xs opacity-70 hover:opacity-100",
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}

/* ---------- time helpers ---------- */

export const toSec = (hms: string) => {
  const p = hms.split(":").map(Number);
  if (p.some((n) => Number.isNaN(n))) return NaN;
  const [h = 0, m = 0, s = 0] = p;
  return h * 3600 + m * 60 + s;
};
export const fromSec = (sec: number) => {
  const t = ((sec % 86400) + 86400) % 86400;
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0")).join(":");
};
/** 574 -> "9m 34s" */
export const humanDur = (sec: number) => {
  if (sec <= 0) return null;
  const out: string[] = [];
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) out.push(`${h}h`);
  if (m) out.push(`${m}m`);
  if (s) out.push(`${s}s`);
  return out.join(" ") || null;
};
/** "12:03:31" -> "12:03:31 PM" */
export const twelve = (hms: string) => (hms ? dayjs(`2000-01-01T${hms}`).format("hh:mm:ss A") : "");
