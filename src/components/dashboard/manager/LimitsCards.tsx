"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpoints } from "@/lib/endpoints";
import type { LimitRow } from "@/lib/api-types";
import { MemberAvatar } from "../shared/MemberAvatar";
import { ProgressListCard } from "../shared/ProgressListCard";
import { SheetPagination, SheetStatusRow, ViewAllSheet } from "../shared/ViewAllSheet";
import { SheetFilters } from "./SheetFilters";
import { useViewAllList } from "./useViewAllList";

/** "Weekly Limits" and "Daily Limits" cards (Manager View) + their View All sheets. */

type Kind = "weekly" | "daily";
const TITLE: Record<Kind, string> = { weekly: "Weekly Limits", daily: "Daily Limits" };

function LimitsSheet({ kind, open, onClose }: { kind: Kind; open: boolean; onClose: () => void }) {
  const registry = kind === "weekly" ? endpoints.dashboard.weeklyLimitsAll : endpoints.dashboard.dailyLimitsAll;
  const list = useViewAllList<LimitRow>(registry, open, false);
  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title={TITLE[kind]}
      description={`Members compared against their configured ${kind} work limits.`}
      testId={`${kind}-limits-sheet`}
      filters={<SheetFilters member={list.member} setMember={list.setMember} onSearch={list.resetPage} />}
      footer={<SheetPagination {...list.info} onPrev={list.prev} onNext={list.next} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Member</TableHead>
            <TableHead className="w-[15%] text-center">{kind === "weekly" ? "Weekly Limit" : "Daily Limit"}</TableHead>
            <TableHead className="w-[15%] text-center">Time Spent</TableHead>
            <TableHead className="w-[30%] text-right">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <SheetStatusRow colSpan={4}>Loading...</SheetStatusRow>
          ) : list.rows.length === 0 ? (
            <SheetStatusRow colSpan={4}>No members found</SheetStatusRow>
          ) : (
            list.rows.map((r, i) => {
              const pct = Math.min(100, r.progress_percentage ?? 0);
              return (
                <TableRow key={r.user_id} data-testid="sheet-row">
                  <TableCell className="w-[40%] max-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={r.full_name} src={r.profile_image_url} index={i} className="size-7 border-2 shrink-0" fallbackClassName="text-white text-xs font-semibold" />
                      <span className="text-sm font-medium truncate">{r.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[15%] text-center text-sm tabular-nums">{r.total_limit}</TableCell>
                  <TableCell className="w-[15%] text-center text-sm tabular-nums">{r.used_time}</TableCell>
                  <TableCell className="w-[30%]">
                    <div className="flex items-center gap-2 min-w-30">
                      <div className="flex-1 bg-ui-background rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-400" : "bg-dashboard-accent"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-9 text-right shrink-0">{Math.round(pct)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

function LimitsCard({ kind, limits, isLoading }: { kind: Kind; limits?: LimitRow[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const items = (Array.isArray(limits) ? limits : []).map((l) => ({
    caption: l.full_name,
    avatarUrl: l.profile_image_url,
    rightValue: l.total_limit ? `${l.used_time} / ${l.total_limit}` : l.used_time,
    percentage: l.limit_seconds && l.limit_seconds > 0 ? Math.min(100, Math.round((l.used_seconds / l.limit_seconds) * 100)) : 0,
  }));
  return (
    <>
      <ProgressListCard
        title={TITLE[kind]}
        testId={`${kind}-limits-card`}
        data={items}
        isLoading={isLoading}
        onViewAll={() => setOpen(true)}
        renderItemContent={(item, i) => (
          <span className="inline-flex items-center gap-2 min-w-0">
            <MemberAvatar name={item.caption} src={item.avatarUrl} index={i} />
            <span className="text-sm font-medium truncate">{item.caption}</span>
          </span>
        )}
      />
      <LimitsSheet kind={kind} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export const WeeklyLimitsCard = ({ weeklyLimits, isLoading }: { weeklyLimits?: LimitRow[]; isLoading?: boolean }) => (
  <LimitsCard kind="weekly" limits={weeklyLimits} isLoading={isLoading} />
);

export const DailyLimitsCard = ({ dailyLimits, isLoading }: { dailyLimits?: LimitRow[]; isLoading?: boolean }) => (
  <LimitsCard kind="daily" limits={dailyLimits} isLoading={isLoading} />
);
