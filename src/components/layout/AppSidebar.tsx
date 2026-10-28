"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSession } from "@/lib/session";
import type { SidebarItem } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildNav, type NavItem } from "./nav-config";

/**
 * Left navigation. Collapsed (icon-only, 5rem) by default like the live app.
 * Toggle with the button at the bottom or Ctrl/⌘ + B.
 */

const MENU_BUTTON_BASE =
  "peer/menu-button gap-2 overflow-hidden p-2 text-left outline-hidden ring-sidebar-ring focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 text-sm flex items-center rounded-lg transition-all duration-150";
const ACTIVE =
  "data-[active=true]:font-medium justify-center size-12 mx-auto bg-primary text-primary-foreground font-semibold [&_svg]:text-primary-foreground hover:bg-primary hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary";
const INACTIVE =
  "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground hover:text-sidebar-accent-foreground justify-center size-12 mx-auto cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10";

function isActive(item: NavItem, path: string): boolean {
  if (item.slug === "dashboard") return path.startsWith("/dashboard");
  if (item.href && path.startsWith(item.href)) return true;
  return item.children.some((c) => isActive(c, path));
}

function ChildLinks({ items, depth = 0, onNavigate }: { items: NavItem[]; depth?: number; onNavigate: () => void }) {
  const path = usePathname();
  return (
    <ul className={cn("flex flex-col gap-0.5", depth > 0 && "ml-3 border-l border-sidebar-border pl-2")}>
      {items.map((c) => (
        <li key={c.id}>
          {c.children.length > 0 ? (
            <>
              <div className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.name}</div>
              <ChildLinks items={c.children} depth={depth + 1} onNavigate={onNavigate} />
            </>
          ) : (
            <Link
              href={c.href || "#"}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-100/80 dark:hover:bg-white/10",
                path === c.href ? "bg-primary text-primary-foreground hover:bg-primary dark:hover:bg-primary" : "text-foreground",
              )}
            >
              {c.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function NavEntry({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const path = usePathname();
  const [open, setOpen] = React.useState(false);
  const active = isActive(item, path);
  const label = expanded ? <span className="ml-2 truncate">{item.name}</span> : null;
  const sizeFix = expanded ? "w-full justify-start px-3! size-auto h-10" : "";

  if (item.children.length === 0) {
    return (
      <li data-slot="collapsible" data-sidebar="menu-item" className="group/menu-item relative group/collapsible" data-state="open">
        <Link className="w-full" href={item.href || "#"}>
          <button
            data-slot="sidebar-menu-button"
            data-sidebar="menu-button"
            data-size="default"
            data-active={active}
            title={item.name}
            className={cn(MENU_BUTTON_BASE, active ? ACTIVE : INACTIVE, sizeFix)}
            style={{ paddingLeft: expanded ? undefined : 0, paddingRight: expanded ? undefined : 0 }}
          >
            <span className="flex shrink-0 justify-center items-center">{item.icon}</span>
            {label}
          </button>
        </Link>
      </li>
    );
  }

  return (
    <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className="group/menu-item relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-sidebar="menu-button"
          data-size="default"
          data-active={active}
          title={item.name}
          className={cn(MENU_BUTTON_BASE, active ? ACTIVE : INACTIVE, sizeFix)}
          style={{ paddingLeft: expanded ? undefined : 0, paddingRight: expanded ? undefined : 0 }}
        >
          <span className="flex justify-center items-center shrink-0">{item.icon}</span>
          {label}
          {expanded && <ChevronRight className="ml-auto size-4 opacity-60" />}
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={12} className="w-60 rounded-xl border-ui-border bg-popover p-2" style={{ width: undefined }}>
          <div className="px-2 pt-1 pb-2 text-sm font-semibold text-foreground">{item.name}</div>
          <ChildLinks items={item.children} onNavigate={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </li>
  );
}

function OrgSwitcher({ expanded }: { expanded: boolean }) {
  const { organizationName } = useSession();
  const letter = (organizationName ?? "A").charAt(0).toUpperCase();
  return (
    <div className="w-full px-2 py-1">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 cursor-pointer transition-colors rounded-lg border border-ui-border shadow-xs bg-white/30 dark:bg-white/5 backdrop-blur-xl px-2.5 py-2 hover:bg-white/50 dark:hover:bg-white/10",
              expanded ? "justify-start" : "justify-center",
            )}
            data-slot="dropdown-menu-trigger"
          >
            <div className="flex items-center gap-3">
              <span data-slot="avatar" data-size="default" className="group/avatar relative flex shrink-0 overflow-hidden select-none size-8 bg-primary rounded-md">
                <span data-slot="avatar-fallback" className="flex size-full items-center justify-center text-sm bg-primary text-primary-foreground font-semibold rounded-md">
                  {letter}
                </span>
              </span>
              {expanded && <span className="truncate text-sm font-semibold">{organizationName}</span>}
            </div>
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side="right" align="start" sideOffset={10} className="z-110 min-w-56 rounded-xl border border-ui-border bg-popover p-1.5 text-popover-foreground shadow-md">
            <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">Organizations</DropdownMenu.Label>
            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-white/10">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">{letter}</span>
              {organizationName}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export function AppSidebar() {
  const { organizationId, userId } = useSession();
  const [expanded, setExpanded] = React.useState(false);
  const { data, isLoading } = useApiQuery<SidebarItem[]>({
    endpoint: endpoints.user.sidebar.endpoint(organizationId ?? 0),
    queryKey: endpoints.user.sidebar.queryKey(organizationId ?? 0),
    enabled: !!organizationId,
  });
  const items = React.useMemo(() => (data && userId && organizationId ? buildNav(data, userId, organizationId) : []), [data, userId, organizationId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setExpanded((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const state = expanded ? "expanded" : "collapsed";

  return (
    <div className="relative z-60 shrink-0 md:min-w-20">
      <div
        className="group peer text-sidebar-foreground hidden md:block"
        data-state={state}
        data-collapsible={expanded ? "" : "icon"}
        data-variant="sidebar"
        data-side="left"
        data-slot="sidebar"
      >
        <div
          data-slot="sidebar-gap"
          className="relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180 group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        />
        <div
          data-slot="sidebar-container"
          className="inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=right]:border-l max-h-screen min-w-20 relative border-r-0 group-data-[side=left]:border-r-0 **:data-[slot=sidebar-inner]:bg-transparent"
          style={{ minWidth: "5rem" }}
        >
          <div
            data-sidebar="sidebar"
            data-slot="sidebar-inner"
            className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
          >
            <div data-slot="sidebar-header" data-sidebar="header" className="flex flex-col gap-2 p-2 py-3">
              <img
                alt="TimeWorks Logo"
                src="/logo-icon.svg"
                style={{ transition: "0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                className={cn("h-14 mx-auto", expanded ? "hidden pointer-events-none opacity-0 scale-95" : "block pointer-events-auto opacity-100 scale-100")}
              />
              <img
                alt="TimeWorks Logo"
                src="/logo-fc.svg"
                style={{ transition: "0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                className={cn("h-10 px-4", expanded ? "block pointer-events-auto opacity-100 scale-100" : "hidden pointer-events-none opacity-0 scale-95")}
              />
            </div>
            <div
              data-slot="sidebar-content"
              data-sidebar="content"
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
            >
              <OrgSwitcher expanded={expanded} />
              {isLoading || items.length === 0 ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="skeleton-shimmer size-10 rounded-lg bg-primary/10 dark:bg-primary/15 mx-auto shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div data-slot="sidebar-group" data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
                  <ul data-slot="sidebar-menu" data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1">
                    {items.map((item) => (
                      <NavEntry key={item.id} item={item} expanded={expanded} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div data-slot="sidebar-footer" data-sidebar="footer" className="flex flex-col gap-2 p-2 pb-3">
              <div className="hidden md:flex border-t border-white/50 dark:border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                  title={`${expanded ? "Collapse" : "Expand"} sidebar (Ctrl + B)`}
                  className={cn(
                    "group flex size-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    expanded ? "ml-auto" : "mx-auto",
                  )}
                >
                  {expanded ? (
                    <PanelLeftClose className="size-4.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  ) : (
                    <PanelLeftOpen className="size-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
