"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpoints } from "@/lib/endpoints";
import type { MemberActivity } from "@/lib/api-types";
import { DataTableCard } from "../shared/DataTableCard";
import { MemberAvatar } from "../shared/MemberAvatar";
import { SheetPagination, SheetStatusRow, ViewAllSheet } from "../shared/ViewAllSheet";
import { SheetFilters } from "./SheetFilters";
import { useViewAllList } from "./useViewAllList";

function MembersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useViewAllList<MemberActivity>(endpoints.dashboard.membersActivityAll, open);
  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title="Members"
      description="Members in the organization with their tracked time."
      testId="members-sheet"
      filters={<SheetFilters member={list.member} setMember={list.setMember} onSearch={list.resetPage} />}
      footer={<SheetPagination {...list.info} onPrev={list.prev} onNext={list.next} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Member Info</TableHead>
            <TableHead className="w-[15%] text-center">Today</TableHead>
            <TableHead className="w-[15%] text-center">This Week</TableHead>
            <TableHead className="w-[25%] text-right">Last Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <SheetStatusRow colSpan={4}>Loading...</SheetStatusRow>
          ) : list.rows.length === 0 ? (
            <SheetStatusRow colSpan={4}>No members found</SheetStatusRow>
          ) : (
            list.rows.map((r, i) => (
              <TableRow key={r.user_id} data-testid="sheet-row">
                <TableCell className="w-[45%] max-w-0">
                  <span className="inline-flex items-center gap-3">
                    <MemberAvatar name={r.full_name} src={r.profile_image_url} index={i} className="size-7 border-2 shrink-0" fallbackClassName="text-white text-xs font-semibold" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate leading-tight">{r.full_name}</span>
                      <span className="block text-xs text-muted-foreground truncate leading-tight">{r.organization_name}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="w-[15%] text-center">
                  <span className="text-xs font-medium tabular-nums text-foreground">{r.today_tracked}</span>
                </TableCell>
                <TableCell className="w-[15%] text-center">
                  <span className="text-xs font-medium tabular-nums text-foreground">{r.this_week_tracked}</span>
                </TableCell>
                <TableCell className="w-[25%] text-right">
                  <span className="text-xs text-muted-foreground">{r.last_active ?? "—"}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

/** "Members" card (Manager View): today's and this week's tracked time + last active. */
export function MembersCard({ membersActivity, isLoading }: { membersActivity?: MemberActivity[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const rows = (Array.isArray(membersActivity) ? membersActivity : []).map((m) => ({
    name: m.full_name,
    avatarUrl: m.profile_image_url,
    organization: m.organization_name,
    todayTime: m.today_tracked,
    weekTime: m.this_week_tracked,
    lastSeen: m.last_active ?? "—",
  }));
  return (
    <>
      <DataTableCard
        title="Members"
        testId="members-card"
        onViewAll={() => setOpen(true)}
        isLoading={isLoading}
        data={rows}
        columns={[
          {
            label: "Member Info",
            key: "name",
            render: ({ row, index }) => (
              <span className="inline-flex items-center gap-3">
                <MemberAvatar name={row.name} src={row.avatarUrl} index={index} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold truncate leading-tight">{row.name}</span>
                  <span className="block text-xs text-muted-foreground truncate leading-tight">{row.organization}</span>
                </span>
              </span>
            ),
          },
          { label: "Today", key: "todayTime", render: ({ row }) => <span className="text-xs font-medium tabular-nums text-foreground">{row.todayTime}</span> },
          {
            label: "This Week",
            key: "weekTime",
            render: ({ row }) => (
              <span className="flex flex-col gap-0">
                <span className="text-xs font-medium tabular-nums text-foreground">{row.weekTime}</span>
                <span className="text-xs text-muted-foreground leading-tight">{row.lastSeen}</span>
              </span>
            ),
          },
        ]}
      />
      <MembersSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
