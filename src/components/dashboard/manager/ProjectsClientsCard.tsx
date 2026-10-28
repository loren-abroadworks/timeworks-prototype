"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpoints } from "@/lib/endpoints";
import { formatMoney } from "@/lib/format";
import type { ProjectClientRow } from "@/lib/api-types";
import { DataTableCard } from "../shared/DataTableCard";
import { MemberAvatar } from "../shared/MemberAvatar";
import { SheetPagination, SheetStatusRow, ViewAllSheet } from "../shared/ViewAllSheet";
import { SheetFilters } from "./SheetFilters";
import { useViewAllList } from "./useViewAllList";

function ProjectsClientsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useViewAllList<ProjectClientRow>(endpoints.dashboard.projectsClientsAll, open);
  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title="Projects / Clients"
      description="Projects and clients with their tracked time."
      testId="projects-clients-sheet"
      filters={<SheetFilters member={list.member} setMember={list.setMember} onSearch={list.resetPage} />}
      footer={<SheetPagination {...list.info} onPrev={list.prev} onNext={list.next} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Project</TableHead>
            <TableHead className="w-[12%] text-center">Project Hours</TableHead>
            <TableHead className="w-[10%] text-center">Bill Amount</TableHead>
            <TableHead className="w-[28%]">Client</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <SheetStatusRow colSpan={4}>Loading...</SheetStatusRow>
          ) : list.rows.length === 0 ? (
            <SheetStatusRow colSpan={4}>No projects found</SheetStatusRow>
          ) : (
            list.rows.map((r, i) => (
              <TableRow key={r.project_id} data-testid="sheet-row">
                <TableCell className="w-[50%] max-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <MemberAvatar name={r.project_name} index={i} className="size-7 border-2 shrink-0" fallbackClassName="text-xs font-semibold" />
                    <span className="font-medium text-sm truncate">{r.project_name}</span>
                  </span>
                </TableCell>
                <TableCell className="w-[12%] text-center text-sm text-muted-foreground tabular-nums">{r.total_worked_time}</TableCell>
                <TableCell className="w-[10%] text-center text-sm tabular-nums">{formatMoney(r.total_bill_amount)}</TableCell>
                <TableCell className="w-[28%] max-w-0">
                  <span className="text-sm truncate block">{r.client_name || "—"}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

/** "Projects / Clients" table card (Manager View). */
export function ProjectsClientsCard({ projects, isLoading }: { projects?: ProjectClientRow[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const rows = (Array.isArray(projects) ? projects : []).map((p) => ({
    project: p.project_name,
    hours: p.total_worked_time,
    earned: formatMoney(p.total_bill_amount),
    client: p.client_name || "—",
  }));
  return (
    <>
      <DataTableCard
        title="Projects / Clients"
        testId="projects-clients-card"
        onViewAll={() => setOpen(true)}
        isLoading={isLoading}
        data={rows}
        columns={[
          {
            label: "Project",
            key: "project",
            className: "w-[50%] max-w-0",
            render: ({ row, index }) => (
              <span className="flex items-center gap-2 min-w-0">
                <MemberAvatar name={row.project} index={index} className="size-8 shrink-0 border-2" />
                <span className="truncate font-medium text-sm">{row.project}</span>
              </span>
            ),
          },
          { label: "Project Hours", key: "hours", className: "w-[12%] text-center" },
          { label: "Bill Amount", key: "earned", className: "w-[10%] text-center" },
          { label: "Client", key: "client", className: "w-[28%] text-right" },
        ]}
      />
      <ProjectsClientsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
