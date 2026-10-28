"use client";

import * as React from "react";
import { Check, ChevronsUpDown, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSession } from "@/lib/session";
import type { MemberOption, ProjectOption } from "@/lib/api-types";
import { cn } from "@/lib/utils";

/**
 * Single-select dropdown with a search box (used for the Project and Member filters inside
 * the "View All" sheets). Clicking the selected option again clears it (allowDeselect).
 */
interface Option {
  id: string;
  name: string;
}

function FilterSelect({
  options,
  selectedId,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  triggerClassName,
  testId,
}: {
  options: Option[];
  selectedId?: string;
  onChange: (option: Option | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  triggerClassName?: string;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selected = options.find((o) => o.id === selectedId);
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()));
  // Selected option is listed first (live behaviour).
  const ordered = [...filtered.filter((o) => o.id === selectedId), ...filtered.filter((o) => o.id !== selectedId)];

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild title={selected?.name ?? placeholder}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          data-testid={testId}
          className={cn("w-full sm:w-48 justify-between text-sm bg-card border border-ui-border dark:border-ui-border rounded-lg shadow-xs", triggerClassName)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{selected?.name ?? placeholder}</span>
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden rounded-2xl border border-border p-0 shadow-xl w-64 max-w-[var(--radix-popover-content-available-width)]" style={{ width: "var(--radix-popover-trigger-width)" }} collisionPadding={16}>
        <div className="p-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          {ordered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            ordered.map((o) => {
              const isSel = o.id === selectedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  title={o.name}
                  onClick={() => {
                    onChange(isSel ? null : o);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 my-0.5 py-1.5 text-left text-sm transition-colors",
                    isSel ? "bg-brand-blue/10 font-medium" : "hover:bg-foreground/5",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{o.name}</span>
                  {isSel && <Check className="ml-auto size-4 stroke-3 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Project filter — options from GET /all/projects/{org}. */
export function ProjectSelect({ selected, setSelected, triggerClassName }: { selected?: Option; setSelected: (o: Option | null) => void; triggerClassName?: string }) {
  const { organizationId } = useSession();
  const { data = [] } = useApiQuery<ProjectOption[]>({
    endpoint: endpoints.all.projects.endpoint(organizationId ?? 0),
    queryKey: endpoints.all.projects.queryKey(organizationId ?? 0),
    enabled: !!organizationId,
  });
  return (
    <FilterSelect
      options={data}
      selectedId={selected?.id}
      onChange={setSelected}
      placeholder="Select Project"
      searchPlaceholder="Search project"
      emptyText="No project found."
      triggerClassName={triggerClassName}
      testId="project-filter"
    />
  );
}

/** Member filter — options from GET /all/user/{org}. */
export function MemberSelect({
  selected,
  setSelected,
  triggerClassName,
}: {
  selected?: { user_id: string; name: string };
  setSelected: (m: { user_id: string; full_name: string } | null) => void;
  triggerClassName?: string;
}) {
  const { organizationId } = useSession();
  const { data = [] } = useApiQuery<MemberOption[]>({
    endpoint: endpoints.all.members.endpoint(organizationId ?? 0),
    queryKey: endpoints.all.members.queryKey(organizationId ?? 0),
    enabled: !!organizationId,
  });
  const options = [...data].sort((a, b) => a.full_name.localeCompare(b.full_name)).map((m) => ({ id: m.user_id, name: m.full_name }));
  return (
    <FilterSelect
      options={options}
      selectedId={selected?.user_id}
      onChange={(o) => setSelected(o ? { user_id: o.id, full_name: o.name } : null)}
      placeholder="Select Member"
      searchPlaceholder="Search member"
      emptyText="No member found."
      triggerClassName={triggerClassName}
      testId="member-filter"
    />
  );
}
