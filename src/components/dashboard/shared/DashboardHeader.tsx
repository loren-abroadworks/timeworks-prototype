"use client";

import * as React from "react";
import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/session";
import { useDateRange, useQueryParams } from "@/lib/use-query-params";
import { DateRangePicker, type DateRange } from "./DateRangePicker";

/**
 * Row above the dashboard: "My Dashboard | Manager View" tab switcher on the left and
 * the date range navigator (◀ picker ▶) on the right. The arrows move the range by 7 days;
 * ▶ is disabled once the range ends today.
 */

const NAV_BUTTON = "text-primary-foreground size-9 bg-secondary-surface border border-ui-border dark:border-secondary-surface rounded-lg shadow-none";

function DateRangeNav({ value, onChange, step = 7 }: { value: DateRange; onChange: (r: DateRange) => void; step?: number }) {
  const end = value.end ?? new Date();
  const start = value.start ?? new Date();
  const forwardDisabled = dayjs(end).isSame(dayjs(), "day") || dayjs(end).isAfter(dayjs());
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        className={NAV_BUTTON}
        aria-label="Previous range"
        data-testid="date-prev"
        onClick={() => onChange({ start: dayjs(start).subtract(step, "day").toDate(), end: dayjs(end).subtract(step, "day").toDate() })}
      >
        <ChevronLeft className="size-5 text-gray-500 dark:text-gray-300" />
      </Button>
      <DateRangePicker value={value} onDateRangeChange={onChange} triggerClassName="rounded-lg bg-secondary-surface" disableFuture />
      <Button
        size="icon"
        variant="outline"
        disabled={forwardDisabled}
        className={NAV_BUTTON}
        aria-label="Next range"
        data-testid="date-next"
        onClick={() => onChange({ start: dayjs(start).add(step, "day").toDate(), end: dayjs(end).add(step, "day").toDate() })}
      >
        <ChevronRight className="size-5 text-gray-500 dark:text-gray-300" />
      </Button>
    </div>
  );
}

export function DashboardHeader({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, canAccessTeamDashboard } = useSession();
  const { push } = useQueryParams();
  const { startDate, endDate } = useDateRange();
  const tab = pathname.includes("/my_dashboard") ? "My Dashboard" : "Manager View";
  const [pendingStart, setPendingStart] = React.useState<Date | null>(null);

  return (
    <div className="font-karla pt-2 pb-6">
      <div className="mb-6 flex justify-between items-center gap-4 flex-wrap">
        {canAccessTeamDashboard ? (
          <Tabs
            value={tab}
            onValueChange={(v) => {
              // Same as the live app: switching tabs replaces the URL (date params are reset).
              router.replace(`/dashboard/${userId}/${v.toLowerCase().replace(" ", "_")}`);
            }}
          >
            <TabsList>
              {["My Dashboard", "Manager View"].map((t) => (
                <TabsTrigger key={t} value={t} className="text-sm">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span />
        )}
        <div className="flex gap-2 items-center">
          <DateRangeNav
            value={{ start: pendingStart ?? dayjs(startDate).toDate(), end: pendingStart ? null : dayjs(endDate).toDate() }}
            onChange={(r) => {
              if (r.start && !r.end) setPendingStart(r.start);
              else if (r.start && r.end) {
                setPendingStart(null);
                push({ start_date: dayjs(r.start).format("YYYY-MM-DD"), end_date: dayjs(r.end).format("YYYY-MM-DD") });
              }
            }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
