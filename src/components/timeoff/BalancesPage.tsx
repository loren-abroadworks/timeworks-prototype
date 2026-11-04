"use client";

/**
 * Absence & Leave › Balances — not captured live (the UI chunk never loaded); rebuilt from the QA screenshots
 * (TIMEW-1918) and the API registry: search, Filters (Time Off Policy, Team), ⋮ (Export / Import), "View Audit Trail",
 * table (checkbox, Member + mail icon, Client +N, Projects +N, Teams +N, Policy Balances: 4 chips then "+N", "$" = billable),
 * numbered pager. Clicking a chip opens "Adjust Balance".
 */
import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowRight, DollarSign, Download, Info, Mail, Upload, XIcon } from "lucide-react";
import { API_BASE, apiSend, useApiQuery } from "@/lib/api-client";
import { useQueryParams } from "@/lib/use-query-params";
import type { BalanceRow, BalancesResponse, PolicyBalance } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DebouncedSearch } from "@/components/ui/search-input";
import { ActionMenu } from "@/components/filters/ActionMenu";
import { FiltersPopover } from "@/components/filters/FiltersPopover";
import { toast } from "@/components/filters/toast";
import { downloadFile } from "@/lib/download";
import { Pagination } from "@/components/activity/urls/Pagination";
import { AbsenceTabs, AvatarLetter, fmtH, MultiPickChip, useAllPolicies, useOrgId, useTeams } from "./shared";

const CLIENT_COLORS = ["bg-orange-500", "bg-emerald-500", "bg-sky-500", "bg-rose-500", "bg-violet-500", "bg-amber-500"];

function More({ n, children }: { n: number; children?: React.ReactNode }) {
  if (n <= 0) return null;
  const badge = <span className="ml-1.5 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">+{n}</span>;
  if (!children) return badge;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer" data-testid="more-chips">
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto! max-w-96 rounded-xl p-2">
        <div className="flex flex-col gap-1.5">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function PolicyChip({ p, onClick }: { p: PolicyBalance; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="policy-chip"
      title={`${p.policy_name} · ${fmtH(p.balance_hours)}${p.pending_hours ? ` (${fmtH(p.pending_hours)} pending)` : ""}`}
      className="flex h-7 w-[8.5rem] shrink-0 cursor-pointer items-center gap-1 rounded-md border border-ui-border bg-secondary-surface px-2 text-xs hover:border-primary/50"
    >
      {p.is_billable && <DollarSign className="size-3 shrink-0 text-green-500" aria-label="Billable" />}
      <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{p.policy_name}</span>
      <span className={cn("shrink-0 font-semibold", p.balance_hours < 0 ? "text-red-text" : "text-primary-text")}>{fmtH(p.balance_hours)}</span>
    </button>
  );
}

const TH = "px-4 py-3 text-left text-sm font-semibold text-primary-text whitespace-nowrap";
const TD = "px-4 py-3 text-sm whitespace-nowrap border-t border-ui-border";

function Row({ r, checked, onCheck, onAdjust }: { r: BalanceRow; checked: boolean; onCheck: (v: boolean) => void; onAdjust: (p: PolicyBalance) => void }) {
  const c = r.clients[0];
  return (
    <tr className="hover:bg-muted/30" data-testid="balance-row">
      <td className={cn(TD, "w-10")}>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(v === true)} aria-label={`Select ${r.full_name}`} />
      </td>
      <td className={TD}>
        <div className="flex w-48 items-center gap-2">
          <AvatarLetter name={r.full_name} src={r.profile_image_url} className="size-6" textClassName="text-[11px]" />
          <span className="min-w-0 flex-1 truncate font-medium text-primary-text">{r.full_name}</span>
          <a href={`mailto:${r.email}`} title={r.email} aria-label={`Email ${r.full_name}`} className="text-muted-foreground hover:text-primary">
            <Mail className="size-4" />
          </a>
        </div>
      </td>
      <td className={TD}>
        {c ? (
          <div className="flex w-40 items-center">
            <span className={cn("mr-2 flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white", CLIENT_COLORS[c.id % CLIENT_COLORS.length])}>{c.name[0]}</span>
            <span className="min-w-0 truncate text-primary-text" title={r.clients.map((x) => x.name).join(", ")}>
              {c.name}
            </span>
            <More n={r.clients.length - 1} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className={TD}>
        {r.projects.length ? (
          <div className="flex w-36 items-center" title={r.projects.map((x) => x.name).join(", ")}>
            <span className="min-w-0 truncate text-primary-text">{r.projects[0].name}</span>
            <More n={r.projects.length - 1} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className={TD}>
        {r.teams.length ? (
          <div className="flex w-36 items-center" title={r.teams.map((x) => x.name).join(", ")}>
            <span className="min-w-0 truncate text-primary-text">{r.teams[0].name}</span>
            <More n={r.teams.length - 1} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className={cn(TD, "w-full")}>
        {/* Live: overflow-x hidden — 4 chips then a "+N" button (no horizontal scroll). */}
        <div className="flex items-center gap-1.5 overflow-x-hidden" data-testid="policy-cell">
          {r.policies.slice(0, 4).map((p) => (
            <PolicyChip key={p.policy_id} p={p} onClick={() => onAdjust(p)} />
          ))}
          <More n={r.policies.length - 4}>
            {r.policies.slice(4).map((p) => (
              <PolicyChip key={p.policy_id} p={p} onClick={() => onAdjust(p)} />
            ))}
          </More>
          {r.policies.length === 0 && <span className="text-muted-foreground">—</span>}
        </div>
      </td>
    </tr>
  );
}

/** "Adjust Balance" — set a new balance for one member × policy; the change is logged (audit trail). */
export function AdjustBalanceDialog({ row, policy, onClose }: { row: BalanceRow; policy: PolicyBalance; onClose: () => void }) {
  const org = useOrgId();
  const qc = useQueryClient();
  const [value, setValue] = React.useState(String(policy.balance_hours));
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const next = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(next);
  const unchanged = valid && Math.round(next * 100) === Math.round(policy.balance_hours * 100);
  const negBlocked = valid && next < 0 && !policy.allow_negative_balances;
  const save = async () => {
    setPending(true);
    try {
      await apiSend("PUT", `/time-off-balances/${org}/${policy.policy_id}/members/${row.user_id}`, { new_balance_hours: next, reason });
      toast.success("Balance adjusted successfully");
      qc.invalidateQueries({ predicate: (q) => ["TIME_OFF_BALANCES", "TIME_OFF_AUDIT_TRAIL", "TIME_OFF_REQUEST_BALANCE_SUMMARY"].some((k) => (q.queryKey as unknown[]).includes(k)) });
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Failed to adjust balance");
    } finally {
      setPending(false);
    }
  };
  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content data-testid="adjust-dialog" className="fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-layout-subtle bg-background p-4 shadow-lg sm:max-w-md font-karla">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">Adjust Balance</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-xs text-muted-foreground">Manually adjust this member&apos;s balance — change is logged.</DialogPrimitive.Description>
          </div>
          <div className="flex items-start gap-3">
            <AvatarLetter name={row.full_name} src={row.profile_image_url} className="size-8" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{row.full_name}</p>
              <p className="text-xs text-muted-foreground">{policy.policy_name}</p>
              <p className="text-xs text-muted-foreground" data-testid="adjust-remaining">
                {Number(policy.balance_hours.toFixed(2))} Hours Remaining
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-ui-border">
            <div className="grid grid-cols-2 border-b border-ui-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground">
              <span>Set New Balance</span>
              <span>Before &amp; After</span>
            </div>
            <div className="grid grid-cols-2 items-center px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  value={value}
                  data-testid="adjust-input"
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 w-32 rounded-md border border-ui-border bg-transparent px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:bg-input/30"
                />
                <span className="text-xs text-muted-foreground">Hours</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="adjust-before-after">
                {fmtH(policy.balance_hours).replace("h", " hrs")}
                <ArrowRight className="size-3" />
                <span className={cn("font-semibold", valid && next < 0 ? "text-red-text" : "text-foreground")}>{valid ? fmtH(next).replace("h", " hrs") : "—"}</span>
              </div>
            </div>
          </div>
          {unchanged && <p className="-mt-2 text-xs text-muted-foreground">This matches the current balance — change the value to save an adjustment.</p>}
          {negBlocked && (
            <p className="-mt-2 flex items-center gap-1 text-xs text-red-500">
              <Info className="size-3.5" /> This policy does not allow a negative balance.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="adjust-reason" className="text-xs font-semibold text-foreground">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="adjust-reason"
              rows={3}
              value={reason}
              data-testid="adjust-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
              className="w-full resize-y rounded-md border border-ui-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:bg-input/30"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-3 text-sm font-medium text-primary-text hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              data-testid="adjust-save"
              disabled={pending || !valid || unchanged || negBlocked || !reason.trim()}
              onClick={save}
              className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-theme)] px-3 text-sm font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save Adjustment"}
            </button>
          </div>
          <DialogPrimitive.Close className="absolute top-4 right-4 cursor-pointer opacity-70 hover:opacity-100 [&_svg]:size-4" aria-label="Close">
            <XIcon />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const org = useOrgId();
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-layout-subtle bg-background p-5 shadow-lg sm:max-w-md font-karla" data-testid="import-dialog">
          <DialogPrimitive.Title className="text-base font-semibold">Import Balances</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">Upload a CSV with one row per member and policy. Download the template to get the columns.</DialogPrimitive.Description>
          <a href={`${API_BASE}/time-off-balances/import/template?organization_id=${org}`} className="text-sm font-medium text-primary hover:underline">
            Download template
          </a>
          <input
            ref={ref}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("files", f);
              await fetch(`${API_BASE}/time-off-balances/${org}/import`, { method: "POST", body: fd });
              toast.success("Import received — the replica does not apply imported balances");
              onClose();
            }}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm hover:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={() => ref.current?.click()} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[image:var(--gradient-theme)] px-4 text-sm font-medium text-white hover:opacity-90">
              <Upload className="size-4" /> Upload CSV
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function BalancesPage() {
  const org = useOrgId();
  const { get, update } = useQueryParams();
  const { data: policies } = useAllPolicies();
  const teams = useTeams();
  const page = Math.max(1, Number(get("page") ?? 1) || 1);
  const perPage = Number(get("perPage") ?? 10) || 10;
  const search = get("search") ?? "";
  const pol = get("time_off_policy_id") ?? "";
  const team = get("team_id") ?? "";
  const [shown, setShown] = React.useState<Record<string, boolean>>({ policyFilter: !!pol, teamFilter: !!team });
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [adjusting, setAdjusting] = React.useState<{ row: BalanceRow; policy: PolicyBalance } | null>(null);
  const [importing, setImporting] = React.useState(false);
  const qs = new URLSearchParams({ limit: String(perPage), offset: String((page - 1) * perPage) });
  if (search) qs.set("search", search);
  if (pol) qs.set("time_off_policy_id", pol);
  if (team) qs.set("team_id", team);
  const { data, isLoading } = useApiQuery<BalancesResponse>({ endpoint: `/time-off-balances/${org}?${qs}`, queryKey: ["TIME_OFF_BALANCES", String(org), page, perPage, search, pol, team] });
  const rows = data?.items ?? [];
  const allOn = rows.length > 0 && rows.every((r) => checked.has(r.user_id));

  return (
    <div className="font-karla pt-2 pb-6 flex flex-col" data-testid="balances-page">
      <AbsenceTabs />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <DebouncedSearch className="w-48 bg-secondary-surface" updateQueryParam placeholder="Search members" />
          <FiltersPopover
            options={[
              { key: "policyFilter", label: "Time Off Policy" },
              { key: "teamFilter", label: "Team" },
            ]}
            values={shown}
            onToggle={(k) => {
              if (shown[k]) update({ [k === "policyFilter" ? "time_off_policy_id" : "team_id"]: null, page: null });
              setShown((s) => ({ ...s, [k]: !s[k] }));
            }}
            onClear={() => {
              update({ time_off_policy_id: null, team_id: null, page: null });
              setShown({ policyFilter: false, teamFilter: false });
            }}
          />
          {shown.policyFilter && (
            <MultiPickChip
              label="Time Off Policy"
              title="Filter by Timeoff Policy"
              searchPlaceholder="Search time off policy"
              options={(policies?.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
              value={pol.split(",").filter(Boolean)}
              onApply={(v) => update({ time_off_policy_id: v.join(",") || null, page: null })}
            />
          )}
          {shown.teamFilter && (
            <MultiPickChip
              label="Team"
              title="Filter by team"
              searchPlaceholder="Search teams"
              options={teams.map((t) => ({ value: String(t.id), label: t.name }))}
              value={team.split(",").filter(Boolean)}
              onApply={(v) => update({ team_id: v.join(",") || null, page: null })}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionMenu
            label="Actions"
            testId="balances-menu"
            items={[
              {
                label: "Export",
                icon: <Download className="size-4 text-blue-500" />,
                tone: "blue",
                testId: "balances-export",
                onSelect: async () => {
                  const res = await fetch(`${API_BASE}/time-off-balances/${org}/export`);
                  downloadFile("timeoff-balances.csv", await res.text());
                  toast.success("Balances exported");
                },
              },
              { label: "Import", icon: <Upload className="size-4 text-green-600" />, testId: "balances-import", onSelect: () => setImporting(true) },
            ]}
          />
          <Link
            href={`/organizations/${org}/absence_leave/audit_trail`}
            data-testid="view-audit-trail"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-ui-border bg-secondary-surface px-3 text-sm font-medium text-primary-text shadow-xs hover:bg-muted"
          >
            View Audit Trail
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-layout-subtle bg-secondary-surface/50">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="balances-table">
            <thead>
              <tr>
                <th className={cn(TH, "w-10")}>
                  <Checkbox checked={allOn} onCheckedChange={(v) => setChecked(v ? new Set(rows.map((r) => r.user_id)) : new Set())} aria-label="Select all" />
                </th>
                <th className={TH}>Member</th>
                <th className={TH}>Client</th>
                <th className={TH}>Projects</th>
                <th className={TH}>Teams</th>
                <th className={TH}>
                  <span className="inline-flex items-center gap-1.5">
                    Policy Balances
                    <span title="Remaining hours per policy. Click a policy to adjust its balance. $ = billable policy.">
                      <Info className="size-3.5 text-muted-foreground" />
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, k) => (
                        <td key={k} className={TD}>
                          <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((r) => (
                    <Row
                      key={r.user_id}
                      r={r}
                      checked={checked.has(r.user_id)}
                      onCheck={(v) =>
                        setChecked((s) => {
                          const n = new Set(s);
                          if (v) n.add(r.user_id);
                          else n.delete(r.user_id);
                          return n;
                        })
                      }
                      onAdjust={(p) => setAdjusting({ row: r, policy: p })}
                    />
                  ))}
            </tbody>
          </table>
          {!isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center border-t border-ui-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/no-data-placeholder.svg" alt="No data" width={140} height={140} className="mb-3" />
              <p className="text-sm font-medium text-secondary-text">No balances found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
        <div className="border-t border-ui-border px-3 py-3">
          <Pagination total={data?.total ?? 0} defaultPageSize={10} pageSizeOptions={[10, 20, 50, 100]} />
        </div>
      </div>
      {adjusting && <AdjustBalanceDialog row={adjusting.row} policy={adjusting.policy} onClose={() => setAdjusting(null)} />}
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}
