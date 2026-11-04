"use client";

/**
 * Shared pieces of the time-off pages (Calendar › Timeoff Requests, Absence & Leave):
 * Absence & Leave tab bar, avatar letter, status chip, confirm dialog, data table with column menus,
 * "Page x of y" pager, multi-select filter chip with Apply (n), and query hooks.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertDialog, DropdownMenu, Popover as PopoverPrimitive, Select } from "radix-ui";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  CircleCheckBig,
  CircleX,
  Clock,
  EllipsisVertical,
  EyeOff,
  GripVertical,
  ListChecks,
  RotateCcw,
  Scale,
  ScrollText,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { apiGet, apiSend, useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { BalanceSummary, TimeOffPolicy, TimeOffStatus, UserTimeOffPolicy } from "@/lib/types/timeoff";
import type { MemberOption } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHIP_ACTIVE, CHIP_IDLE } from "@/components/filters/styles";

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const ORG_TZ = "America/New_York";

export function useOrgId() {
  return useSession().organizationId ?? 3;
}

/** GET /user-time-off-policy/list/{org} — ["USER_TIME_OFF_POLICIES", org] like the live app. */
export function useUserPolicies() {
  const org = useOrgId();
  return useApiQuery<{ total: number; data: UserTimeOffPolicy[] }>({ endpoint: `/user-time-off-policy/list/${org}`, queryKey: ["USER_TIME_OFF_POLICIES", String(org)] });
}

/** Every policy (filter chips). */
export function useAllPolicies() {
  const org = useOrgId();
  return useApiQuery<{ total: number; data: TimeOffPolicy[] }>({ endpoint: `/time-off/policies-list/${org}`, queryKey: ["TIME_OFF_POLICIES", String(org)] });
}

export function useTeams() {
  return [
    { id: 1, name: "Product Engineering" },
    { id: 2, name: "Client Delivery" },
    { id: 3, name: "Design Studio" },
    { id: 4, name: "Customer Success" },
  ];
}

export function useAllMembers() {
  const org = useOrgId();
  return useApiQuery<MemberOption[]>({ endpoint: `/all/user/${org}`, queryKey: ["All", "MEMBERS", { organizationId: org }] });
}

/** POST /time-off/request/balance-summary/{org} (query key mirrors the live TIME_OFF_REQUEST_BALANCE_SUMMARY). */
export function useBalanceSummary(args: { userId?: string; policyId?: number | null; details: { started_at_datetime: string; stopped_at_datetime: string }[]; excludeRequestId?: number }) {
  const org = useOrgId();
  return useQuery<BalanceSummary>({
    queryKey: ["TIME_OFF_REQUEST_BALANCE_SUMMARY", String(org), args.userId, args.policyId ?? 0, args.details, args.excludeRequestId],
    queryFn: () =>
      apiSend<BalanceSummary>("POST", `/time-off/request/balance-summary/${org}`, {
        user_id: args.userId,
        time_off_policy_id: args.policyId,
        timezone: ORG_TZ,
        details: args.details,
        exclude_request_id: args.excludeRequestId ?? null,
      }),
    enabled: !!args.userId && !!args.policyId,
    placeholderData: (p) => p,
  });
}

export { apiGet };

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

/** Live AvatarLetter: picture or first letter on bg-primary with a grey ring. */
export function AvatarLetter({ name, src, className, textClassName }: { name: string; src?: string | null; className?: string; textClassName?: string }) {
  return (
    <span data-slot="avatar" data-size="default" className={cn("group/avatar relative flex shrink-0 overflow-hidden select-none size-8 rounded-full", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-slot="avatar-image" className="aspect-square size-full rounded-full object-cover border-2 border-gray-400 bg-primary" alt={name} src={src} />
      ) : (
        <span
          data-slot="avatar-fallback"
          className={cn("rounded-full text-sm font-bold text-primary-foreground aspect-square bg-primary border-2 border-gray-400 flex items-center justify-center size-full shrink-0", textClassName)}
        >
          {(name.trim()[0] ?? "?").toUpperCase()}
        </span>
      )}
    </span>
  );
}

const CHIP_TONE: Record<TimeOffStatus, string> = {
  submitted:
    "bg-[color-mix(in_oklab,var(--warning)_42%,var(--card))] text-[oklch(from_var(--warning)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--warning)_34%,var(--card))] dark:text-[oklch(from_var(--warning)_0.86_c_h)]",
  approved:
    "bg-[color-mix(in_oklab,var(--positive)_30%,var(--card))] text-[oklch(from_var(--positive)_0.42_c_h)] dark:bg-[color-mix(in_oklab,var(--positive)_34%,var(--card))] dark:text-[oklch(from_var(--positive)_0.86_c_h)]",
  denied:
    "bg-[color-mix(in_oklab,var(--negative)_26%,var(--card))] text-[oklch(from_var(--negative)_0.45_c_h)] dark:bg-[color-mix(in_oklab,var(--negative)_34%,var(--card))] dark:text-[oklch(from_var(--negative)_0.86_c_h)]",
};

export function StatusIcon({ status, className = "size-3" }: { status: TimeOffStatus; className?: string }) {
  return status === "submitted" ? <Clock className={className} /> : status === "approved" ? <CircleCheckBig className={className} /> : <CircleX className={className} />;
}

/** Table status badge: Pending (yellow), approved (green), denied (red). */
export function StatusChip({ status, className }: { status: TimeOffStatus; className?: string }) {
  return (
    <span
      data-slot="chip"
      data-testid="status-chip"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border border-transparent whitespace-nowrap dark:border-white/10 font-semibold h-6 min-w-16 px-2.5 text-xs leading-none w-22 capitalize",
        CHIP_TONE[status],
        className,
      )}
    >
      <span className="-ml-0.5 flex">
        <StatusIcon status={status} />
      </span>
      {status === "submitted" ? "Pending" : status}
    </span>
  );
}

/** Generic "Title / Description / Cancel / Continue" confirm (the live `$` ConfirmDialog). */
export function ConfirmDialog({
  open,
  title,
  description,
  onContinue,
  onCancel,
  continueText = "Continue",
  cancelText = "Cancel",
  continueVariant = "positive",
  continueDisabled,
  children,
  testId,
}: {
  open: boolean;
  title: string;
  description: string;
  onContinue: () => void;
  onCancel: () => void;
  continueText?: string;
  cancelText?: string;
  continueVariant?: "positive" | "negative" | "themed";
  continueDisabled?: boolean;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-110 bg-black/50" />
        <AlertDialog.Content
          data-testid={testId ?? "confirm-dialog"}
          className="fixed top-[50%] left-[50%] z-110 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-ui-border p-4 shadow-lg bg-popover dark:bg-secondary-surface sm:max-w-md font-karla"
        >
          <div className="flex flex-col gap-2 text-left">
            <AlertDialog.Title className="text-lg font-semibold text-foreground">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">{description}</AlertDialog.Description>
          </div>
          {children}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium text-primary-text shadow-xs hover:bg-muted">
                {cancelText}
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              data-testid="confirm-continue"
              disabled={continueDisabled}
              onClick={onContinue}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center rounded-lg px-4 text-sm font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
                continueVariant === "negative" ? "bg-[image:var(--gradient-negative)]" : continueVariant === "themed" ? "bg-[image:var(--gradient-theme)]" : "bg-[image:var(--gradient-positive)]",
              )}
            >
              {continueText}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Absence & Leave tab bar                                             */
/* ------------------------------------------------------------------ */

const TABS = [
  { slug: "calendar", label: "Calendar", icon: CalendarDays },
  { slug: "requests", label: "Requests", icon: ListChecks },
  { slug: "balances", label: "Balances", icon: Scale },
  { slug: "policies", label: "Policies", icon: ScrollText },
];

/** Calendar | Requests | Balances | Policies (links; the active one is a filled pill, none on Audit Trail). */
export function AbsenceTabs() {
  const pathname = usePathname();
  const org = useOrgId();
  const active = TABS.find((t) => pathname.includes(`/absence_leave/${t.slug}`))?.slug ?? "";
  return (
    <div dir="ltr" data-orientation="horizontal" data-slot="tabs" className="flex flex-col gap-2 mb-4 shrink-0">
      <div role="tablist" aria-orientation="horizontal" data-slot="tabs-list" data-variant="pill" data-stretched="false" className="inline-flex items-center border border-ui-border bg-secondary-surface p-0.5 text-foreground rounded-md h-9 w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.slug === active;
          return (
            <Link
              key={t.slug}
              role="tab"
              aria-selected={on}
              data-state={on ? "active" : "inactive"}
              data-slot="tabs-trigger"
              href={`/organizations/${org}/absence_leave/${t.slug}`}
              className={cn(
                "inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap text-sm rounded-sm h-7 px-4 transition-all [&_svg]:size-4",
                on ? "bg-primary text-primary-foreground" : "dark:text-foreground",
              )}
            >
              <Icon />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data table                                                          */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  id: string;
  header: string;
  /** Name shown in the View menu (defaults to header). */
  menuLabel?: string;
  cell: (row: T) => React.ReactNode;
  /** Sort key sent to the API / used locally; omit for unsortable columns. */
  sortKey?: string;
  className?: string;
  headerClassName?: string;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

const TH =
  "whitespace-nowrap !bg-secondary-surface backdrop-blur-md h-12 !py-3.5 group relative py-2 text-left text-sm font-semibold text-neutralgray-10 px-4";
const TD = "truncate whitespace-nowrap border-b border-ui-border px-4 py-3 text-sm text-secondary-text";

/**
 * Port of the live DataTable: checkbox column, uppercase headers with a ⋮ menu (Sort Ascending / Descending,
 * Reset Columns, Hide Column), sticky header, horizontal scroll. Column visibility is controlled by the caller
 * (see ColumnsMenu).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  hidden,
  onHide,
  onResetColumns,
  sort,
  onSort,
  selectable = true,
  selected,
  onSelect,
  empty,
  loading,
  testId,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  hidden: string[];
  onHide: (id: string) => void;
  onResetColumns: () => void;
  sort?: SortState | null;
  onSort?: (s: SortState | null) => void;
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelect?: (next: Set<string | number>) => void;
  empty?: React.ReactNode;
  loading?: boolean;
  testId?: string;
  className?: string;
}) {
  const visible = columns.filter((c) => !hidden.includes(c.id));
  const sel = selected ?? new Set<string | number>();
  const allOn = rows.length > 0 && rows.every((r) => sel.has(rowKey(r)));
  return (
    <div className={cn("relative min-h-0 rounded-t-md border border-b-0 border-layout-subtle overflow-hidden", className)} data-testid={testId}>
      <div className="h-full overflow-auto scroll-smooth">
        <table className="w-full divide-y divide-ui-border table-auto">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr className="relative">
              {selectable && (
                <th className={cn(TH, "px-0 w-12")}>
                  <div className="flex w-full items-center justify-center px-2">
                    <Checkbox
                      checked={allOn}
                      onCheckedChange={(v) => onSelect?.(v ? new Set(rows.map(rowKey)) : new Set())}
                      className="h-4 w-4 rounded border-ui-border bg-white/60 dark:bg-white/60 text-primary"
                      aria-label="Select all rows"
                    />
                  </div>
                </th>
              )}
              {visible.map((c) => (
                <th key={c.id} className={cn(TH, c.headerClassName)} data-testid={`th-${c.id}`}>
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={cn("text-left text-xs font-medium uppercase tracking-wider text-gray-500 flex flex-1 truncate pl-0", c.sortKey && "cursor-pointer select-none")}
                      onClick={() => c.sortKey && onSort?.(sort?.key === c.sortKey ? (sort.dir === "asc" ? { key: c.sortKey, dir: "desc" } : null) : { key: c.sortKey, dir: "asc" })}
                    >
                      {c.header}
                    </span>
                    <div className="flex items-center gap-2">
                      {c.sortKey &&
                        (sort?.key === c.sortKey ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="size-3.5 text-gray-500" />
                          ) : (
                            <ArrowDown className="size-3.5 text-gray-500" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-gray-500" />
                        ))}
                      <HeaderMenu column={c} onSort={onSort} onHide={onHide} onReset={onResetColumns} />
                    </div>
                    <div className="resizer absolute right-0 top-0 flex h-full w-4 cursor-col-resize items-center justify-center group-hover:opacity-100 opacity-0">
                      <span className="h-full w-0.5 bg-neutralgray-13" />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border bg-background">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="bg-secondary-surface/50">
                    {selectable && <td className={TD} />}
                    {visible.map((c) => (
                      <td key={c.id} className={TD}>
                        <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => {
                  const k = rowKey(r);
                  return (
                    <tr key={k} className="bg-secondary-surface/50" data-testid="table-row">
                      {selectable && (
                        <td className={TD}>
                          <div className="max-w-10 overflow-hidden truncate flex justify-center mx-auto">
                            <Checkbox
                              checked={sel.has(k)}
                              onCheckedChange={(v) => {
                                const next = new Set(sel);
                                if (v) next.add(k);
                                else next.delete(k);
                                onSelect?.(next);
                              }}
                              className="h-4 w-4 rounded border-ui-border bg-white/60 dark:bg-white/60 text-primary"
                              aria-label="Select row"
                            />
                          </div>
                        </td>
                      )}
                      {visible.map((c) => (
                        <td key={c.id} className={cn(TD, c.className)}>
                          {c.cell(r)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (empty ?? <TableEmpty />)}
      </div>
    </div>
  );
}

export function TableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-secondary-surface/50 border-b border-layout-subtle" data-testid="table-empty">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="No data" width={160} height={160} className="mb-3" src="/no-data-placeholder.svg" />
      <p className="text-base font-semibold text-primary-text">No results found</p>
      <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
    </div>
  );
}

const MENU = "z-100 min-w-44 overflow-hidden rounded-lg border border-border bg-secondary p-1 shadow-md text-popover-foreground";
const MENU_ITEM = "relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-hidden select-none data-[highlighted]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground";

function HeaderMenu<T>({ column, onSort, onHide, onReset }: { column: Column<T>; onSort?: (s: SortState | null) => void; onHide: (id: string) => void; onReset: () => void }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={`${column.header} column menu`} className="cursor-pointer text-gray-500 hover:text-foreground">
          <EllipsisVertical className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={MENU} data-testid="column-header-menu">
          {column.sortKey && (
            <>
              <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onSort?.({ key: column.sortKey!, dir: "asc" })}>
                <ArrowUp /> Sort Ascending
              </DropdownMenu.Item>
              <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onSort?.({ key: column.sortKey!, dir: "desc" })}>
                <ArrowDown /> Sort Descending
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            </>
          )}
          <DropdownMenu.Item className={MENU_ITEM} onSelect={onReset}>
            <RotateCcw /> Reset Columns
          </DropdownMenu.Item>
          <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onHide(column.id)}>
            <EyeOff /> Hide Column
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** "View ⇅" button: searchable column checklist + Reset Order / Show All Columns / Reset Column Sizes. */
export function ColumnsMenu<T>({ columns, hidden, onChange }: { columns: Column<T>[]; hidden: string[]; onChange: (hidden: string[]) => void }) {
  const [q, setQ] = React.useState("");
  const list = columns.filter((c) => (c.menuLabel ?? c.header).toLowerCase().includes(q.toLowerCase()));
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          data-slot="dropdown-menu-trigger"
          data-testid="view-columns-button"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 cursor-pointer bg-primary text-primary-foreground shadow-xs h-9 px-3 py-2 rounded-lg [&_svg]:size-4"
          type="button"
        >
          <Settings2 />
          <span className="hidden sm:flex">View</span>
          <ChevronsUpDown />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={cn(MENU, "w-64 p-0")} data-testid="view-columns-menu">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search columns..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {list.map((c) => (
              <DropdownMenu.CheckboxItem
                key={c.id}
                checked={!hidden.includes(c.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(v) => onChange(v ? hidden.filter((h) => h !== c.id) : [...hidden, c.id])}
                className={MENU_ITEM}
              >
                <GripVertical className="size-3.5" />
                <span className={cn("flex size-4 items-center justify-center rounded-[4px] border border-primary", !hidden.includes(c.id) && "bg-primary")}>
                  {!hidden.includes(c.id) && <Check className="size-3! text-primary-foreground!" />}
                </span>
                {c.menuLabel ?? c.header}
              </DropdownMenu.CheckboxItem>
            ))}
          </div>
          <div className="border-t border-border p-1">
            <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onChange([])}>
              <RotateCcw /> Reset Order
            </DropdownMenu.Item>
            <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onChange([])}>
              <Check /> Show All Columns
            </DropdownMenu.Item>
            <DropdownMenu.Item className={MENU_ITEM} onSelect={() => onChange(hidden)}>
              <ChevronsUpDown /> Reset Column Sizes
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ------------------------------------------------------------------ */
/* "Showing 1-16 of 16 results  « ‹ Page 1 of 1 › »  All (16)" pager   */
/* ------------------------------------------------------------------ */

const PAGE_BTN_ON = "flex h-9 w-9 items-center justify-center rounded-lg border duration-200 cursor-pointer border-primary bg-primary text-primary-foreground hover:opacity-90";
const PAGE_BTN_OFF = "flex h-9 w-9 items-center justify-center rounded-lg border duration-200 cursor-not-allowed border-primary/30 bg-primary/40 text-primary-foreground";

export function TablePager({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
  sizes = [10, 25, 50, 100],
  allOption = true,
  goTo = false,
  showLabel = (n: number) => `Show ${n}`,
}: {
  total: number;
  /** 0-based */
  page: number;
  /** 0 = All */
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  sizes?: number[];
  allOption?: boolean;
  goTo?: boolean;
  showLabel?: (n: number) => string;
}) {
  const size = perPage || Math.max(total, 1);
  const pages = Math.max(total ? Math.ceil(total / size) : 0, total ? 1 : 0);
  const from = total ? page * size + 1 : 0;
  const to = Math.min(total, (page + 1) * size);
  const [jump, setJump] = React.useState(String(page + 1));
  React.useEffect(() => setJump(String(page + 1)), [page]);
  const btn = (enabled: boolean, title: string, onClick: () => void, icon: React.ReactNode) => (
    <button type="button" className={enabled ? PAGE_BTN_ON : PAGE_BTN_OFF} disabled={!enabled} title={title} onClick={onClick}>
      {icon}
    </button>
  );
  return (
    <div className="shrink-0 bg-secondary-surface border border-t-0 border-layout-subtle rounded-b-md" data-testid="table-pager">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:gap-4 p-2">
        <div className="flex items-center">
          <div className="flex items-center gap-2 rounded-lg border border-ui-border px-4 py-2">
            <div className="flex items-center gap-1" data-testid="pager-summary">
              <span className="text-sm text-muted-foreground">Showing</span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold text-primary">{total ? `${from}-${to}` : "0"}</span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold text-foreground">{total}</span>
              <span className="text-sm text-muted-foreground">results</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {btn(page > 0, "First page", () => onPage(0), <ChevronsLeft className="h-4 w-4" />)}
          {btn(page > 0, "Previous page", () => onPage(page - 1), <ChevronLeft className="h-4 w-4" />)}
          <div className="flex items-center gap-2 rounded-lg border border-ui-border bg-transparent px-3 py-2 text-sm font-medium text-foreground" data-testid="pager-page">
            <span>Page</span>
            <span className="text-foreground">{pages ? page + 1 : 1}</span>
            <span>of</span>
            <span className="text-foreground">{pages}</span>
          </div>
          {btn(page < pages - 1, "Next page", () => onPage(page + 1), <ChevronRight className="h-4 w-4" />)}
          {btn(page < pages - 1, "Last page", () => onPage(pages - 1), <ChevronsRight className="h-4 w-4" />)}
        </div>
        <div className="flex items-center gap-3">
          {goTo && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Go to:
              <input
                value={jump}
                onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onPage(Math.min(Math.max(1, Number(jump) || 1), Math.max(pages, 1)) - 1);
                }}
                className="h-9 w-16 rounded-md border border-ui-border bg-transparent px-2 text-center text-sm text-foreground outline-none"
              />
            </label>
          )}
          <Select.Root value={String(perPage)} onValueChange={(v) => onPerPage(Number(v))}>
            <Select.Trigger
              data-slot="select-trigger"
              className="dark:bg-input/30 shadow-xs flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm h-9 sm:min-w-[130px] border-ui-border cursor-pointer"
            >
              <Select.Value>{perPage === 0 || (allOption && total > 0 && perPage >= total) ? `All (${total})` : showLabel(perPage)}</Select.Value>
              <ChevronDown className="size-4 opacity-50" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content position="popper" sideOffset={4} className="z-110 min-w-32 overflow-hidden rounded-md border border-ui-border bg-popover p-1 text-popover-foreground shadow-md">
                <Select.Viewport>
                  {[...sizes, ...(allOption ? [0] : [])].map((n) => (
                    <Select.Item key={n} value={String(n)} className="relative flex cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent">
                      <Select.ItemText>{n === 0 ? `All (${total})` : showLabel(n)}</Select.ItemText>
                      <Select.ItemIndicator className="absolute right-2">
                        <Check className="size-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Multi-select filter chip ("Time Off Policy 3", Apply (n))           */
/* ------------------------------------------------------------------ */

export interface PickOption {
  value: string;
  label: string;
  sub?: string;
  avatar?: { name: string; src?: string | null };
}

export function MultiPickChip({
  label,
  title,
  searchPlaceholder,
  options,
  value,
  onApply,
  allLabel,
  testId,
}: {
  label: string;
  title: string;
  searchPlaceholder: string;
  options: PickOption[];
  value: string[];
  onApply: (v: string[]) => void;
  /** Extra "All …" row (ticked when nothing is selected). */
  allLabel?: string;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [draft, setDraft] = React.useState<string[]>(value);
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const list = options.filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const all = options.length > 0 && draft.length === options.length;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => (setOpen(o), o || setQ(""))}>
      <PopoverPrimitive.Trigger type="button" role="combobox" className={value.length ? CHIP_ACTIVE : CHIP_IDLE} data-testid={testId}>
        <span className="max-w-48 truncate text-left">{label}</span>
        {value.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">{value.length}</span>}
        {value.length > 0 ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            className="-mr-1 flex size-5 cursor-pointer items-center justify-center rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onApply([]);
            }}
          >
            <X className="size-3.5" />
          </span>
        ) : (
          <ChevronDown className="size-4 opacity-60" />
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" sideOffset={6} className="z-110 w-72 overflow-hidden rounded-2xl border border-ui-border bg-popover p-0 text-popover-foreground shadow-xl" data-testid={testId ? `${testId}-popover` : undefined}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{title}</p>
            <button type="button" aria-label="Close" className="cursor-pointer rounded-full p-1 hover:bg-muted" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </button>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5">
              <Search className="size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto px-2 pb-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={all} onCheckedChange={(v) => setDraft(v ? options.map((o) => o.value) : [])} />
              Select All
            </label>
            {allLabel && (
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent">
                <Checkbox checked={draft.length === 0} onCheckedChange={() => setDraft([])} />
                {allLabel}
              </label>
            )}
            {list.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent" data-testid="pick-option">
                <Checkbox checked={draft.includes(o.value)} onCheckedChange={(v) => setDraft(v ? [...draft, o.value] : draft.filter((x) => x !== o.value))} />
                {o.avatar && <AvatarLetter name={o.avatar.name} src={o.avatar.src} className="size-6" textClassName="text-[10px]" />}
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                </span>
              </label>
            ))}
            {list.length === 0 && <p className="px-2.5 py-3 text-center text-sm text-muted-foreground">No results</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-border p-2">
            <button type="button" className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-3 text-sm hover:bg-muted" onClick={() => setDraft([])}>
              Clear
            </button>
            <button
              type="button"
              data-testid="pick-apply"
              className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-theme)] px-3 text-sm font-medium text-white hover:opacity-90"
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
            >
              Apply{draft.length ? ` (${draft.length})` : ""}
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** 8 -> "8h", 3.5 -> "3.5h", -16 -> "-16h" */
export const fmtH = (h: number) => `${Number.isInteger(Math.round(h * 100) / 100) ? Math.round(h) : (Math.round(h * 10) / 10).toFixed(1)}h`;

export function HoverInfo({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="max-w-80 rounded-lg border border-ui-border p-2 text-xs">{text}</PopoverContent>
    </Popover>
  );
}
