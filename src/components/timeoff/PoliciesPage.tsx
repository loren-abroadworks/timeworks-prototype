"use client";

/**
 * Absence & Leave › Policies — port of the live chunk 3oc3g8a82jtqy: search, "+ Add policy", View column menu,
 * table (Policy name, Accrual schedule, Client link, Paid, Billable, Approval, Users count, ⋮ Edit Policy / Delete Policy),
 * "Page x of y" pager with Go to. Create / Edit Policy dialog (same form; Schedule of Accrual and Start of Accrual Year locked
 * when editing) and the "Delete TimeOff Policy" confirm.
 */
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog as DialogPrimitive, DropdownMenu, RadioGroup, Select } from "radix-ui";
import { Check, ChevronDown, Info, Pencil, Plus, Trash2, XIcon } from "lucide-react";
import { apiSend, useApiQuery } from "@/lib/api-client";
import { useQueryParams } from "@/lib/use-query-params";
import type { TimeOffPolicy, TimeOffPolicyDetail, TimeOffPolicyList } from "@/lib/types/timeoff";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedSearch } from "@/components/ui/search-input";
import { DotsIcon } from "@/components/filters/ActionMenu";
import { ACTION_MENU_CONTENT, ACTION_MENU_ITEM } from "@/components/filters/styles";
import { toast } from "@/components/filters/toast";
import { AbsenceTabs, ColumnsMenu, ConfirmDialog, DataTable, MultiPickChip, TablePager, useAllMembers, useOrgId, type Column } from "./shared";

const SCHEDULE: Record<string, string> = { none: "None", annual: "Annual", monthly: "Monthly", hours_worked: "Hours worked", joined_date: "Policy joined date" };
const SCHEDULE_OPTIONS: [string, string][] = [
  ["none", "None"],
  ["annual", "Annual"],
  ["monthly", "Monthly"],
  ["hours_worked", "Hours worked"],
  ["joined_date", "Prorated Annual"],
];
const ANCHORS: [string, string][] = [
  ["calendar_year", "Calendar Year (January 1)"],
  ["work_anniversary", "Work Anniversary (Start Date)"],
  ["policy_joined_date", "Policy Joined Date"],
];
const BADGE = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";

function useInvalidatePolicies() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => ["TIME_OFF_POLICIES", "TIME_OFF_POLICY_DETAIL", "USER_TIME_OFF_POLICIES", "TIME_OFF_BALANCES"].some((k) => (q.queryKey as unknown[]).includes(k)) });
}

/* ---------------- form ---------------- */

interface FormState {
  name: string;
  policy_type: string;
  accrual_year_anchor: string;
  starting_balance: string;
  hours_per_year: string;
  accrual_amount: string;
  accrual_day: string;
  hours_worked_accrued: string;
  hours_worked_per_worked: string;
  is_billable: boolean;
  paid: boolean;
  balance_rolls_over_annually: boolean;
  rollover_cap: string;
  rollover_expiry_days: string;
  allow_negative_balances: boolean;
  max_negative_balance: string;
  requires_approval: boolean;
  client_id: number;
  user_ids: string[];
  auto_add_new_users: boolean;
}

const EMPTY: FormState = {
  name: "",
  policy_type: "none",
  accrual_year_anchor: "calendar_year",
  starting_balance: "",
  hours_per_year: "",
  accrual_amount: "",
  accrual_day: "first_day_of_month",
  hours_worked_accrued: "",
  hours_worked_per_worked: "",
  is_billable: true,
  paid: true,
  balance_rolls_over_annually: false,
  rollover_cap: "",
  rollover_expiry_days: "",
  allow_negative_balances: false,
  max_negative_balance: "40",
  requires_approval: false,
  client_id: 0,
  user_ids: [],
  auto_add_new_users: false,
};

const s = (v: number | null | undefined) => (v == null ? "" : String(v));
const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[13px] font-medium text-foreground">{children}</label>;
}
function Err({ m }: { m?: string }) {
  return m ? <p className="text-xs text-red-500">{m}</p> : null;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
function Unit({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div className="flex h-11 items-center overflow-hidden rounded-lg border border-input bg-card focus-within:border-primary">
      {children}
      <span className="shrink-0 px-3 text-xs text-muted-foreground">{unit}</span>
    </div>
  );
}
const NUM = "h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none disabled:opacity-50";
const Sep = () => <div className="h-px w-full bg-border" />;

function SelectBox({ value, onChange, options, disabled, testId }: { value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean; testId?: string }) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger data-testid={testId} className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30">
        <Select.Value />
        <ChevronDown className="size-4 opacity-50" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-120 w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-ui-border bg-popover p-1 text-popover-foreground shadow-md">
          <Select.Viewport>
            {options.map(([v, l]) => (
              <Select.Item key={v} value={v} data-testid={testId ? `${testId}-${v}` : undefined} className="relative flex cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent">
                <Select.ItemText>{l}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2">
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function Radios({ value, onChange, items, disabled }: { value: string; onChange: (v: string) => void; items: [string, string][]; disabled?: boolean }) {
  return (
    <RadioGroup.Root value={value} onValueChange={onChange} disabled={disabled} className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {items.map(([v, l]) => (
        <label key={v} className={cn("flex cursor-pointer items-center gap-2 text-sm", disabled && "cursor-not-allowed opacity-50")}>
          <RadioGroup.Item value={v} className="flex size-4 items-center justify-center rounded-full border border-primary">
            <RadioGroup.Indicator className="size-2 rounded-full bg-primary" />
          </RadioGroup.Item>
          {l}
        </label>
      ))}
    </RadioGroup.Root>
  );
}

function Check2({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox shape="sharp" checked={checked} onCheckedChange={(v) => onChange(v === true)} className="size-5 border-input" data-testid={testId} />
      {label}
    </label>
  );
}

export function PolicyFormDialog({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: number | null }) {
  const org = useOrgId();
  const isEdit = !!editId;
  const invalidate = useInvalidatePolicies();
  const { data: clients } = useApiQuery<{ id: number; name: string }[]>({ endpoint: `/all/clients/${org}`, queryKey: ["ALL", "CLIENTS", { organizationId: org }] });
  const { data: members } = useAllMembers();
  const { data: detail } = useApiQuery<TimeOffPolicyDetail>({ endpoint: `/time-off-policy/${org}/${editId}`, queryKey: ["TIME_OFF_POLICY_DETAIL", editId], enabled: open && isEdit });
  const [f, setF] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((x) => ({ ...x, [k]: v }));

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!isEdit) return setF(EMPTY);
    if (!detail) return;
    setF({
      name: detail.name,
      policy_type: detail.policy_type,
      accrual_year_anchor: detail.accrual_year_anchor,
      starting_balance: s(detail.starting_balance),
      hours_per_year: s(detail.hours_per_year),
      accrual_amount: s(detail.accrual_per_month),
      accrual_day: detail.accrual_day,
      hours_worked_accrued: s(detail.hours_worked_accrued),
      hours_worked_per_worked: s(detail.hours_worked_per_worked),
      is_billable: detail.is_billable,
      paid: detail.is_paid,
      balance_rolls_over_annually: detail.balance_rolls_over_annually,
      rollover_cap: s(detail.rollover_cap || null),
      rollover_expiry_days: s(detail.rollover_expiry_days),
      allow_negative_balances: detail.allow_negative_balances,
      max_negative_balance: detail.allow_negative_balances ? s(detail.max_negative_balance) : "0",
      requires_approval: detail.requires_approval,
      client_id: detail.client_id,
      user_ids: detail.assigned_users.map((u) => u.user_id),
      auto_add_new_users: detail.auto_add_new_users,
    });
  }, [open, isEdit, detail]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Policy name is required";
    if (f.policy_type === "none" && f.starting_balance.trim() === "") e.starting_balance = "Starting balance is required";
    else if (n(f.starting_balance) < 0) e.starting_balance = "Starting balance cannot be negative";
    if (!f.client_id) e.client_id = "Client is required";
    if (f.rollover_expiry_days && !f.rollover_cap) e.rollover_expiry_days = "Set a rollover cap before adding an expiry";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const monthly = f.policy_type === "monthly";
    const body = {
      name: f.name.trim(),
      policy_type: f.policy_type,
      accrual_year_anchor: f.accrual_year_anchor,
      user_ids: f.user_ids,
      client_id: f.client_id,
      is_paid: f.paid,
      is_billable: f.paid && f.is_billable,
      requires_approval: f.requires_approval,
      starting_balance: f.policy_type === "none" ? n(f.starting_balance) : 0,
      hours_per_year: monthly ? n(f.accrual_amount) * 12 : n(f.hours_per_year),
      accrual_per_month: monthly ? n(f.accrual_amount) : 0,
      accrual_day: f.accrual_day,
      allow_prorated: f.policy_type === "joined_date",
      hours_worked_accrued: f.policy_type === "hours_worked" ? n(f.hours_worked_accrued) : 0,
      hours_worked_per_worked: f.policy_type === "hours_worked" ? n(f.hours_worked_per_worked) : 0,
      allow_negative_balances: f.allow_negative_balances,
      max_negative_balance: f.allow_negative_balances ? n(f.max_negative_balance) : 0,
      balance_rolls_over_annually: f.balance_rolls_over_annually,
      paid: f.paid,
      auto_add_new_users: f.auto_add_new_users,
      tenure_accrual_enabled: false,
      tenure_tiers: [],
      tenure_increase_hours: 0,
      tenure_increase_interval_years: 0,
      tenure_max_annual_hours: null,
      ...(f.balance_rolls_over_annually ? { rollover_cap: n(f.rollover_cap) || null, rollover_expiry_days: (n(f.rollover_cap) && n(f.rollover_expiry_days)) || null } : { rollover_cap: 0 }),
    };
    setPending(true);
    try {
      await apiSend(isEdit ? "PUT" : "POST", isEdit ? `/time-off-policy/update/${org}/${editId}` : `/time-off-policy/create/${org}`, body);
      toast.success(isEdit ? "Time off policy updated successfully" : "Time off policy created successfully");
      invalidate();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || (isEdit ? "Failed to update time off policy" : "Failed to create time off policy"));
    } finally {
      setPending(false);
    }
  };

  const none = f.policy_type === "none";
  const perMonth = n(f.accrual_amount);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-testid="policy-dialog"
          onInteractOutside={(e) => {
            const t = e.detail.originalEvent.target as HTMLElement | null;
            if (t?.closest("[data-radix-popper-content-wrapper]")) e.preventDefault();
          }}
          className="fixed top-[50%] left-[50%] z-100 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-lg border border-layout-subtle bg-background p-0 shadow-lg md:max-w-4xl font-karla"
        >
          <div className="flex flex-col gap-1 px-6 pt-5">
            <DialogPrimitive.Title className="text-xl font-semibold text-foreground pr-8">{isEdit ? "Edit Policy" : "Create Policy"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-[13px] text-muted-foreground">{isEdit ? "Update this leave policy and the members assigned to it" : "Define a new leave policy and assign members"}</DialogPrimitive.Description>
          </div>
          <form onSubmit={submit} className="min-w-0" noValidate>
            <div className="min-w-0 px-6 py-5 space-y-5 max-h-[calc(100vh-240px)] overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Policy Name</Label>
                <input
                  data-testid="policy-name"
                  placeholder="Enter"
                  value={f.name}
                  onChange={(e) => (set("name", e.target.value), e.target.value.trim() && setErrors((x) => ({ ...x, name: "" })))}
                  onBlur={() => !f.name.trim() && setErrors((x) => ({ ...x, name: "Policy name is required" }))}
                  className={cn("h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-primary dark:bg-input/30", errors.name && "border-red-400 ring-2 ring-red-400/60")}
                />
                <Err m={errors.name} />
              </div>
              <Sep />
              <div className="grid gap-4 sm:grid-cols-2 items-start">
                <div className="space-y-1.5">
                  <Label>Schedule of Accrual</Label>
                  <SelectBox testId="policy-schedule" value={f.policy_type} onChange={(v) => set("policy_type", v)} options={SCHEDULE_OPTIONS} disabled={isEdit || pending} />
                  {isEdit && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="schedule-locked">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Schedule of accrual cannot be changed when editing a policy.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label>Start of Accrual Year</Label>
                    <span title="When the year resets — grants, rollover, and tenure step-up all use this. Distinct from the monthly accrual day. Locked after creation.">
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <SelectBox testId="policy-anchor" value={f.accrual_year_anchor} onChange={(v) => set("accrual_year_anchor", v)} options={ANCHORS} disabled={none || isEdit || pending} />
                  {none && <Hint>Not applicable. Time off is granted once and does not reset.</Hint>}
                </div>
              </div>
              {none && (
                <div className="max-w-96 space-y-1.5">
                  <Label>Starting Balance</Label>
                  <Unit unit="Hours">
                    <input data-testid="policy-starting-balance" type="number" step="0.5" min="0" placeholder="0" value={f.starting_balance} onChange={(e) => set("starting_balance", e.target.value)} className={NUM} />
                  </Unit>
                  <Err m={errors.starting_balance} />
                  <Hint>One-time lump sum, granted when added to this policy.</Hint>
                </div>
              )}
              {(f.policy_type === "annual" || f.policy_type === "joined_date" || f.policy_type === "hours_worked") && (
                <div className="space-y-4">
                  {f.policy_type === "hours_worked" && (
                    <div className="space-y-1.5">
                      <Label>Accrual Amount</Label>
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span>Accrue</span>
                        <input type="number" step="0.5" min="0" placeholder="0" value={f.hours_worked_accrued} onChange={(e) => set("hours_worked_accrued", e.target.value)} className="h-11 w-28 rounded-lg border border-input bg-card px-3 text-sm" />
                        <span>hour(s) for every</span>
                        <input type="number" step="1" min="1" placeholder="0" value={f.hours_worked_per_worked} onChange={(e) => set("hours_worked_per_worked", e.target.value)} className="h-11 w-28 rounded-lg border border-input bg-card px-3 text-sm" />
                        <span>hours worked</span>
                      </div>
                    </div>
                  )}
                  <div className="max-w-96 space-y-1.5">
                    <Label>Maximum Accrual Amount</Label>
                    <Unit unit={f.policy_type === "annual" ? "Hours per year" : "Hours per Year"}>
                      <input type="number" step="0.5" min="0" placeholder="0" value={f.hours_per_year} onChange={(e) => set("hours_per_year", e.target.value)} className={NUM} />
                    </Unit>
                  </div>
                  {f.policy_type === "joined_date" && (
                    <ul className="list-disc space-y-1 rounded-lg bg-muted px-8 py-3 text-[13px] text-muted-foreground">
                      <li>Balances are prorated based on the join date.</li>
                      <li>Maximum accrual amount ÷ 360 × (days remaining in year)</li>
                      <li>Updated balances may take up to 24 hours to display.</li>
                    </ul>
                  )}
                </div>
              )}
              {f.policy_type === "monthly" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Accrual Amount</Label>
                      <Unit unit="Hours per Month">
                        <input type="number" step="0.5" min="0" placeholder="0" value={f.accrual_amount} onChange={(e) => set("accrual_amount", e.target.value)} className={NUM} data-testid="policy-accrual-amount" />
                      </Unit>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Accrual Day</Label>
                      <SelectBox
                        value={f.accrual_day}
                        onChange={(v) => set("accrual_day", v)}
                        options={[
                          ["monthly_anniversary", "Monthly anniversary"],
                          ["first_day_of_month", "First day of the month"],
                          ["last_day_of_month", "Last day of the month"],
                        ]}
                      />
                    </div>
                  </div>
                  <Check2 checked={false} onChange={() => toast("Tenure tiers are not part of the replica")} label="Increase accrual with tenure" />
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <p className="text-sm font-medium text-foreground">Accrual Calculator</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
                      <span>{Number(perMonth.toFixed(1))} hrs / month</span>
                      <span>{Number((perMonth * 12).toFixed(1))} hrs / year</span>
                      <span>{Number(((perMonth * 12) / 8).toFixed(1))} days / year</span>
                    </div>
                  </div>
                </div>
              )}
              <Sep />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label>Billable</Label>
                  <Radios value={f.is_billable ? "billable" : "non_billable"} onChange={(v) => set("is_billable", v === "billable")} disabled={!f.paid} items={[["billable", "Billable"], ["non_billable", "Non-billable"]]} />
                </div>
                <div className="space-y-2.5">
                  <Label>Paid or Unpaid</Label>
                  <Radios value={f.paid ? "paid" : "unpaid"} onChange={(v) => setF((x) => ({ ...x, paid: v === "paid", is_billable: v === "paid" ? x.is_billable : false }))} items={[["paid", "Paid"], ["unpaid", "Unpaid"]]} />
                </div>
              </div>
              <Sep />
              <div className="space-y-3">
                <Label>Rules</Label>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Check2 testId="rule-rollover" checked={f.balance_rolls_over_annually} onChange={(v) => set("balance_rolls_over_annually", v)} label="Allow rollover of unused hours" />
                  <Check2 testId="rule-negative" checked={f.allow_negative_balances} onChange={(v) => setF((x) => ({ ...x, allow_negative_balances: v, max_negative_balance: v ? (n(x.max_negative_balance) > 0 ? x.max_negative_balance : "40") : "0" }))} label="Allow negative balance" />
                  <Check2 testId="rule-approval" checked={f.requires_approval} onChange={(v) => set("requires_approval", v)} label="Require approval for requests" />
                </div>
                {(f.balance_rolls_over_annually || f.allow_negative_balances) && (
                  <div className="grid gap-4 rounded-lg border border-ui-border p-4 sm:grid-cols-2">
                    {f.balance_rolls_over_annually && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Rollover Cap</Label>
                          <Unit unit="Hours">
                            <input data-testid="rollover-cap" type="number" step="0.5" min="0" placeholder="0" value={f.rollover_cap} onChange={(e) => set("rollover_cap", e.target.value)} className={NUM} />
                          </Unit>
                          <Hint>Hours above this cap are forfeited at reset. Blank = no cap.</Hint>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Rollover expiry</Label>
                          <Unit unit="Days">
                            <input data-testid="rollover-expiry" type="number" step="1" min="1" max="364" placeholder="0" value={f.rollover_expiry_days} disabled={!f.rollover_cap} onChange={(e) => set("rollover_expiry_days", e.target.value)} className={NUM} />
                          </Unit>
                          <Err m={errors.rollover_expiry_days} />
                          <Hint>{f.rollover_cap ? "Rolled-over hours are forfeited after this many days (1–364). Blank = never expires." : "Set a rollover cap first — expiry only applies to capped hours."}</Hint>
                        </div>
                      </>
                    )}
                    {f.allow_negative_balances && (
                      <div className={cn("space-y-1.5", !f.balance_rolls_over_annually && "sm:col-span-2")}>
                        <Label>Max Negative Balance</Label>
                        <Unit unit="Hours">
                          <input type="number" step="0.5" min="0" placeholder="0" value={f.max_negative_balance} onChange={(e) => set("max_negative_balance", e.target.value)} className={NUM} />
                        </Unit>
                        <Hint>Allows filing time off up to this many hours before they&apos;re accrued.</Hint>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Sep />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 flex flex-col min-w-0">
                  <Label>Linked Client</Label>
                  <SelectBox
                    testId="policy-client"
                    value={f.client_id ? String(f.client_id) : "0"}
                    onChange={(v) => (set("client_id", Number(v)), Number(v) && setErrors((x) => ({ ...x, client_id: "" })))}
                    options={[["0", "Select Client"], ...(clients ?? []).map((c) => [String(c.id), c.name] as [string, string])]}
                  />
                  <Err m={errors.client_id} />
                </div>
                <div className="space-y-1.5 flex flex-col min-w-0">
                  <Label>Assign Members</Label>
                  <MultiPickChip
                    label={f.user_ids.length ? `${f.user_ids.length} member${f.user_ids.length > 1 ? "s" : ""} selected` : "Select members"}
                    title="Assign members"
                    searchPlaceholder="Search members"
                    testId="policy-members"
                    options={(members ?? []).map((m) => ({ value: m.user_id, label: m.full_name, sub: m.email }))}
                    value={f.user_ids}
                    onApply={(v) => set("user_ids", v)}
                  />
                </div>
              </div>
              <Sep />
              <label className="flex items-start gap-2 text-[13px] cursor-pointer">
                <Checkbox shape="sharp" checked={f.auto_add_new_users} onCheckedChange={(v) => set("auto_add_new_users", v === true)} className="mt-0.5 size-5 border-input" />
                Auto-add future members of this client to this policy going forward.
              </label>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ui-border bg-secondary-surface px-4 text-sm font-medium text-primary-text shadow-xs hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={pending} data-testid="policy-submit" className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[image:var(--gradient-theme)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {pending ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Policy" : "Create Policy"}
              </button>
            </div>
          </form>
          <DialogPrimitive.Close className="absolute top-4 right-4 cursor-pointer opacity-70 hover:opacity-100 [&_svg]:size-4" aria-label="Close">
            <XIcon />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---------------- page ---------------- */

function RowMenu({ p, onEdit, onDelete }: { p: TimeOffPolicy; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <div role="button" tabIndex={0} data-testid="policy-row-menu" aria-label={`Actions for ${p.name}`} className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg shadow-xs border bg-secondary border-border">
            <DotsIcon />
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className={ACTION_MENU_CONTENT}>
            <DropdownMenu.Label className="text-sm font-medium px-3 py-2 border-b border-border">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Actions</span>
            </DropdownMenu.Label>
            <DropdownMenu.Item className={cn(ACTION_MENU_ITEM, "hover:bg-green-50 dark:hover:bg-green-500/15")} onSelect={onEdit} data-testid="policy-edit">
              <Pencil className="size-4 text-green-600" />
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Edit Policy</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item className={cn(ACTION_MENU_ITEM, "hover:bg-red-100 dark:hover:bg-red-500/20")} onSelect={onDelete} data-testid="policy-delete">
              <Trash2 className="size-4 text-red-600" />
              <span className="font-medium text-sm text-red-600">Delete Policy</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export function PoliciesPage() {
  const org = useOrgId();
  const { get, update } = useQueryParams();
  const invalidate = useInvalidatePolicies();
  const page = Math.max(0, Number(get("page") ?? 0) || 0);
  const perPage = Number(get("perPage") ?? 10) || 10;
  const search = get("search") ?? "";
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<Set<string | number>>(new Set());
  const [form, setForm] = React.useState<{ id: number | null } | null>(null);
  const [deleting, setDeleting] = React.useState<TimeOffPolicy | null>(null);
  const qs = new URLSearchParams({ limit: String(perPage), offset: String(page * perPage) });
  if (search) qs.set("search", search);
  const { data, isLoading } = useApiQuery<TimeOffPolicyList>({
    endpoint: `/time-off-policy/list/${org}?${qs}`,
    queryKey: ["list", "TIME_OFF_POLICIES", { page }, { perPage }, { search }, { sort: "" }, {}, {}, {}, { filter: "{}" }],
  });
  const columns: Column<TimeOffPolicy>[] = [
    { id: "name", header: "Policy name", cell: (p) => <span className="text-foreground" title={p.name}>{p.name.length > 40 ? `${p.name.slice(0, 40)}...` : p.name}</span> },
    { id: "accrual_schedule", header: "Accrual schedule", cell: (p) => <span className="font-medium text-foreground">{SCHEDULE[p.policy_type] ?? "Not Set"}</span> },
    {
      id: "client_name",
      header: "Client",
      cell: (p) => (p.client_name ? <a href={`/organizations/${org}/clients/${p.client_id}`} className="font-medium text-primary hover:underline">{p.client_name}</a> : <span className="text-muted-foreground">—</span>),
    },
    { id: "paid", header: "Paid", cell: (p) => (p.is_paid ? <span className={cn(BADGE, "bg-positive-selected text-green-text dark:bg-green-500/20 dark:text-green-300")}>Paid</span> : <span className={cn(BADGE, "bg-muted text-muted-foreground")}>Unpaid</span>) },
    { id: "billable", header: "Billable", cell: (p) => (p.is_billable ? <span className={cn(BADGE, "bg-blue-500/20 text-blue-300")}>Billable</span> : <span className={cn(BADGE, "bg-muted text-muted-foreground")}>Non-billable</span>) },
    { id: "approval", header: "Approval", cell: (p) => (p.requires_approval ? <span className={cn(BADGE, "bg-amber-500/20 text-amber-400")}>Required</span> : <span className={cn(BADGE, "bg-muted text-muted-foreground")}>Not required</span>) },
    { id: "users_count", header: "Users count", cell: (p) => <span>{p.users_count || ""}</span> },
    { id: "actions", header: "Actions", cell: (p) => <RowMenu p={p} onEdit={() => setForm({ id: p.id })} onDelete={() => setDeleting(p)} /> },
  ];
  return (
    <div className="font-karla pt-2 pb-6 flex flex-col" data-testid="policies-page">
      <AbsenceTabs />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <DebouncedSearch className="w-64 bg-secondary-surface" updateQueryParam />
        <div className="flex items-center gap-2">
          <button type="button" data-testid="add-policy" onClick={() => setForm({ id: null })} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[image:var(--gradient-theme)] px-4 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" />
            Add policy
          </button>
          <ColumnsMenu columns={columns.filter((c) => c.id !== "actions")} hidden={hidden} onChange={setHidden} />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(p) => p.id}
        hidden={hidden}
        onHide={(id) => setHidden((h) => [...h, id])}
        onResetColumns={() => setHidden([])}
        selected={selected}
        onSelect={setSelected}
        loading={isLoading}
        testId="policies-table"
      />
      <TablePager total={data?.total ?? 0} page={page} perPage={perPage} onPage={(p) => update({ page: p ? String(p) : null })} onPerPage={(x) => update({ perPage: String(x), page: null })} sizes={[10, 20, 50]} allOption={false} goTo />
      <PolicyFormDialog open={!!form} editId={form?.id} onClose={() => setForm(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete TimeOff Policy"
        description="Are you sure you want to delete this time off policy? This action cannot be undone."
        onCancel={() => setDeleting(null)}
        onContinue={async () => {
          if (!deleting) return;
          try {
            await apiSend("DELETE", `/time-off-policy/delete/${org}/${deleting.id}`, {});
            toast.success("Status updated successfully");
            invalidate();
          } catch (e) {
            toast.error((e as Error).message || "Failed to update status");
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
