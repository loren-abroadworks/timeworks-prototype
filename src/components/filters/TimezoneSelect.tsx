"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { Timezone } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMMAND_GROUP, COMMAND_ITEM, COMMAND_LIST } from "./styles";

/** The browser's own zone (the live app's "Local time zone"). */
export const browserTimezone = () => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York");

function intlName(tz: string, style: "short" | "long") {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** "EDT" for New York, "PST" (Philippine Standard Time) for Manila — same rule as the live selector. */
export function tzAbbr(tz: string) {
  const short = intlName(tz, "short");
  if (short && !/^GMT|^UTC[+-]/.test(short)) return short;
  const initials = (intlName(tz, "long").match(/\b[A-Z]/g) ?? []).join("");
  return initials || short || tz;
}

/** "Manila, Philippines (PST)" */
export function tzLabel(tz: string, country?: string) {
  const city = (tz.split("/").pop() ?? tz).replace(/_/g, " ");
  const name = country ? `${city}, ${country}` : city;
  return `${name} (${tzAbbr(tz)})`;
}

/** GET /get-timezone — ["TIMEZONE_LISTING"]. */
export function useTimezones() {
  return useApiQuery<Timezone[]>({ endpoint: "/get-timezone", queryKey: ["TIMEZONE_LISTING"] });
}

/**
 * Timezone chip ("EDT ×") + popover: Your / Company / Local time zone shortcuts and a search over all zones.
 */
export function TimezoneSelect({ value, onChange, onClear }: { value: string; onChange: (tz: string) => void; onClear?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { user } = useSession();
  const { data: zones = [] } = useTimezones();
  const country = (tz: string) => zones.find((z) => z.name === tz)?.country_name || (tz === user?.user_time_zone ? user?.timezone.country_name : undefined);
  const local = browserTimezone();
  const company = user?.organizations?.[0]?.organization_time_zone ?? "America/New_York";
  const shortcuts = [
    { group: "Your time zone", tz: user?.user_time_zone ?? company },
    { group: "Company time zone", tz: company },
    { group: "Local time zone", tz: local },
  ];
  const q = search.trim().toLowerCase();
  const matches = q ? zones.filter((z) => `${z.name} ${z.country_name} ${z.abbreviation} ${z.alternative_name}`.toLowerCase().includes(q)) : [];

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger
        type="button"
        role="combobox"
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 border-brand-blue/40 bg-primary-selected-hover text-primary-text"
        title={`${tzLabel(value, country(value))}: ${value}`}
        data-testid="timezone-select"
      >
        <span className="max-w-48 truncate text-left">{tzAbbr(value)}</span>
        {onClear && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            className="-mr-1 flex size-5 cursor-pointer items-center justify-center rounded-full text-primary-text transition-colors hover:bg-brand-blue/20 hover:text-primary-text"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden rounded-2xl border border-border p-0 shadow-xl w-72" data-testid="timezone-popover">
        <Command shouldFilter={false} data-slot="command" className="text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent">
          <div className="p-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder="Search time zones"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onValueChange={setSearch}
              />
            </div>
          </div>
          <Command.List data-slot="command-list" className={COMMAND_LIST}>
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No time zones found.</Command.Empty>
            <Command.Group data-slot="command-group" className={COMMAND_GROUP}>
              {(q ? matches.map((z) => ({ group: "", tz: z.name })) : shortcuts).map((s) => (
                <Command.Item
                  key={`${s.group}-${s.tz}`}
                  value={`${s.group}-${s.tz}`}
                  data-slot="command-item"
                  className={cn(COMMAND_ITEM, "flex-col items-start gap-0.5")}
                  onSelect={() => {
                    onChange(s.tz);
                    setOpen(false);
                  }}
                >
                  {s.group && <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.group}</span>}
                  <span className={cn("w-full truncate text-sm font-medium", s.tz === value ? "text-primary-text" : "text-foreground")}>{tzLabel(s.tz, country(s.tz))}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
