"use client";

import * as React from "react";
import { Command } from "cmdk";
import { BriefcaseBusiness, Check, ChevronDown, Search, X } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { ProjectOption } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHIP_ACTIVE, CHIP_IDLE, COMMAND_GROUP, COMMAND_ITEM, COMMAND_LIST } from "./styles";

export interface ChipOption {
  value: string;
  label: string;
}

/**
 * Toolbar filter chip ("Project ▾", "Time Type ▾", "Activity ▾" …) with a "Filter by …" popover:
 * header + close, search box, cmdk list. `multiple` renders checkboxes (Screenshots page),
 * otherwise a single value with ✓ (Timesheets page).
 */
export function OptionChip({
  label,
  title,
  searchPlaceholder,
  options,
  value,
  onChange,
  multiple = false,
  icon,
  capitalize = false,
  testId,
}: {
  /** Chip text when nothing is selected. */
  label: string;
  /** Popover heading, e.g. "Filter by Time Type". */
  title: string;
  searchPlaceholder: string;
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  icon?: React.ReactNode;
  capitalize?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = options.filter((o) => value.includes(o.value));
  const text = selected.length === 0 ? label : selected.length === 1 ? selected[0].label : `${selected[0].label} +${selected.length - 1}`;
  const list = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger type="button" role="combobox" className={selected.length ? CHIP_ACTIVE : CHIP_IDLE} title={label} data-testid={testId}>
        {icon}
        <span title={text} className={cn("truncate text-left max-w-48", capitalize && "capitalize")}>
          {text}
        </span>
        {selected.length ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            className="-mr-1 flex size-5 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-primary/20"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
            <X className="size-3.5" />
          </span>
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        )}
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden rounded-2xl border border-border p-0 shadow-xl min-w-56 w-64" data-testid={testId ? `${testId}-popover` : undefined}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <Command shouldFilter={false} data-slot="command" className="text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent">
          <div className="p-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onValueChange={setSearch}
              />
            </div>
          </div>
          <Command.List data-slot="command-list" className={COMMAND_LIST}>
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
            <Command.Group data-slot="command-group" className={COMMAND_GROUP}>
              {list.map((o) => {
                const on = value.includes(o.value);
                return (
                  <Command.Item
                    key={o.value}
                    value={o.value}
                    title={o.label}
                    data-slot="command-item"
                    className={cn(COMMAND_ITEM, capitalize && "capitalize")}
                    onSelect={() => {
                      if (multiple) onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value]);
                      else {
                        onChange(on ? [] : [o.value]);
                        setOpen(false);
                      }
                    }}
                  >
                    {multiple && <Checkbox checked={on} variant="brand" size="lg" className="pointer-events-none rounded-xs" tabIndex={-1} />}
                    <span className="min-w-0 flex-1 truncate text-foreground">{o.label}</span>
                    {!multiple && on && <Check className="ml-auto stroke-3 text-primary" />}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** GET /all/projects/{org}?user_id=… — ["ALL","PROJECTS",{organizationId},userId]. */
export function useProjects(userId?: string | null) {
  const { organizationId } = useSession();
  return useApiQuery<ProjectOption[]>({
    endpoint: `/all/projects/${organizationId}${userId ? `?user_id=${userId}` : ""}`,
    queryKey: ["ALL", "PROJECTS", { organizationId }, userId ?? null],
    enabled: !!organizationId,
  });
}

/** "Project ▾" chip (briefcase icon) backed by the member's projects. */
export function ProjectChip({ userId, value, onChange, multiple = false }: { userId?: string | null; value: string[]; onChange: (v: string[]) => void; multiple?: boolean }) {
  const { data = [] } = useProjects(userId);
  return (
    <OptionChip
      label="Project"
      title="Filter by Project"
      searchPlaceholder="Search project"
      options={data.map((p) => ({ value: p.id, label: p.name }))}
      value={value}
      onChange={onChange}
      multiple={multiple}
      icon={<BriefcaseBusiness className="size-4 shrink-0" />}
      testId="project-chip"
    />
  );
}
