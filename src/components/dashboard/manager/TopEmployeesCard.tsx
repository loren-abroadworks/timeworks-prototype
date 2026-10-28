"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpoints } from "@/lib/endpoints";
import { formatMoney } from "@/lib/format";
import type { TopEmployee } from "@/lib/api-types";
import { DataTableCard } from "../shared/DataTableCard";
import { MemberAvatar } from "../shared/MemberAvatar";
import { SheetPagination, SheetStatusRow, ViewAllSheet } from "../shared/ViewAllSheet";
import { SheetFilters } from "./SheetFilters";
import { useViewAllList } from "./useViewAllList";

function TopEmployeesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useViewAllList<TopEmployee>(endpoints.dashboard.topEmployeesAll, open);
  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title="Top Employees"
      description="Members with the highest tracked time for the selected period."
      testId="top-employees-sheet"
      filters={<SheetFilters member={list.member} setMember={list.setMember} onSearch={list.resetPage} />}
      footer={<SheetPagination {...list.info} onPrev={list.prev} onNext={list.next} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Employee</TableHead>
            <TableHead className="w-[15%] text-center">Monthly Activity</TableHead>
            <TableHead className="w-[15%] text-center">Monthly Worked</TableHead>
            <TableHead className="w-[25%] text-right">Pay Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <SheetStatusRow colSpan={4}>Loading...</SheetStatusRow>
          ) : list.rows.length === 0 ? (
            <SheetStatusRow colSpan={4}>No employees found</SheetStatusRow>
          ) : (
            list.rows.map((r, i) => (
              <TableRow key={r.user_id} data-testid="sheet-row">
                <TableCell className="w-[45%] max-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <MemberAvatar name={r.member_name} src={r.profile_image_url} index={i} className="size-7 border-2 shrink-0" fallbackClassName="text-xs font-semibold" />
                    <span className="font-medium text-sm truncate">{r.member_name}</span>
                  </span>
                </TableCell>
                <TableCell className="w-[15%] text-center text-sm font-medium">{r.activity_percentage?.toFixed(1)}%</TableCell>
                <TableCell className="w-[15%] text-center text-sm tabular-nums">{r.total_worked_time}</TableCell>
                <TableCell className="w-[25%] text-right text-sm tabular-nums">{r.total_pay_amount == null ? "-" : formatMoney(r.total_pay_amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

/** "Top Employees" table card (Manager View). */
export function TopEmployeesCard({ topEmployeeData, isLoading }: { topEmployeeData?: TopEmployee[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const rows = (Array.isArray(topEmployeeData) ? topEmployeeData : []).map((e) => ({
    employee: e.member_name,
    avatarUrl: e.profile_image_url,
    activity: e.activity_percentage,
    worked: e.total_worked_time,
    earned: e.total_pay_amount == null ? "-" : formatMoney(e.total_pay_amount),
  }));
  return (
    <>
      <DataTableCard
        title="Top Employees"
        testId="top-employees-card"
        onViewAll={() => setOpen(true)}
        isLoading={isLoading}
        data={rows}
        columns={[
          {
            label: "Employees",
            key: "employee",
            render: ({ row, index }) => (
              <span className="inline-flex items-center">
                <MemberAvatar name={row.employee} src={row.avatarUrl} index={index} />
                {row.employee}
              </span>
            ),
          },
          { label: "Activity", key: "activity", render: ({ row }) => <span className="text-sm tabular-nums">{row.activity.toFixed(1)}%</span> },
          { label: "Worked Time", key: "worked" },
          { label: "Pay Amount", key: "earned" },
        ]}
      />
      <TopEmployeesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
