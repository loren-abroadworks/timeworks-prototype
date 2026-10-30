"use client";

import * as React from "react";
import Link from "next/link";
import { Accordion } from "radix-ui";
import { ChevronDown, Clock, ExternalLink, Globe } from "lucide-react";
import { useSession } from "@/lib/session";
import type { UrlDomain } from "@/lib/types/activity";
import { cn } from "@/lib/utils";

const TAB_BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer gap-1.5 has-[>svg]:px-2.5 h-7 px-4 text-xs rounded-sm";
const TAB_GHOST = "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 focus-visible:ring-ring/50";
const TAB_BRAND = "bg-brand-blue text-primary-foreground shadow-xs hover:bg-brand-blue/90 focus-visible:ring-brand-blue/30";

/** "My URLs | All URLs" segmented links rendered next to the breadcrumb. */
export function UrlTabs({ active }: { active: "my" | "all" }) {
  const { organizationId } = useSession();
  const org = organizationId ?? 3;
  return (
    <div className="flex items-center gap-1 border border-layout-subtle rounded-md w-fit p-0.5 bg-secondary-surface" data-testid="url-tabs">
      <Link data-slot="button" className={cn(TAB_BASE, active === "my" ? TAB_BRAND : TAB_GHOST)} href={`/organizations/${org}/activities/urls`}>
        My URLs
      </Link>
      <Link data-slot="button" className={cn(TAB_BASE, active === "all" ? TAB_BRAND : TAB_GHOST)} href={`/organizations/${org}/activities/urls/admin_view`}>
        All URLs
      </Link>
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium whitespace-nowrap shrink-0 gap-1 border-ui-border text-foreground", className)}>{children}</span>;
}

const linkCls = "flex items-center gap-1 text-sm text-brand-blue hover:underline";

/**
 * Domain list (Domain / Time Spent header, one accordion row per domain → URL / Project / Task / Time Spent).
 * `variant="my"` = My URLs layout (time + "N links" on the right); `"admin"` = URL management sheet layout.
 */
export function DomainList({ domains, variant }: { domains: UrlDomain[]; variant: "my" | "admin" }) {
  if (domains.length === 0) return <div className="py-12 text-center text-sm text-icon">No results found.</div>;
  const grid = variant === "my" ? "grid-cols-[1fr_1fr_1fr_90px]" : "grid-cols-[1fr_150px_150px_90px] min-w-[640px] sm:min-w-0";
  return (
    <div data-testid="domain-list">
      <div className="flex items-center justify-between border-b border-layout-subtle bg-secondary-surface px-5 py-3">
        <div className="flex items-center gap-1.5 font-semibold text-primary text-sm">
          <Globe className="size-3.5" />
          Domain
        </div>
        <span className="font-semibold text-primary text-sm">Time Spent</span>
      </div>
      {domains.map((d, i) => {
        const last = i === domains.length - 1;
        if (d.urls.length === 1) {
          const u = d.urls[0];
          return (
            <div key={d.domain} className={cn("flex items-center justify-between px-5 py-3 hover:bg-secondary-surface/50 transition-colors", !last && "border-b border-layout-subtle")} data-testid="domain-row">
              <a href={u.url} title={u.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
                <span className="max-w-56 truncate">{d.domain}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <span className="text-sm font-medium text-muted-foreground">{u.time_spent}</span>
            </div>
          );
        }
        return (
          <Accordion.Root key={d.domain} type="single" collapsible className={cn(!last && "border-b border-layout-subtle")}>
            <Accordion.Item value={d.domain} className="border-b-0 group/group">
              <Accordion.Header className="flex">
                <Accordion.Trigger
                  data-testid="domain-row"
                  className={cn(
                    "flex flex-1 items-center justify-between px-5 py-3 hover:bg-secondary-surface/50 hover:no-underline transition-colors cursor-pointer text-left",
                    variant === "my" && "bg-secondary-surface/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-4 text-muted-foreground shrink-0 transition-transform duration-200 -rotate-90 group-data-[state=open]/group:rotate-0" />
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Globe className="size-3.5 text-muted-foreground" />
                      <span className="max-w-56 truncate">{d.domain}</span>
                    </span>
                    {variant === "admin" && <Pill className="text-xs">{d.link_count} links</Pill>}
                  </div>
                  {variant === "admin" ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <Clock className="size-3 shrink-0 text-icon" />
                      {d.total_time}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                        <Clock className="size-3 shrink-0 text-icon" />
                        {d.total_time} Hrs
                      </span>
                      <Pill className="text-xs">{d.link_count} links</Pill>
                    </div>
                  )}
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className={cn("pb-0 overflow-x-auto", variant === "my" ? "bg-secondary-surface/25" : "bg-secondary-surface/40")}>
                <div className={cn("grid items-center gap-3 border-b border-layout-subtle py-2 pl-12 pr-5 text-xs font-semibold text-primary", grid)}>
                  <span>URL</span>
                  <span>Project</span>
                  <span>Task</span>
                  <span className="text-right">Time Spent</span>
                </div>
                {d.urls.map((u, j) => (
                  <div
                    key={`${u.url}-${j}`}
                    className={cn("grid items-center gap-3 py-2.5 pl-12 pr-5 hover:bg-secondary-surface/60 transition-colors", grid, j !== d.urls.length - 1 && "border-b border-layout-subtle")}
                    data-testid="url-row"
                  >
                    <a href={u.url} title={u.url} target="_blank" rel="noopener noreferrer" className={cn(linkCls, "min-w-0")}>
                      <span className="truncate">{u.url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                    {u.project ? <span className="text-sm text-muted-foreground truncate min-w-0">{u.project}</span> : <span className="text-sm text-icon">—</span>}
                    {u.task ? <span className="text-sm text-muted-foreground truncate min-w-0">{u.task}</span> : <span className="text-sm text-icon">—</span>}
                    <span className="text-right text-sm font-medium text-muted-foreground">{u.time_spent}</span>
                  </div>
                ))}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        );
      })}
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded bg-primary/10 dark:bg-primary/15", className)} />;
}

export function DomainListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-layout-subtle bg-secondary-surface px-5 py-3">
        <Skel className="h-4 w-20" />
        <Skel className="h-4 w-16" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-layout-subtle last:border-b-0">
          <Skel className="h-4 w-52" />
          <Skel className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Export rows of domains as CSV rows. */
export function domainCsvRows(date: string, domains: UrlDomain[]) {
  return domains.flatMap((d) => d.urls.map((u) => [date, d.domain, u.url, u.project, u.task, u.time_spent]));
}
