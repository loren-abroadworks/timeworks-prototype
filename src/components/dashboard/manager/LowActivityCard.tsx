"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpoints } from "@/lib/endpoints";
import type { LowActivityUser } from "@/lib/api-types";
import { DataTableCard } from "../shared/DataTableCard";
import { MemberAvatar } from "../shared/MemberAvatar";
import { SheetPagination, SheetStatusRow, ViewAllSheet } from "../shared/ViewAllSheet";
import { SheetFilters } from "./SheetFilters";
import { useViewAllList } from "./useViewAllList";

function LowActivitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useViewAllList<LowActivityUser>(endpoints.dashboard.lowActivityAll, open);
  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title="Low Activity"
      description="Members whose tracked activity is below the expected level."
      testId="low-activity-sheet"
      filters={<SheetFilters member={list.member} setMember={list.setMember} onSearch={list.resetPage} />}
      footer={<SheetPagination {...list.info} onPrev={list.prev} onNext={list.next} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Member</TableHead>
            <TableHead className="w-1/4 text-center">Activity Rate</TableHead>
            <TableHead className="w-1/4 text-right">Worked Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <SheetStatusRow colSpan={3}>Loading...</SheetStatusRow>
          ) : list.rows.length === 0 ? (
            <SheetStatusRow colSpan={3}>No members found</SheetStatusRow>
          ) : (
            list.rows.map((r, i) => (
              <TableRow key={r.user_id} data-testid="sheet-row">
                <TableCell className="w-1/2 max-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <MemberAvatar name={r.member_name} src={r.profile_image_url} index={i} className="size-7 border-2 shrink-0" fallbackClassName="text-white text-xs font-semibold" />
                    <span className="font-medium text-sm truncate">{r.member_name}</span>
                  </span>
                </TableCell>
                <TableCell className="w-1/4 text-center">
                  <span className="text-destructive font-medium text-sm">{r.activity_percentage?.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="w-1/4 text-right text-sm tabular-nums">{r.worked_time}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

/** "Low Activity" card (Manager View) — members below the activity threshold, lowest first. */
export function LowActivityCard({ lowActivityUsers, isLoading }: { lowActivityUsers?: LowActivityUser[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const rows = (Array.isArray(lowActivityUsers) ? lowActivityUsers : []).map((u) => ({
    member: u.member_name,
    avatarUrl: u.profile_image_url,
    activityRate: `${u.activity_percentage?.toFixed(1)}%`,
    workedTime: u.worked_time,
  }));
  return (
    <>
      <DataTableCard
        title="Low Activity"
        testId="low-activity-card"
        onViewAll={() => setOpen(true)}
        isLoading={isLoading}
        data={rows}
        columns={[
          {
            label: "Member",
            key: "member",
            className: "w-1/2 max-w-0",
            render: ({ row, index }) => (
              <span className="flex items-center min-w-0">
                <MemberAvatar name={row.member} src={row.avatarUrl} index={index} className="size-8 mr-2 border-2 shrink-0" />
                <span className="truncate">{row.member}</span>
              </span>
            ),
          },
          { label: "Activity Rate", key: "activityRate", className: "w-1/4", render: ({ row }) => <span className="text-destructive font-medium">{row.activityRate}</span> },
          { label: "Worked Time", key: "workedTime", className: "w-1/4" },
        ]}
      />
      <LowActivitySheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
