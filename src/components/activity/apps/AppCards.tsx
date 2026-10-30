"use client";

import * as React from "react";
import dayjs from "dayjs";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { AppUsageApplication, AppUsageProjectBlock, AppUsageResponse } from "@/lib/types/activity";
import { initial } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Palettes from the live chunks (donut / project activities). */
const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"];
const PROJECT_COLORS = ["#6366F1", "#D02281", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"];

/** "Google Chrome" -> "Google  Chrome" — same (odd) camel-case split as the live app. */
export const appLabel = (name: string) => name.replace(".exe", "").replace(/([A-Z])/g, " $1").trim();

/** "4:12:14" -> seconds */
export function parseInterval(text: string) {
  const parts = text.split(":").map(Number);
  return parts.reduce((s, p) => s * 60 + (p || 0), 0);
}

/** seconds -> "7h 19m" / "22m" */
export function hm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded bg-primary/10 dark:bg-primary/15 ${className ?? ""}`} />;
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden border border-layout-subtle shadow-xs rounded-2xl backdrop-blur-sm h-full" data-testid="card-skeleton">
      <div className="shrink-0 px-4 py-3 border-b border-layout-subtle bg-secondary-surface">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-4 w-28" />
      </div>
      <div className="flex-1 p-6 bg-secondary-surface/50 flex items-center gap-8">
        <Skeleton className="size-60 rounded-full" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardHeader({ title, sub, badge }: { title: string; sub: string; badge: React.ReactNode }) {
  return (
    <div className="shrink-0 px-4 py-3 border-b border-layout-subtle bg-secondary-surface">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary-text">{title}</h3>
          <p className="mt-1 text-sm text-secondary-text">{sub}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 text-sm border rounded-lg text-primary-foreground bg-primary">{badge}</div>
      </div>
    </div>
  );
}

function EmptyCardBody({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center flex-1 py-8">
      <div className="text-center">
        <div className="mb-2 text-4xl">📊</div>
        <p className="text-sm text-secondary-text">{text}</p>
      </div>
    </div>
  );
}

/* ---------------- Top Application Usage (donut) ---------------- */

export function TopAppsCard({ data }: { data: AppUsageResponse["top_5_applications"] }) {
  const rows = React.useMemo(() => data.map((a) => ({ name: appLabel(a.application_name), value: parseInterval(a.total_usage_interval) })), [data]);
  const [active, setActive] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const activeIndex = active ? rows.findIndex((r) => r.name === active) : -1;
  const activeColor = activeIndex >= 0 ? PIE_COLORS[activeIndex % PIE_COLORS.length] : undefined;
  const shown = active ? rows.filter((r) => r.name === active) : rows;
  const centerValue = active ? (rows[activeIndex]?.value ?? 0) : total;

  return (
    <div className="flex flex-col overflow-hidden border border-layout-subtle shadow-xs rounded-2xl backdrop-blur-sm" data-testid="top-apps-card">
      <CardHeader
        title="Top Application Usage"
        sub={`Total time: ${hm(total)}`}
        badge={
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Data
          </>
        }
      />
      <div className="flex items-center flex-1 p-4 bg-secondary-surface/50">
        {rows.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between flex-1 w-full [&_svg]:outline-none">
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: activeColor }} data-testid="donut-center">
                      {hm(centerValue)}
                    </div>
                    <div className="text-xs font-medium text-foreground capitalize">{active || "Total Time"}</div>
                  </div>
                </div>
                <PieChart width={320} height={320}>
                  <Pie
                    data={shown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={130}
                    paddingAngle={2}
                    labelLine={false}
                    isAnimationActive={false}
                    stroke="#fff"
                    label={(p: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) => {
                      const percent = Number(p.percent ?? 0);
                      if (percent < 0.05) return null;
                      const RAD = Math.PI / 180;
                      const r = Number(p.innerRadius) + (Number(p.outerRadius) - Number(p.innerRadius)) * 0.6;
                      const x = Number(p.cx) + r * Math.cos(-Number(p.midAngle) * RAD);
                      const y = Number(p.cy) + r * Math.sin(-Number(p.midAngle) * RAD);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} className="drop-shadow-sm">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {shown.map((r, i) => {
                      const isHover = hovered === r.name;
                      return (
                        <Cell
                          key={`cell-${r.name}`}
                          fill={activeColor || PIE_COLORS[i % PIE_COLORS.length]}
                          className="stroke-ui-border transition-all duration-200 cursor-pointer"
                          style={{ transform: isHover ? "scale(1.05)" : "scale(1)", transformOrigin: "center", filter: isHover ? "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" : "none" }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active: on, payload }) => {
                      const item = payload?.[0]?.payload as { name: string; value: number } | undefined;
                      if (!on || !item) return null;
                      const i = rows.findIndex((r) => r.name === item.name);
                      return (
                        <div className="rounded-xl shadow-lg border border-layout-subtle bg-popover px-4 py-3 min-w-45 backdrop-blur-md" style={{ fontSize: 14, zIndex: 9999 }} data-testid="pie-tooltip">
                          <div className="flex items-center gap-2 mb-1 font-semibold text-primary-text capitalize">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {item.name}
                          </div>
                          <div className="font-medium text-primary-text">
                            {hm(item.value)}
                            <span className="ml-2 text-xs text-secondary-text">({total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%)</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </div>
            </div>
            <div className="min-w-0 p-2 w-full max-w-96 2xl:p-12">
              <div className="mb-3 font-semibold text-primary-text">App usage</div>
              <ul className="space-y-2">
                {rows.map((r, i) => {
                  const on = active === r.name;
                  const color = PIE_COLORS[i % PIE_COLORS.length];
                  const dim = !on && !!active;
                  return (
                    <div className="max-w-md" key={r.name}>
                      <li
                        role="button"
                        tabIndex={0}
                        aria-pressed={on}
                        data-testid="app-legend-item"
                        onClick={() => setActive((v) => (v === r.name ? null : r.name))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActive((v) => (v === r.name ? null : r.name));
                          }
                        }}
                        onMouseEnter={() => setHovered(r.name)}
                        onMouseLeave={() => setHovered(null)}
                        className={`flex items-center gap-3 justify-between flex-wrap  cursor-pointer select-none group transition-all duration-200${on ? " bg-muted rounded-md px-2 py-1" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-block transition rounded-full ring-2 ring-ui-border" style={{ width: 12, height: 12, backgroundColor: color, opacity: dim ? 0.35 : 1 }} />
                          <p className="font-medium capitalize truncate" style={{ color, fontWeight: on ? 600 : 500, opacity: dim ? 0.55 : 1 }}>
                            {r.name}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-secondary-text" style={{ opacity: dim ? 0.4 : 1 }}>
                          {hm(r.value)}
                        </span>
                      </li>
                    </div>
                  );
                })}
                {active && (
                  <button type="button" onClick={() => setActive(null)} className="mt-3 text-xs font-medium text-blue-600 hover:underline">
                    Reset
                  </button>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyCardBody text="No application data available" />
        )}
      </div>
    </div>
  );
}

/* ---------------- Project Activities (top 5) ---------------- */

const blocks = (rec: AppUsageResponse["records"][number]) => Object.entries(rec).filter(([k]) => k !== "hour_bucket") as [string, AppUsageProjectBlock][];
const sumApps = (apps: AppUsageApplication[]) => apps.reduce((s, a) => s + a.usage_seconds, 0);
const RANK = ["bg-yellow-100 text-yellow-800", "bg-gray-100 text-gray-700", "bg-orange-100 text-orange-800"];

export function ProjectActivitiesCard({ data }: { data?: AppUsageResponse }) {
  const totals = new Map<string, number>();
  data?.records.forEach((r) => blocks(r).forEach(([p, b]) => totals.set(p, (totals.get(p) ?? 0) + sumApps(b.applications))));
  const list = [...totals.entries()].map(([project, s]) => ({ project, s })).sort((a, b) => b.s - a.s).slice(0, 5);
  const total = list.reduce((s, r) => s + r.s, 0);
  return (
    <div className="flex flex-col h-full overflow-hidden border border-layout-subtle shadow-xs rounded-2xl backdrop-blur-sm" data-testid="project-activities-card">
      <CardHeader title="Project Activities" sub={`Total time: ${hm(total)}`} badge="Top 5" />
      <div className="flex flex-col flex-1 bg-secondary-surface/25">
        <div className="flex-1 p-2">
          {list.length > 0 ? (
            list.map((r, i) => (
              <div key={r.project} className="relative rounded-sm group transition-all duration-200  p-3 border border-transparent hover:border-layout-subtle hover:shadow-xs" data-testid="project-activity-row">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${RANK[i] ?? "bg-blue-50 text-blue-600"}`}>{i + 1}</div>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex items-center justify-center w-8 h-8 text-sm font-medium text-white rounded-lg shadow-sm ring-1 ring-white/20"
                        style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                      >
                        {r.project.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary-text">{r.project}</div>
                        <div className="text-xs text-secondary-text">Project Activity</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-primary-text">{hm(r.s)}</div>
                    <div className="text-xs text-secondary-text">{total ? ((r.s / total) * 100).toFixed(1) : "0.0"}%</div>
                  </div>
                </div>
                {i < 3 && (
                  <div className="absolute top-2 right-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyCardBody text="No project data available" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- App Activity Timeline ---------------- */

function AppTable({ apps, hourTotal }: { apps: AppUsageApplication[]; hourTotal: number }) {
  return (
    <div className="overflow-hidden border border-layout-subtle rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-layout-subtle hover:bg-transparent">
            <TableHead className="px-4 py-3 font-semibold text-left text-secondary-text">App</TableHead>
            <TableHead className="px-4 py-3 font-semibold text-right text-secondary-text">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...apps]
            .sort((a, b) => b.usage_seconds - a.usage_seconds)
            .map((a, i) => {
              const pct = hourTotal ? Math.round((a.usage_seconds / hourTotal) * 100) : 0;
              const h = Math.floor(a.usage_seconds / 3600);
              const m = Math.floor((a.usage_seconds % 3600) / 60);
              const s = a.usage_seconds % 60;
              const time = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
              return (
                <TableRow key={a.application_name + i} className="transition-colors border-b border-ui-border hover:bg-muted/50">
                  <TableCell className="px-4 py-3">
                    <div className="font-bold text-primary-text capitalize ">{appLabel(a.application_name)}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <span className="font-medium text-primary-text min-w-12 text-right">{time}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 overflow-hidden bg-gray-200 rounded-full">
                          <div className="h-full transition-all duration-500 rounded-full bg-primary" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="overflow-hidden border border-layout-subtle shadow-xs rounded-xl">
      <div className="px-6 py-4 border-b border-layout-subtle bg-secondary-surface">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-layout-subtle bg-secondary-surface">
            <div className="flex items-center gap-4 mb-3">
              <Skeleton className="w-20 h-6" />
              <Skeleton className="w-32 h-4" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="flex-1 w-24 h-4" />
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-20 h-4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppTimeline({ data, date }: { data?: AppUsageResponse; date: string }) {
  const records = data?.records ?? [];
  return (
    <div className="overflow-hidden border border-layout-subtle shadow-xs rounded-xl" data-testid="app-timeline">
      <div className="px-6 py-4 border-b border-layout-subtle bg-secondary-surface">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-primary-text">App Activity Timeline</h3>
            <p className="mt-1 text-sm text-secondary-text">Hourly breakdown of application usage</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary backdrop-blur-sm px-3 py-1.5 rounded-lg font-bold border">{dayjs(date).format("MMMM D, YYYY")}</div>
        </div>
      </div>
      <div className="bg-secondary-surface/25">
        {records.length > 0 ? (
          <div className="p-6 space-y-6">
            {records.map((rec) => {
              const list = blocks(rec);
              const hourTotal = list.reduce((s, [, b]) => s + sumApps(b.applications), 0);
              return (
                <div key={rec.hour_bucket} className="transition-all duration-300 rounded-xl " data-testid="timeline-hour">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-lg shadow-sm">{dayjs(rec.hour_bucket).format("h:mm A")}</div>
                      <div className="text-sm text-secondary-text">
                        <span className="font-semibold text-primary-text">{Math.round(hourTotal / 60)} min</span> total activity
                      </div>
                    </div>
                    <div className="px-2 py-1 text-xs text-secondary-text bg-secondary border rounded-md">
                      {list.length} project{list.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {list.map(([project, b]) => (
                      <div key={project} className="p-4 rounded-lg  border border-ui-border bg-secondary-surface/25">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span data-slot="avatar" data-size="default" className="group/avatar relative flex shrink-0 overflow-hidden select-none size-8 rounded-none">
                              <span
                                data-slot="avatar-fallback"
                                className="text-sm group-data-[size=sm]/avatar:text-xs font-bold text-primary-foreground aspect-square bg-primary border-2 flex items-center justify-center size-full shrink-0 rounded-md border-ui-border"
                              >
                                {initial(project)}
                              </span>
                            </span>
                            <h4 className="font-semibold text-primary-text">{project}</h4>
                          </div>
                          <span className="px-2 py-1 text-sm font-medium text-secondary-text bg- rounded">{Math.round(sumApps(b.applications) / 60)} min</span>
                        </div>
                        <AppTable apps={b.applications} hourTotal={hourTotal} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="mb-4 text-6xl">⏰</div>
            <h3 className="mb-3 text-xl font-bold text-primary-text">No Activity Recorded</h3>
            <p className="max-w-md mx-auto leading-relaxed text-secondary-text">
              No application usage data found for the selected date and filters. Start working on your projects to see activity here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
