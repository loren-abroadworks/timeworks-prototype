"use client";

import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Date range picker: trigger shows "Sep 29, 2026 - Oct 29, 2026"; popover has "Quick Select"
 * presets and two month calendars (current + next month), future days disabled.
 * Port of the live app's DateRangePicker.
 */

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const PRESETS: { label: string; days?: number; months?: number; ytd?: boolean }[] = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 14 Days", days: 14 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Last 6 Months", months: 6 },
  { label: "Last 12 Months", months: 12 },
  { label: "Year to Date", ytd: true },
];

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
const inRange = (d: Date, s: Date | null, e: Date | null) => !!s && !!e && d >= s && d <= e;
const inHover = (d: Date, s: Date | null, h: Date | null) => !!s && !!h && d > (s < h ? s : h) && d < (s < h ? h : s);

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="mr-2 h-4 w-4">
      <path d="M5.625 0C5.96875 0 6.25 0.28125 6.25 0.625V2.5H13.75V0.625C13.75 0.28125 14.0312 0 14.375 0C14.7188 0 15 0.28125 15 0.625V2.5H16.25C17.6289 2.5 18.75 3.62109 18.75 5V6.25V7.5V17.5C18.75 18.8789 17.6289 20 16.25 20H3.75C2.37109 20 1.25 18.8789 1.25 17.5V7.5V6.25V5C1.25 3.62109 2.37109 2.5 3.75 2.5H5V0.625C5 0.28125 5.28125 0 5.625 0ZM17.5 7.5H2.5V17.5C2.5 18.1914 3.05859 18.75 3.75 18.75H16.25C16.9414 18.75 17.5 18.1914 17.5 17.5V7.5ZM16.25 3.75H3.75C3.05859 3.75 2.5 4.30859 2.5 5V6.25H17.5V5C17.5 4.30859 16.9414 3.75 16.25 3.75Z" />
    </svg>
  );
}

export function DateRangePicker({
  value,
  onDateRangeChange,
  disableFuture = false,
  triggerClassName,
}: {
  value: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  disableFuture?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState<Date | null>(null);
  const [month, setMonth] = React.useState(new Date().getMonth());
  const [year, setYear] = React.useState(new Date().getFullYear());
  const right = month === 11 ? { month: 0, year: year + 1 } : { month: month + 1, year };
  const { start, end } = value;
  const fmt = (d: Date | null) => (d ? dayjs(d).format("MMM D, YYYY") : "");

  const pick = (d: Date) => {
    if (!start || (start && end)) onDateRangeChange({ start: d, end: null });
    else {
      onDateRangeChange(d < start ? { start: d, end: start } : { start, end: d });
      setOpen(false);
    }
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const now = new Date();
    let s: Date;
    if (p.days) {
      s = new Date(now);
      s.setDate(now.getDate() - p.days + 1);
    } else if (p.months) {
      s = new Date(now);
      s.setMonth(now.getMonth() - p.months);
      s.setDate(now.getDate() + 1);
    } else s = new Date(now.getFullYear(), 0, 1);
    onDateRangeChange({ start: s, end: new Date(now) });
    setOpen(false);
  };

  const shift = (dir: -1 | 1) => {
    if (dir < 0) month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1);
    else month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1);
  };

  const calendar = (m: number, y: number) => {
    const days = new Date(y, m + 1, 0).getDate();
    const lead = new Date(y, m, 1).getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} className="h-8 w-8 p-0 flex items-center justify-center shadow-sm border-gray-200 dark:border-white/10 cursor-pointer">
            <ChevronLeft size={8} />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{MONTHS[m]}</span>
            <span className="text-lg font-semibold">{y}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(1)} className="h-8 w-8 p-0 flex items-center justify-center shadow-sm border-gray-200 dark:border-white/10 cursor-pointer">
            <ChevronRight size={8} />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`e${i}`} className="h-8 w-8" />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const d = new Date(y, m, i + 1);
            const edge = sameDay(d, start) || sameDay(d, end);
            const within = inRange(d, start, end);
            const hovered = inHover(d, start, end ? null : hover);
            const isToday = sameDay(d, new Date());
            const disabled = disableFuture && d > today;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => !disabled && pick(d)}
                onMouseEnter={() => start && !end && setHover(d)}
                className={cn("h-8 w-8 text-sm rounded-md transition-colors relative", {
                  "bg-blue-600 text-white font-medium z-10": edge,
                  "bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100": within && !edge,
                  "bg-blue-50 dark:bg-blue-500/15": !within && !edge && hovered,
                  "bg-gray-100 dark:bg-white/10 font-medium": !edge && !within && !hovered && isToday,
                  "hover:bg-gray-100 dark:hover:bg-white/10": !edge && !within && !hovered && !isToday,
                  "rounded-r-none": sameDay(d, start) && !!end,
                  "rounded-l-none": sameDay(d, end),
                  "rounded-none": within && !edge,
                  "opacity-40 cursor-not-allowed": disabled,
                })}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid="date-range-trigger"
        className={cn(
          "gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:bg-accent hover:text-accent-foreground px-4 py-2 has-[>svg]:px-3 cursor-pointer w-60 max-w-md border border-ui-border shadow-none rounded-lg bg-secondary h-9 flex items-center justify-start text-left font-normal",
          triggerClassName,
        )}
      >
        <CalendarIcon />
        {start && end ? `${fmt(start)} - ${fmt(end)}` : start ? fmt(start) : "Select date range"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        style={{ width: "auto" }}
        className="w-auto! max-w-(--radix-popover-content-available-width) overflow-auto p-0 bg-white dark:bg-popover border border-gray-200 dark:border-white/10 rounded-md"
      >
        <div className="flex bg-white dark:bg-popover px-4 pt-4 border-b border-gray-200 dark:border-white/10 py-4">
          <div className="border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 w-40">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Quick Select</h4>
            <div className="space-y-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex bg-white dark:bg-popover">
            <div className="border-r border-gray-200 dark:border-white/10">{calendar(month, year)}</div>
            <div>{calendar(right.month, right.year)}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
