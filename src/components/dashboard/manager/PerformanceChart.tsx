"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { ShimmerSkeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import type { GraphPoint } from "@/lib/api-types";
import { EmptyState } from "../shared/EmptyState";

/**
 * "Company Performance Chart" — three smoothed area series. Time Worked and Bills are normalised
 * to 0-100% of their max in the range; Activity is already a percentage. Tooltip shows raw values.
 */

interface ChartRow {
  label: string;
  total_worked_time: string;
  timeWorked: number;
  bills: number;
  activity: number;
  rawTimeWorked: number;
  rawBills: number;
}

function ChartTooltip(props: Partial<TooltipContentProps<number, string>>) {
  const { active, payload } = props;
  if (!active || !payload?.length || !payload[0]) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-popover border border-border shadow-lg p-3 text-xs min-w-35" data-testid="chart-tooltip">
      <p className="font-semibold text-foreground mb-0.5">{row.label}</p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">Time Worked</span>
        </div>
        <span className="font-semibold text-foreground">{row.rawTimeWorked.toFixed(1)}h</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          <span className="text-muted-foreground">Bills</span>
        </div>
        <span className="font-semibold text-foreground">{formatMoney(row.rawBills)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-muted-foreground">Activity</span>
        </div>
        <span className="font-semibold text-foreground">{row.activity.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function PerformanceChart({ graphData, isLoading }: { graphData?: GraphPoint[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <article className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-4 flex flex-col h-full">
        <ShimmerSkeleton className="h-4 w-52 mb-3" />
        <div className="flex items-center gap-3 mb-4">
          <ShimmerSkeleton className="h-3 w-20" />
          <ShimmerSkeleton className="h-3 w-14" />
          <ShimmerSkeleton className="h-3 w-18" />
        </div>
        <ShimmerSkeleton className="flex-1 min-h-40 sm:min-h-50 rounded-md" />
      </article>
    );
  }
  const points = Array.isArray(graphData) ? graphData : [];
  const maxTime = Math.max(1, ...points.map((p) => p.time_worked));
  const maxBills = Math.max(1, ...points.map((p) => p.bills));
  const pct = (v: number, max: number) => Math.round((v / max) * 100);
  const rows: ChartRow[] = points.map((p) => ({
    label: p.label,
    total_worked_time: p.total_worked_time,
    timeWorked: pct(p.time_worked, maxTime),
    bills: pct(p.bills, maxBills),
    activity: p.activity,
    rawTimeWorked: p.time_worked,
    rawBills: p.bills,
  }));

  return (
    <article className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-4 flex flex-col h-full" data-testid="performance-chart">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div>
          <h3 className="text-sm font-medium">Company Performance Chart</h3>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <Legend color="#60a5fa" label="Time Worked" />
        <Legend color="#f87171" label="Bills" />
        <Legend color="#34d399" label="Activity" />
      </div>
      {rows.length === 0 ? (
        <EmptyState hint="No performance data in this range" />
      ) : (
        <div className="flex-1 min-h-40 sm:min-h-50">
          <ResponsiveContainer width="100%" height="100%" className="[&_svg]:outline-none">
            <AreaChart data={rows} margin={{ top: 10, right: 5, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="gTimeWorked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gBills" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                width={34}
              />
              <Tooltip content={(p) => <ChartTooltip {...(p as Partial<TooltipContentProps<number, string>>)} />} />
              <Area type="monotone" dataKey="timeWorked" name="Time Worked" stroke="#60a5fa" strokeWidth={2.5} fill="url(#gTimeWorked)" dot={false} activeDot={{ r: 5, fill: "#60a5fa", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="bills" name="Bills" stroke="#f87171" strokeWidth={2.5} fill="url(#gBills)" dot={false} activeDot={{ r: 5, fill: "#f87171", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="activity" name="Activity" stroke="#34d399" strokeWidth={2.5} fill="url(#gActivity)" dot={false} activeDot={{ r: 5, fill: "#34d399", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
