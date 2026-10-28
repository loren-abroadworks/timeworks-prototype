"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DebouncedSearch } from "@/components/ui/search-input";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSession } from "@/lib/session";
import { useDateRange, useQueryParams } from "@/lib/use-query-params";
import type { Paged, ProjectReportItem } from "@/lib/api-types";
import { ProgressListCard } from "../shared/ProgressListCard";
import { ProjectSelect } from "../shared/FilterSelect";
import { PAGE_SIZE, SheetPagination, SheetStatusRow, ViewAllSheet, pageInfo } from "../shared/ViewAllSheet";

/** "Projects & Task Tracking" View All sheet (search + project filter + pagination). */
function ProjectsTasksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organizationId } = useSession();
  const { get } = useQueryParams();
  const { startDate, endDate } = useDateRange();
  const [page, setPage] = React.useState(1);
  const [project, setProject] = React.useState<{ id: string; name: string } | null>(null);
  const params = {
    organizationId: String(organizationId),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    search: get("search") ?? undefined,
    projectId: project?.id,
    startDate,
    endDate,
  };
  const { data, isLoading } = useApiQuery<Paged<ProjectReportItem>>({
    endpoint: endpoints.dashboard.projectsTasksAll.endpoint(params),
    queryKey: endpoints.dashboard.projectsTasksAll.queryKey(params),
    enabled: open && !!organizationId,
  });
  const rows = data?.data ?? [];
  const info = pageInfo(page, data?.total_count ?? 0);

  return (
    <ViewAllSheet
      open={open}
      onClose={onClose}
      title="Projects & Task Tracking"
      description="Projects and tasks with their tracked time."
      testId="projects-tasks-sheet"
      filters={
        <>
          <DebouncedSearch updateQueryParam onChange={() => setPage(1)} />
          <ProjectSelect
            selected={project ?? undefined}
            setSelected={(p) => {
              setProject(p ? { id: p.id, name: p.name } : null);
              setPage(1);
            }}
            triggerClassName="w-full sm:w-48"
          />
        </>
      }
      footer={<SheetPagination {...info} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(info.totalPages, p + 1))} />}
    >
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Project</TableHead>
            <TableHead className="w-[28%]">Task</TableHead>
            <TableHead className="w-[30%]">Activity</TableHead>
            <TableHead className="w-[12%]">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SheetStatusRow colSpan={4}>Loading...</SheetStatusRow>
          ) : rows.length === 0 ? (
            <SheetStatusRow colSpan={4}>No tasks found</SheetStatusRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={`${r.project_name}-${r.task_name}-${i}`} data-testid="sheet-row">
                <TableCell className="text-sm font-medium truncate" title={r.project_name}>
                  {r.project_name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate" title={r.task_name ?? undefined}>
                  {r.task_name ?? "—"}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground w-10 shrink-0">{r.avg_activity_percentage?.toFixed(2)}%</span>
                    <div className="flex-1 bg-ui-background rounded-full h-1.5 min-w-20">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, r.avg_activity_percentage)}%` }} />
                    </div>
                  </span>
                </TableCell>
                <TableCell className="text-sm tabular-nums">{r.total_work}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ViewAllSheet>
  );
}

/** "Projects & Task Tracking" card on My Dashboard: "<activity>% | <project> | <task>" rows. */
export function ProjectsTasksCard({ projectsReport, isLoading }: { projectsReport?: ProjectReportItem[]; isLoading?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const items = (Array.isArray(projectsReport) ? projectsReport : []).map((r) => ({
    percentage: r.avg_activity_percentage,
    caption: `${r.project_name}|${r.total_work}|${r.task_name ?? ""}`,
    rightValue: r.total_work,
  }));
  return (
    <>
      <ProgressListCard
        title="Projects & Task Tracking"
        data={items}
        isLoading={isLoading}
        testId="projects-tasks-card"
        onViewAll={() => setOpen(true)}
        renderItemContent={(item) => {
          const [project, , task] = item.caption.split("|");
          return (
            <>
              <span className="text-sm font-semibold text-foreground shrink-0">{item.percentage}%</span>
              <span>|</span>
              <span className="text-sm font-medium text-foreground truncate min-w-0 max-w-44">{project}</span>
              <span>|</span>
              <span className="text-sm text-foreground font-medium  truncate min-w-0">{task || "-"}</span>
            </>
          );
        }}
      />
      <ProjectsTasksSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
