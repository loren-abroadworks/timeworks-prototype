"use client";

import * as React from "react";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, Select } from "radix-ui";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink, Eye, FileSpreadsheet, ImageOff, Inbox, RotateCcw, ShieldAlert, Trash2, TriangleAlert, X } from "lucide-react";
import { apiSend, useApiQuery } from "@/lib/api-client";
import { downloadFile } from "@/lib/download";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import { cn } from "@/lib/utils";
import type { DeletedScreenshotRecord, DeletedScreenshotsResponse } from "@/lib/types/screenshots";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FiltersPopover, type FilterOption } from "@/components/filters/FiltersPopover";
import { MemberSelect } from "@/components/filters/MemberSelect";
import { TimezoneSelect } from "@/components/filters/TimezoneSelect";
import { OptionChip, useProjects } from "@/components/filters/OptionChip";
import { RangeNavigator } from "@/components/filters/DateControls";
import { ActionMenu, DotsIcon } from "@/components/filters/ActionMenu";
import { ACTION_MENU_CONTENT, ACTION_MENU_ITEM, SURFACE_BUTTON } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";

/**
 * Activity › Audit – Deleted Screenshots (live chunk 03t-7rw5nnbcn.js).
 * URL params: page, perPage, user_id, project_id, start_date, end_date, delete_type, timezone.
 * Replica extension: row checkboxes + ⋮ (Restore / Delete permanently) and a bulk bar — the live page has no row
 * actions, but its API registry exposes restore / permanentDelete / bulkRestore / bulkPermanentDelete.
 */

const OPTIONS: FilterOption[] = [
  { key: "dateRange", label: "Date Range", description: "Default Filter", locked: true },
  { key: "memberFilter", label: "Member" },
  { key: "projectFilter", label: "Project" },
  { key: "deleteTypeFilter", label: "Delete Type" },
  { key: "timezoneFilter", label: "Timezone", description: "Default Filter", locked: true },
];
const DELETE_TYPES = [
  { value: "soft_deleted", label: "Soft Deleted" },
  { value: "permanently_deleted", label: "Permanently Deleted" },
];
const GRAY_BADGE =
  "inline-flex items-center justify-center rounded-md whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none overflow-hidden bg-gray-50 text-gray-700 border-transparent dark:bg-gray-950 dark:text-gray-400";
const TH = "text-[11px] font-semibold text-secondary-text uppercase tracking-wider";

function weekRange() {
  const end = dayjs();
  return { start: end.subtract(6, "day").format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
}

function LetterAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span data-slot="avatar" data-size="default" className={cn("group/avatar relative flex overflow-hidden select-none rounded-full", className)}>
      <span data-slot="avatar-fallback" className="rounded-full text-sm font-bold text-primary-foreground aspect-square bg-primary border-2 border-gray-400 flex items-center justify-center size-full shrink-0">
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

function Toolbar({ onExport }: { onExport: () => void }) {
  const { get, update } = useQueryParams();
  const { user_time_zone } = useSession();
  const def = weekRange();
  const start = get("start_date") ?? def.start;
  const end = get("end_date") ?? def.end;
  const [t, setT] = React.useState<Record<string, boolean>>(() => ({
    dateRange: true,
    memberFilter: !!get("user_id"),
    projectFilter: !!get("project_id"),
    deleteTypeFilter: !!get("delete_type"),
    timezoneFilter: true,
  }));
  const { data: projects = [] } = useProjects();
  const toggle = (key: string) => {
    const on = t[key];
    if (on && key === "memberFilter") update({ user_id: null, page: "1" });
    if (on && key === "projectFilter") update({ project_id: null, page: "1" });
    if (on && key === "deleteTypeFilter") update({ delete_type: null, page: "1" });
    setT((p) => ({ ...p, [key]: !on }));
  };
  const userIdParam = get("user_id");
  const deleteType = get("delete_type") ?? "";
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <FiltersPopover
          options={OPTIONS}
          values={t}
          onToggle={toggle}
          onClear={() => {
            update({ user_id: null, project_id: null, delete_type: null, page: "1" });
            setT({ dateRange: true, memberFilter: false, projectFilter: false, deleteTypeFilter: false, timezoneFilter: true });
          }}
          width="15rem"
        />
        {t.memberFilter && <MemberSelect value={userIdParam} onChange={(m) => update({ user_id: m.user_id, page: "1" })} onClear={() => update({ user_id: null, page: "1" })} />}
        {t.projectFilter && (
          <OptionChip
            label="Project"
            title="Filter by Project"
            searchPlaceholder="Search project"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={get("project_id") ? [get("project_id")!] : []}
            onChange={(v) => update({ project_id: v[0] ?? null, page: "1" })}
            testId="project-chip"
          />
        )}
        {t.deleteTypeFilter && (
          <OptionChip
            label="Delete Type"
            title="Filter by Delete Type"
            searchPlaceholder="Search delete type"
            options={DELETE_TYPES}
            value={deleteType ? [deleteType] : []}
            onChange={(v) => update({ delete_type: v[v.length - 1] ?? null, page: "1" })}
            multiple
            testId="delete-type-chip"
          />
        )}
        {t.timezoneFilter && <TimezoneSelect value={get("timezone") ?? user_time_zone ?? "UTC"} onChange={(tz) => update({ timezone: tz })} onClear={() => update({ timezone: null })} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RangeNavigator start={start} end={end} onChange={(s, e) => update({ start_date: s, end_date: e, page: "1" })} />
        <ActionMenu label="Export" testId="deleted-export" items={[{ label: "Export Excel", tone: "blue", icon: <FileSpreadsheet className="text-blue-500" size={16} />, onSelect: onExport, testId: "export-excel" }]} />
      </div>
    </div>
  );
}

function RowMenu({ record, onRestore, onPurge }: { record: DeletedScreenshotRecord; onRestore: () => void; onPurge: () => void }) {
  const soft = record.deletion_type === "soft_deleted";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Row actions" data-testid="row-menu" className="flex size-8 items-center justify-center rounded-lg border border-ui-border bg-secondary-surface hover:bg-muted cursor-pointer">
          <DotsIcon />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className={ACTION_MENU_CONTENT}>
          <DropdownMenu.Label className="text-sm font-medium px-3 py-2 border-b border-border">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Actions</span>
          </DropdownMenu.Label>
          <DropdownMenu.Item disabled={!soft} className={cn(ACTION_MENU_ITEM, "hover:bg-blue-50 dark:hover:bg-blue-500/15")} onSelect={onRestore} data-testid="row-restore">
            <div className="flex items-center gap-3">
              <RotateCcw className="text-blue-500" size={16} />
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Restore</span>
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled={!soft} className={cn(ACTION_MENU_ITEM, "hover:bg-red-100 dark:hover:bg-red-500/20")} onSelect={onPurge} data-testid="row-purge">
            <div className="flex items-center gap-3">
              <Trash2 className="text-red-600" size={16} />
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Delete permanently</span>
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Row({ r, checked, onCheck, onView, onRestore, onPurge }: { r: DeletedScreenshotRecord; checked: boolean; onCheck: () => void; onView: (src: string) => void; onRestore: () => void; onPurge: () => void }) {
  const started = dayjs(r.started_at);
  const stopped = dayjs(r.stopped_at);
  const deleted = dayjs(r.deleted_at);
  const expires = dayjs(r.expiration_date);
  const left = expires.diff(dayjs(), "day");
  const permanent = r.deletion_type !== "soft_deleted";
  return (
    <tr className="group even:bg-secondary-surface/40 hover:bg-muted/50 transition-colors duration-100" data-testid="deleted-row">
      <td className="pl-4 py-3 w-8">
        <Checkbox variant="brand" checked={checked} disabled={permanent} onCheckedChange={onCheck} aria-label="Select row" />
      </td>
      <td className="px-4 py-3">
        <div
          className={cn("relative w-28 h-17 rounded-lg overflow-hidden bg-muted shrink-0", r.screenshot_url ? "cursor-pointer ring-1 ring-border group-hover:ring-2 group-hover:ring-primary/30 transition-all duration-150" : "ring-1 ring-border")}
          onClick={() => r.screenshot_url && onView(r.screenshot_url)}
          data-testid="deleted-thumb"
        >
          {r.screenshot_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${r.member_name} screenshot`} loading="lazy" className="object-cover transition-opacity duration-200 opacity-100" src={r.screenshot_url} style={{ position: "absolute", height: "100%", width: "100%", inset: 0 }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150 flex items-center justify-center">
                <Eye className="text-white size-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150 drop-shadow-sm" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-secondary-text/60">
              <ImageOff className="size-4" />
              <span className="text-[10px]">No image</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <LetterAvatar name={r.member_name} className="size-8 shrink-0" />
          <span className="text-sm font-medium text-primary-text truncate max-w-36">{r.member_name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0 max-w-44">
          {r.project_name ? (
            <span className="text-sm font-medium text-primary-text truncate block cursor-default" title={r.project_name}>
              {r.project_name}
            </span>
          ) : (
            <span className="text-sm text-secondary-text">—</span>
          )}
          {r.task_name && (
            <span className="text-xs text-secondary-text truncate block cursor-default" title={r.task_name}>
              {r.task_name}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-primary-text">{started.format("MMM D, YYYY")}</span>
          <div className="flex items-center gap-1 text-xs text-secondary-text">
            <Clock className="size-3 shrink-0" />
            <span>
              {started.format("h:mm A")} – {stopped.format("h:mm A")}
            </span>
          </div>
          <span className="text-xs text-secondary-text">{Math.round(r.duration_seconds / 60)} min</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-48 shrink-0">
          <LetterAvatar name={r.deleted_by_name} className="size-6 shrink-0 text-[10px]" />
          <span className="text-sm text-primary-text truncate max-w-32">{r.deleted_by_name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          data-slot="badge"
          className={cn(
            "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 overflow-hidden w-fit text-[10px] px-1.5 py-0 shadow-sm border-2",
            permanent ? "bg-red-50 text-red-700 border-transparent dark:bg-red-950 dark:text-red-400" : "bg-gray-50 text-gray-700 border-transparent dark:bg-gray-950 dark:text-gray-400",
          )}
        >
          {permanent ? (
            <>
              <Trash2 className="size-2.5" />
              Permanent
            </>
          ) : (
            <>
              <RotateCcw className="size-2.5" />
              Soft delete
            </>
          )}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-primary-text">{deleted.format("MMM D, YYYY")}</span>
          <span className="text-xs text-secondary-text">{deleted.format("h:mm A")}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {r.is_expiring_soon ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-amber-600">{expires.format("MMM D, YYYY")}</span>
            <div className="flex items-center gap-1">
              <TriangleAlert className="size-3 text-amber-500 shrink-0" />
              <span className="text-[11px] text-amber-500 font-medium">{left <= 0 ? "Today" : `${left}d left`}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-primary-text">{expires.format("MMM D, YYYY")}</span>
            <span className="text-xs text-secondary-text">{left}d left</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 max-w-48">
        {r.delete_reason ? (
          <span className="text-sm text-secondary-text line-clamp-2 cursor-default leading-snug" title={r.delete_reason}>
            {r.delete_reason}
          </span>
        ) : (
          <span className="text-sm text-secondary-text/50">—</span>
        )}
      </td>
      <td className="pr-4 py-3">
        <RowMenu record={r} onRestore={onRestore} onPurge={onPurge} />
      </td>
    </tr>
  );
}

function Pagination({ total, page, perPage, onPage, onPerPage }: { total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total, page * perPage);
  const nums: (number | "…")[] = [];
  if (pages <= 5) for (let i = 1; i <= pages; i++) nums.push(i);
  else if (page <= 3) nums.push(1, 2, 3, "…", pages);
  else if (page >= pages - 2) nums.push(1, "…", pages - 2, pages - 1, pages);
  else nums.push(1, "…", page, "…", pages);
  const NAVB = "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex w-full flex-col gap-4 p-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8" data-testid="pagination">
      <p className="flex items-center gap-1 whitespace-nowrap text-sm">
        <span className="text-muted-foreground">
          Showing {from}-{to} of
        </span>
        <span className="font-semibold text-foreground">{total} results</span>
      </p>
      <div className="flex items-center gap-1 sm:gap-2">
        <button type="button" aria-label="Go to previous page" className={NAVB} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="flex size-7 sm:size-8 items-center justify-center text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPage(n)}
                className={cn("flex size-7 min-w-7 sm:size-8 sm:min-w-8 items-center justify-center rounded px-2 text-sm transition-colors", n === page ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-gray-100 dark:hover:bg-gray-700")}
              >
                {n}
              </button>
            ),
          )}
        </div>
        <button type="button" aria-label="Go to next page" className={NAVB} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <p className="whitespace-nowrap text-sm text-muted-foreground">Show per page</p>
        <Select.Root value={String(perPage)} onValueChange={(v) => onPerPage(Number(v))}>
          <Select.Trigger data-slot="select-trigger" className="dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none h-8 w-24 border border-ui-border bg-secondary-surface" data-testid="per-page">
            <Select.Value />
            <ChevronDown className="size-4 opacity-50" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content position="popper" sideOffset={4} className="z-110 min-w-24 rounded-md border border-ui-border bg-popover p-1 shadow-md">
              <Select.Viewport>
                {[10, 20, 50, 100].map((n) => (
                  <Select.Item key={n} value={String(n)} className="cursor-pointer rounded px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent">
                    <Select.ItemText>{n}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  );
}

function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="fixed inset-0 z-100 max-w-none sm:max-w-none w-screen h-screen max-h-none translate-x-0 translate-y-0 top-0 left-0 rounded-none p-0 bg-black! dark:bg-black! border-none" data-testid="deleted-viewer">
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <DialogDescription className="sr-only">Deleted screenshot</DialogDescription>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
          <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 h-8 px-2">
            <ExternalLink className="size-4" />
            Open
          </a>
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex items-center justify-center size-8 rounded-md text-white/70 hover:text-white hover:bg-white/10">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex h-full w-full items-center justify-center p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Deleted screenshot" className="max-h-full max-w-full object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeletedScreenshotsPage() {
  const { get, update } = useQueryParams();
  const { organizationId, user_time_zone } = useSession();
  const qc = useQueryClient();
  const page = Math.max(1, Number(get("page") ?? "1") || 1);
  const perPage = Number(get("perPage") ?? "10") || 10;
  const memberId = get("user_id") ?? "";
  const projectId = get("project_id") ?? "";
  const startDate = get("start_date") ?? "";
  const endDate = get("end_date") ?? "";
  const deleteType = get("delete_type") ?? "";
  const timezone = get("timezone") ?? user_time_zone ?? "UTC";
  const params = React.useMemo(() => {
    const p = new URLSearchParams({ page: String(page), page_size: String(perPage) });
    if (memberId) p.append("member_id", memberId);
    if (projectId) p.append("project_id", projectId);
    if (startDate) p.append("start_date", startDate);
    if (endDate) p.append("end_date", endDate);
    if (deleteType && deleteType !== "all") p.append("deletion_type", deleteType);
    if (timezone) p.append("timezone", timezone);
    return p.toString();
  }, [page, perPage, memberId, projectId, startDate, endDate, deleteType, timezone]);
  const { data, isLoading } = useApiQuery<DeletedScreenshotsResponse>({
    endpoint: `/audit/deleted-screenshots/${organizationId}?${params}`,
    queryKey: ["deleted-screenshots", String(organizationId ?? ""), params],
    enabled: !!organizationId,
  });
  const rows = data?.records ?? [];
  const [viewer, setViewer] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState<Set<number>>(new Set());
  const [confirm, setConfirm] = React.useState<null | { ids: number[]; kind: "restore" | "purge" }>(null);
  React.useEffect(() => setChecked(new Set()), [params]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["deleted-screenshots"] });
    qc.invalidateQueries({ queryKey: ["screenshots"] });
  };
  const run = async (kind: "restore" | "purge", ids: number[]) => {
    try {
      if (kind === "restore") {
        if (ids.length === 1) await apiSend("POST", `/deleted-activity-screenshots/${organizationId}/${ids[0]}/restore`, {});
        else await apiSend("POST", `/deleted-activity-screenshots/${organizationId}/bulk-restore`, { ids });
        toast.success(ids.length === 1 ? "Screenshot restored" : `${ids.length} screenshots restored`);
      } else {
        if (ids.length === 1) await apiSend("DELETE", `/deleted-activity-screenshots/${organizationId}/${ids[0]}`);
        else await apiSend("POST", `/deleted-activity-screenshots/${organizationId}/bulk-permanent-delete`, { ids });
        toast.success(ids.length === 1 ? "Screenshot permanently deleted" : `${ids.length} screenshots permanently deleted`);
      }
      setChecked(new Set());
      refresh();
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    }
  };

  const exportExcel = async () => {
    const p = new URLSearchParams();
    const def = weekRange();
    p.set("start_date", startDate || def.start);
    p.set("end_date", endDate || def.end);
    if (memberId) p.set("user_id", memberId);
    if (projectId) p.set("project_id", projectId);
    if (deleteType) p.set("delete_type", deleteType);
    p.set("timezone", timezone);
    p.set("export", "excel");
    try {
      const res = await fetch(`/api/v1/audit/deleted-screenshots/${organizationId}?${p}`);
      if (!res.ok) throw new Error();
      downloadFile(`deleted-screenshots_${p.get("start_date")}_to_${p.get("end_date")}.csv`, await res.text());
      toast.success("Exported successfully");
    } catch {
      toast.error("Failed to export. Please try again.");
    }
  };

  const selectable = rows.filter((r) => r.deletion_type === "soft_deleted");
  const allChecked = selectable.length > 0 && selectable.every((r) => checked.has(r.id));

  return (
    <>
      <div className="flex items-center gap-1.5 mb-5">
        <ShieldAlert className="size-3.5 text-secondary-text shrink-0" />
        <span data-slot="badge" className={cn(GRAY_BADGE, "border px-2 py-0.5 w-fit text-xs font-normal gap-1")}>
          Soft-deleted records are retained for 90 days
        </span>
      </div>
      <div className="space-y-4" data-testid="deleted-page">
        <Toolbar onExport={exportExcel} />
        {checked.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border border-border" data-testid="deleted-bulk-bar">
            <span className="text-sm text-muted-foreground flex-1">
              {checked.size} screenshot{checked.size !== 1 ? "s" : ""} selected
            </span>
            <button type="button" className={cn(SURFACE_BUTTON, "h-8 px-3 gap-1.5")} onClick={() => setChecked(new Set())}>
              <X className="size-3.5" />
              Cancel
            </button>
            <button type="button" className={cn(SURFACE_BUTTON, "h-8 px-3 gap-1.5")} onClick={() => run("restore", [...checked])} data-testid="bulk-restore">
              <RotateCcw className="size-3.5" />
              Restore
            </button>
            <button type="button" className={cn(SURFACE_BUTTON, "h-8 px-3 gap-1.5 border-transparent bg-destructive text-white hover:bg-destructive/90")} onClick={() => setConfirm({ ids: [...checked], kind: "purge" })} data-testid="bulk-purge">
              <Trash2 className="size-3.5" />
              Delete permanently
            </button>
          </div>
        )}
        <div className="rounded-2xl border border-layout-subtle backdrop-blur-2xl shadow-xs overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-160px)]">
            <table className="w-full min-w-250">
              <thead className="sticky top-0 z-10 bg-secondary-surface! backdrop-blur-md">
                <tr className="border-b border-layout-subtle whitespace-nowrap backdrop-blur-md">
                  <th className="pl-4 h-12 text-left w-8">
                    <Checkbox variant="brand" checked={allChecked} disabled={!selectable.length} onCheckedChange={() => setChecked(allChecked ? new Set() : new Set(selectable.map((r) => r.id)))} aria-label="Select all" />
                  </th>
                  {["Screenshot", "Member", "Project / Task", "Time Range", "Deleted By", "Deleted Type", "Time Deleted", "Expires", "Reason"].map((h) => (
                    <th key={h} className="px-4 h-12 text-left">
                      <span className={TH}>{h}</span>
                    </th>
                  ))}
                  <th className="pr-4 h-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-layout-subtle bg-secondary-surface/25">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-layout-subtle last:border-0">
                      <td colSpan={11} className="px-4 py-3">
                        <div className="skeleton-shimmer h-17 rounded bg-primary/10 dark:bg-primary/15" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" data-testid="deleted-empty">
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                          <Inbox className="size-6 text-secondary-text" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-primary-text">No deleted screenshots</p>
                          <p className="text-sm text-secondary-text">Screenshots that have been deleted will appear here.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <Row
                      key={r.id}
                      r={r}
                      checked={checked.has(r.id)}
                      onCheck={() =>
                        setChecked((p) => {
                          const n = new Set(p);
                          if (n.has(r.id)) n.delete(r.id);
                          else n.add(r.id);
                          return n;
                        })
                      }
                      onView={setViewer}
                      onRestore={() => run("restore", [r.id])}
                      onPurge={() => setConfirm({ ids: [r.id], kind: "purge" })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-layout-subtle bg-secondary-surface px-4">
            <Pagination total={data?.total_count ?? 0} page={page} perPage={perPage} onPage={(p) => update({ page: String(p) })} onPerPage={(n) => update({ perPage: String(n), page: "1" })} />
          </div>
        </div>
      </div>
      {viewer && <ImageViewer src={viewer} onClose={() => setViewer(null)} />}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md" data-testid="purge-dialog">
          <DialogTitle>Delete permanently?</DialogTitle>
          <DialogDescription>
            {confirm?.ids.length === 1 ? "This screenshot" : `${confirm?.ids.length} screenshots`} will be removed for good and the tracked time can no longer be restored.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" className={SURFACE_BUTTON} onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={cn(SURFACE_BUTTON, "border-transparent bg-destructive text-white hover:bg-destructive/90")}
              onClick={() => {
                const c = confirm;
                setConfirm(null);
                if (c) run(c.kind, c.ids);
              }}
              data-testid="purge-confirm"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
