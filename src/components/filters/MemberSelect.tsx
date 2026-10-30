"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, Search, X } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { MemberOption } from "@/lib/api-types";
import { cn, initials } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHIP_ACTIVE, CHIP_IDLE, COMMAND_GROUP, COMMAND_ITEM, COMMAND_LIST } from "./styles";

/** GET /all/user/{org} — query key ["All","MEMBERS",{organizationId}] like the live app. */
export function useMembers() {
  const { organizationId } = useSession();
  return useApiQuery<MemberOption[]>({
    endpoint: `/all/user/${organizationId}`,
    queryKey: ["All", "MEMBERS", { organizationId }],
    enabled: !!organizationId,
  });
}

/** Small round avatar with initials ("KT"), used by chips and lists. */
export function InitialsAvatar({ name, src, className, textClassName = "text-[9px]" }: { name: string; src?: string | null; className?: string; textClassName?: string }) {
  return (
    <span data-slot="avatar" data-size="sm" className={cn("group/avatar relative flex shrink-0 overflow-hidden select-none rounded-full size-5", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-slot="avatar-image" src={src} alt={name} className="aspect-square size-full object-cover" />
      ) : (
        <span data-slot="avatar-fallback" className={cn("flex size-full items-center justify-center rounded-full group-data-[size=sm]/avatar:text-xs bg-primary font-semibold text-primary-foreground", textClassName)}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/**
 * Member chip + "Filter by user" popover (search by name / email, ✓ on the selected member).
 * The × clears the selection (pages then fall back to the logged-in user).
 */
export function MemberSelect({
  value,
  onChange,
  onClear,
  title = "Filter by user",
}: {
  value: string | null | undefined;
  onChange: (member: MemberOption) => void;
  onClear?: () => void;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { data: members = [] } = useMembers();
  const selected = members.find((m) => m.user_id === value);
  const q = search.toLowerCase();
  const list = members.filter((m) => !q || m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger
        type="button"
        role="combobox"
        className={selected ? CHIP_ACTIVE : CHIP_IDLE}
        title={selected?.full_name ?? "Select member"}
        data-testid="member-select"
      >
        {selected ? (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <InitialsAvatar name={selected.full_name} src={selected.profile_image_url} />
              <span title={selected.full_name} className="min-w-24 max-w-36 truncate text-left">
                {selected.full_name}
              </span>
            </span>
            {onClear && (
              <span className="flex items-center gap-1.5">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear selection"
                  className="-mr-1 flex size-5 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-primary/20 hover:text-primary-text"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                >
                  <X className="size-3.5" />
                </span>
              </span>
            )}
          </>
        ) : (
          <span className="truncate text-left">Member</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 rounded-2xl border border-border shadow-xl overflow-hidden min-w-56" style={{ width: 256 }} data-testid="member-select-popover">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <button type="button" className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Close" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </button>
        </div>
        <Command shouldFilter={false} data-slot="command" className="text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent">
          <div className="p-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder="Search user"
                title="Search by name or email"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onValueChange={setSearch}
              />
            </div>
          </div>
          <Command.List data-slot="command-list" className={COMMAND_LIST}>
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No users found.</Command.Empty>
            <Command.Group data-slot="command-group" className={COMMAND_GROUP}>
              {list.map((m) => (
                <Command.Item
                  key={m.user_id}
                  value={m.user_id}
                  title={m.email}
                  data-slot="command-item"
                  className={COMMAND_ITEM}
                  onSelect={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  <InitialsAvatar name={m.full_name} src={m.profile_image_url} className="size-6" textClassName="text-[10px]" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-foreground">{m.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                  </span>
                  {m.user_id === value && <Check className="ml-auto stroke-3 text-primary" />}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
