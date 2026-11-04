"use client";

/**
 * Absence & Leave › Audit Trail (/absence_leave/audit_trail) — opened from Balances › "View Audit Trail".
 * Not captured live; rebuilt from the QA screenshots (TIMEW-1930): tab bar with no tab active, search + Filters,
 * ‹ date range › + Today, table Member / Policy / Total Accrued / Total Used / Balance Remaining (progress bar) / Last Adjusted.
 * Rows expand to per-policy history cards (negative adjustments red, positive green, values in hours). No in-page Back.
 */
import * as React from "react";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useQueryParams } from "@/lib/use-query-params";
import type { AuditRow, AuditTrailResponse } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { DebouncedSearch } from "@/components/ui/search-input";
import { FiltersPopover } from "@/components/filters/FiltersPopover";
import { RangeNavigator } from "@/components/filters/DateControls";
import { SURFACE_BUTTON } from "@/components/filters/styles";
import { Pagination } from "@/components/activity/urls/Pagination";
import { AbsenceTabs, AvatarLetter, fmtH, MultiPickChip, useAllMembers, useOrgId } from "./shared";

const TH = "px-4 py-3 text-left text-sm font-semibold text-primary-text whitespace-nowrap";
const TD = "px-4 py-3 text-sm whitespace-nowrap";

function Expanded({ row }: { row: AuditRow }) {
  return (
    <div className="space-y-4 border-t border-ui-border bg-background/40 px-10 py-4" data-testid="audit-expanded">
      {row.policies.map((p) => (
        <div key={p.policy_id} className="space-y-2">
          <p className="text-sm font-semibold text-primary-text">
            {p.policy_name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Accrued {fmtH(p.accrued_hours)} · Used {fmtH(p.used_hours)} · Remaining {fmtH(p.remaining_hours)}
            </span>
          </p>
          {p.adjustments.map((a) => (
            <div key={a.id} className="grid grid-cols-[6rem_4rem_4rem_1fr_10rem_8rem] items-start gap-4 rounded-lg border border-ui-border px-4 py-3" data-testid="audit-adjustment">
              <div>
                <p className="text-xs text-muted-foreground">Adjustment</p>
                <p className={cn("mt-1 text-sm font-semibold", a.adjustment_hours < 0 ? "text-[rgb(217,65,80)]" : "text-[rgb(95,181,78)]")} data-testid="audit-delta">
                  {a.adjustment_hours > 0 ? "+" : ""}
                  {fmtH(a.adjustment_hours)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="mt-1 text-sm text-primary-text">{fmtH(a.from_hours)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To</p>
                <p className="mt-1 text-sm text-primary-text">{fmtH(a.to_hours)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="mt-1 truncate text-sm text-primary-text" title={a.reason}>
                  {a.reason}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adjusted by</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-text">
                  <AvatarLetter name={a.adjusted_by.full_name} src={a.adjusted_by.profile_image_url} className="size-5" textClassName="text-[10px]" />
                  <span className="truncate">{a.adjusted_by.full_name}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adjusted on</p>
                <p className="mt-1 text-sm text-primary-text">{dayjs(a.adjusted_on).format("MMM D, YYYY")}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AuditTrailPage() {
  const org = useOrgId();
  const { get, update } = useQueryParams();
  const today = dayjs().format("YYYY-MM-DD");
  const start = get("start_date") || dayjs().subtract(6, "day").format("YYYY-MM-DD");
  const end = get("end_date") || today;
  const page = Math.max(1, Number(get("page") ?? 1) || 1);
  const perPage = Number(get("perPage") ?? 10) || 10;
  const search = get("search") ?? "";
  const users = get("user_id") ?? "";
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [shown, setShown] = React.useState<Record<string, boolean>>({ userFilter: !!users });
  const { data: members } = useAllMembers();
  const qs = new URLSearchParams({ start_date: start, end_date: end, limit: String(perPage), offset: String((page - 1) * perPage) });
  if (search) qs.set("search", search);
  const { data, isLoading } = useApiQuery<AuditTrailResponse>({ endpoint: `/time-off-audit-trail/${org}?${qs}`, queryKey: ["TIME_OFF_AUDIT_TRAIL", String(org), start, end, page, perPage, search] });
  const rows = (data?.items ?? []).filter((r) => !users || users.split(",").includes(r.user_id));

  return (
    <div className="font-karla pt-2 pb-6 flex flex-col" data-testid="audit-trail-page">
      <AbsenceTabs />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <DebouncedSearch className="w-48 bg-secondary-surface" updateQueryParam placeholder="Search members" />
          <FiltersPopover
            options={[{ key: "userFilter", label: "User" }]}
            values={shown}
            onToggle={(k) => {
              if (shown[k]) update({ user_id: null });
              setShown((s) => ({ ...s, [k]: !s[k] }));
            }}
            onClear={() => (update({ user_id: null }), setShown({ userFilter: false }))}
          />
          {shown.userFilter && (
            <MultiPickChip
              label="Users"
              title="Filter by user"
              searchPlaceholder="Search members"
              options={(members ?? []).map((m) => ({ value: m.user_id, label: m.full_name, sub: m.email }))}
              value={users.split(",").filter(Boolean)}
              onApply={(v) => update({ user_id: v.join(",") || null })}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <RangeNavigator start={start} end={end} step={7} onChange={(s, e) => update({ start_date: s, end_date: e, page: null })} />
          <button type="button" className={SURFACE_BUTTON} data-testid="audit-today" disabled={end === today && start === dayjs().subtract(6, "day").format("YYYY-MM-DD")} onClick={() => update({ start_date: null, end_date: null, page: null })}>
            Today
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-layout-subtle bg-secondary-surface/50">
        <table className="w-full" data-testid="audit-table">
          <thead>
            <tr>
              <th className={TH}>Member</th>
              <th className={TH}>Policy</th>
              <th className={TH}>Total Accrued</th>
              <th className={TH}>Total Used</th>
              <th className={TH}>Balance Remaining</th>
              <th className={cn(TH, "text-right")}>Last Adjusted</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-ui-border">
                    {Array.from({ length: 6 }).map((__, k) => (
                      <td key={k} className={TD}>
                        <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => {
                  const isOpen = open.has(r.user_id);
                  const pct = r.total_accrued_hours > 0 ? Math.max(0, Math.min(100, (r.balance_remaining_hours / r.total_accrued_hours) * 100)) : 0;
                  return (
                    <React.Fragment key={r.user_id}>
                      <tr
                        className={cn("cursor-pointer border-t border-ui-border hover:bg-muted/30", isOpen && "bg-primary-selected")}
                        data-testid="audit-row"
                        onClick={() =>
                          setOpen((s) => {
                            const n = new Set(s);
                            if (n.has(r.user_id)) n.delete(r.user_id);
                            else n.add(r.user_id);
                            return n;
                          })
                        }
                      >
                        <td className={TD}>
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                            <AvatarLetter name={r.full_name} src={r.profile_image_url} className="size-6" textClassName="text-[11px]" />
                            <span className="font-medium text-primary-text">{r.full_name}</span>
                          </div>
                        </td>
                        <td className={cn(TD, "max-w-48 truncate text-primary-text")} title={r.policy_label}>
                          {r.policy_label}
                        </td>
                        <td className={cn(TD, "text-primary-text")}>{fmtH(r.total_accrued_hours)}</td>
                        <td className={cn(TD, "text-primary-text")}>{fmtH(r.total_used_hours)}</td>
                        <td className={TD}>
                          <div className="w-44">
                            <p className={cn("text-sm", r.balance_remaining_hours < 0 ? "text-red-text" : "text-primary-text")}>{fmtH(r.balance_remaining_hours)}</p>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className={cn(TD, "text-right text-primary-text")}>{dayjs(r.last_adjusted).format("MMM D, YYYY")}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <Expanded row={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
          </tbody>
        </table>
        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center border-t border-ui-border" data-testid="audit-empty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/no-data-placeholder.svg" alt="No data" width={140} height={140} className="mb-3" />
            <p className="text-sm font-medium text-secondary-text">No balance adjustments in this period</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different date range or filters</p>
          </div>
        )}
        <div className="border-t border-ui-border px-3 py-3">
          <Pagination total={data?.total ?? 0} defaultPageSize={10} pageSizeOptions={[10, 20, 50, 100]} />
        </div>
      </div>
    </div>
  );
}
