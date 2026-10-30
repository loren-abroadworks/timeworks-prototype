"use client";

import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker } from "@/components/dashboard/shared/DateRangePicker";
import { ICON_NAV_BUTTON, SURFACE_BUTTON } from "./styles";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const todayStr = () => dayjs().format("YYYY-MM-DD");

export function CalendarIcon({ className = "mr-2 h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M5.625 0C5.96875 0 6.25 0.28125 6.25 0.625V2.5H13.75V0.625C13.75 0.28125 14.0312 0 14.375 0C14.7188 0 15 0.28125 15 0.625V2.5H16.25C17.6289 2.5 18.75 3.62109 18.75 5V6.25V7.5V17.5C18.75 18.8789 17.6289 20 16.25 20H3.75C2.37109 20 1.25 18.8789 1.25 17.5V7.5V6.25V5C1.25 3.62109 2.37109 2.5 3.75 2.5H5V0.625C5 0.28125 5.28125 0 5.625 0ZM17.5 7.5H2.5V17.5C2.5 18.1914 3.05859 18.75 3.75 18.75H16.25C16.9414 18.75 17.5 18.1914 17.5 17.5V7.5ZM16.25 3.75H3.75C3.05859 3.75 2.5 4.30859 2.5 5V6.25H17.5V5C17.5 4.30859 16.9414 3.75 16.25 3.75Z" />
    </svg>
  );
}

const MONTH_NAV =
  "whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none hover:bg-accent hover:text-accent-foreground gap-1.5 has-[>svg]:px-2.5 h-8 w-8 p-0 flex items-center justify-center bg-card border border-ui-border rounded-lg shadow-xs cursor-pointer";

/** Single-month calendar (live "DatePicker" popover body). Future days disabled when `disableFuture`. */
export function MonthCalendar({ value, onSelect, disableFuture = true }: { value: string; onSelect: (date: string) => void; disableFuture?: boolean }) {
  const [view, setView] = React.useState(() => dayjs(value || undefined).startOf("month"));
  const [mode, setMode] = React.useState<"days" | "months" | "years">("days");
  const first = view.startOf("month");
  const blanks = first.day();
  const days = view.daysInMonth();
  const today = dayjs().startOf("day");

  return (
    <div className="bg-white dark:bg-popover px-4 pt-4 border-b border-gray-200 dark:border-white/10 rounded-lg">
      <div className="p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <button data-slot="button" type="button" className={MONTH_NAV} aria-label="Previous" onClick={() => setView(mode === "years" ? view.subtract(12, "year") : mode === "months" ? view.subtract(1, "year") : view.subtract(1, "month"))}>
            <ChevronLeft />
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="text-lg font-semibold hover:text-primary transition-colors" onClick={() => setMode(mode === "months" ? "days" : "months")}>
              {MONTHS[view.month()]}
            </button>
            <button type="button" className="text-lg font-semibold hover:text-primary transition-colors" onClick={() => setMode(mode === "years" ? "days" : "years")}>
              {view.year()}
            </button>
          </div>
          <button
            data-slot="button"
            type="button"
            className={MONTH_NAV}
            aria-label="Next"
            disabled={disableFuture && mode === "days" && view.add(1, "month").isAfter(today)}
            onClick={() => setView(mode === "years" ? view.add(12, "year") : mode === "months" ? view.add(1, "year") : view.add(1, "month"))}
          >
            <ChevronRight />
          </button>
        </div>
        {mode === "days" && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: blanks }).map((_, i) => (
                <div key={`b${i}`} className="h-8 w-8" />
              ))}
              {Array.from({ length: days }).map((_, i) => {
                const d = first.date(i + 1);
                const ds = d.format("YYYY-MM-DD");
                const disabled = disableFuture && d.isAfter(today);
                const selected = ds === value;
                return (
                  <button
                    key={ds}
                    type="button"
                    disabled={disabled}
                    data-date={ds}
                    onClick={() => onSelect(ds)}
                    className={cn(
                      "h-8 w-8 text-sm rounded-md transition-colors",
                      selected ? "bg-primary text-primary-foreground font-medium" : "hover:bg-gray-100 dark:hover:bg-white/10",
                      disabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {mode === "months" && (
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                type="button"
                className={cn("h-9 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10", i === view.month() && "bg-primary text-primary-foreground")}
                onClick={() => {
                  setView(view.month(i));
                  setMode("days");
                }}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
        {mode === "years" && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const y = view.year() - 6 + i;
              return (
                <button
                  key={y}
                  type="button"
                  disabled={disableFuture && y > today.year()}
                  className={cn("h-9 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40", y === view.year() && "bg-primary text-primary-foreground")}
                  onClick={() => {
                    setView(view.year(y));
                    setMode("days");
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Date button ("Oct 28, 2026") + single-month popover. */
export function SingleDatePicker({ value, onChange, className, disableFuture = true }: { value: string; onChange: (date: string) => void; className?: string; disableFuture?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 outline-none hover:bg-accent hover:text-accent-foreground px-4 py-2 has-[>svg]:px-3 cursor-pointer h-9 flex items-center w-72 justify-start text-left font-normal border border-ui-border rounded-lg shadow-xs max-w-48 bg-secondary-surface",
          className,
        )}
        data-testid="date-picker"
      >
        <CalendarIcon />
        {dayjs(value).format("MMM D, YYYY")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto! p-0 bg-white dark:bg-popover border border-gray-200 dark:border-white/10 rounded-lg" data-testid="date-picker-popover">
        <MonthCalendar
          key={value}
          value={value}
          disableFuture={disableFuture}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** ◀ [date] ▶ [Today] — Screenshots / Apps / URL day view. Next and Today are disabled on today. */
export function DayNavigator({ value, onChange, showToday = true }: { value: string; onChange: (date: string) => void; showToday?: boolean }) {
  const today = todayStr();
  const isToday = value >= today;
  return (
    <>
      <div className="flex items-center gap-2">
        <button data-slot="button" type="button" className={ICON_NAV_BUTTON} aria-label="Previous day" data-testid="date-prev" onClick={() => onChange(dayjs(value).subtract(1, "day").format("YYYY-MM-DD"))}>
          <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
        </button>
        <SingleDatePicker value={value} onChange={onChange} />
        <button
          data-slot="button"
          type="button"
          className={ICON_NAV_BUTTON}
          aria-label="Next day"
          data-testid="date-next"
          disabled={isToday}
          onClick={() => onChange(dayjs(value).add(1, "day").format("YYYY-MM-DD"))}
        >
          <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
        </button>
      </div>
      {showToday && (
        <button data-slot="button" type="button" className={cn(SURFACE_BUTTON, "h-9")} disabled={isToday} onClick={() => onChange(today)} data-testid="date-today">
          Today
        </button>
      )}
    </>
  );
}

/**
 * ◀ [Oct 23, 2026 - Oct 29, 2026] ▶ — range navigator (Timesheets steps by `step` days).
 * Next is disabled once the range ends today.
 */
export function RangeNavigator({
  start,
  end,
  onChange,
  step = 1,
  triggerClassName = "w-60 max-w-md border border-ui-border shadow-none rounded-lg bg-secondary-surface h-9 flex items-center justify-start text-left font-normal",
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  step?: number;
  triggerClassName?: string;
}) {
  const today = todayStr();
  const shift = (n: number) => {
    let s = dayjs(start).add(n, "day");
    let e = dayjs(end).add(n, "day");
    if (e.isAfter(dayjs(today))) {
      const over = e.diff(dayjs(today), "day");
      s = s.subtract(over, "day");
      e = dayjs(today);
    }
    onChange(s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD"));
  };
  const navClass =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 outline-none cursor-pointer hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50 text-primary-foreground size-9 bg-secondary-surface border border-ui-border dark:border-secondary-surface rounded-lg shadow-none";
  return (
    <div className="flex items-center gap-2">
      <button data-slot="button" type="button" className={navClass} aria-label="Previous period" data-testid="range-prev" onClick={() => shift(-step)}>
        <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
      <DateRangePicker
        value={{ start: dayjs(start).toDate(), end: dayjs(end).toDate() }}
        disableFuture
        triggerClassName={triggerClassName}
        onDateRangeChange={(r) => r.start && r.end && onChange(dayjs(r.start).format("YYYY-MM-DD"), dayjs(r.end).format("YYYY-MM-DD"))}
      />
      <button data-slot="button" type="button" className={navClass} aria-label="Next period" data-testid="range-next" disabled={end >= today} onClick={() => shift(step)}>
        <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
      </button>
    </div>
  );
}
