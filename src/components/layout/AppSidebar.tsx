"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible, Tooltip } from "radix-ui";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSession } from "@/lib/session";
import type { SidebarItem } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildNav, type NavItem } from "./nav-config";
import { OrgSwitcher } from "./OrgSwitcher";

/**
 * Left navigation — port of the live sidebar (chunk 0i7-oioajdo5v.js).
 *  - Expanded (16rem): logo wordmark, org chip, accordion sections (several can be open, the section that
 *    contains the current page starts open), Settings › Organization / Employees as a second accordion level.
 *  - Collapsed (5rem, the default like the live app): icon buttons; clicking one opens a flyout popover.
 * Toggle with the footer button or Ctrl/⌘ + B; the choice is remembered in localStorage ("sidebar_state").
 */

const STORAGE_KEY = "sidebar_state";

/** shadcn SidebarMenuButton base (size "default"); page-specific classes are merged on top with tailwind-merge like the live app. */
const MENU_BUTTON =
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 h-8 text-sm";
const SUB_BUTTON =
  "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground text-sm group-data-[collapsible=icon]:hidden";
const MENU_SUB = "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden";

/** Active page (live constant "m"). */
const ACTIVE =
  "bg-primary text-primary-foreground font-semibold [&_svg]:text-primary-foreground hover:bg-primary hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary";
/** Expanded section that contains the active page (live constant "f"). */
const ACTIVE_PARENT = "bg-primary/8 text-primary font-semibold [.dark[data-accent=black]_&]:bg-white/15";
const IDLE = "text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10";

/* Collapsed buttons use the exact class strings captured from the live DOM. */
const COLLAPSED_BASE =
  "peer/menu-button gap-2 overflow-hidden p-2 text-left outline-hidden ring-sidebar-ring focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 text-sm flex justify-center items-center size-12 mx-auto rounded-lg transition-all duration-150";
const COLLAPSED_ACTIVE = `data-[active=true]:font-medium ${ACTIVE}`;
const COLLAPSED_IDLE =
  "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground hover:text-sidebar-accent-foreground cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/10";

const isOn = (href: string, path: string) => !!href && path.startsWith(href);
function isActive(item: NavItem, path: string): boolean {
  if (item.slug === "dashboard") return path.startsWith("/dashboard");
  if (item.children.length === 0) return isOn(item.href, path);
  return item.children.some((c) => isActive(c, path));
}

/* ------------------------------------------------------------------ */
/* Expanded                                                            */
/* ------------------------------------------------------------------ */

function ExpandedSection({ item, path }: { item: NavItem; path: string }) {
  const active = isActive(item, path);
  const [open, setOpen] = React.useState(active);
  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);
  return (
    <Collapsible.Root asChild open={open} onOpenChange={setOpen}>
      <li data-slot="collapsible" data-sidebar="menu-item" className="group/menu-item relative group/collapsible">
        <Collapsible.Trigger
          data-slot="collapsible-trigger"
          data-sidebar="menu-button"
          data-size="default"
          data-active={active}
          data-testid={`nav-${item.slug}`}
          className={cn(MENU_BUTTON, "hover:text-sidebar-accent-foreground cursor-pointer transition-all duration-150 flex items-center rounded-lg", active ? ACTIVE_PARENT : IDLE)}
        >
          <span className="flex shrink-0 mr-2">{item.icon}</span>
          <span>{item.name}</span>
          <ChevronRight className="ml-auto size-3! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </Collapsible.Trigger>
        <Collapsible.Content data-slot="collapsible-content">
          <ul data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={MENU_SUB}>
            {item.children.map((c) => (c.children.length > 0 ? <ExpandedSubGroup key={c.id} item={c} path={path} /> : <SubLink key={c.id} item={c} path={path} />))}
          </ul>
        </Collapsible.Content>
      </li>
    </Collapsible.Root>
  );
}

function SubLink({ item, path, nowrap }: { item: NavItem; path: string; nowrap?: boolean }) {
  const on = isOn(item.href, path);
  return (
    <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className="group/menu-sub-item relative">
      <Link
        data-slot="sidebar-menu-sub-button"
        data-sidebar="menu-sub-button"
        data-size="md"
        data-active={on}
        href={item.href || "#"}
        className={cn(SUB_BUTTON, "transition-all duration-150 rounded-md", nowrap && "whitespace-nowrap", on && ACTIVE)}
      >
        {item.name}
      </Link>
    </li>
  );
}

function ExpandedSubGroup({ item, path }: { item: NavItem; path: string }) {
  const active = item.children.some((c) => isOn(c.href, path));
  const [open, setOpen] = React.useState(active);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} data-slot="collapsible" className="group/subcollapsible">
      <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className="group/menu-sub-item relative">
        <Collapsible.Trigger asChild>
          <a
            data-slot="collapsible-trigger"
            data-sidebar="menu-sub-button"
            data-size="md"
            data-active={active}
            role="button"
            className={cn(SUB_BUTTON, "cursor-pointer transition-all duration-150 rounded-md", active && ACTIVE_PARENT)}
          >
            <span>{item.name}</span>
            <ChevronRight className="ml-auto size-3! transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
          </a>
        </Collapsible.Trigger>
        <Collapsible.Content data-slot="collapsible-content">
          <ul data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={MENU_SUB}>
            {item.children.map((c) => (
              <SubLink key={c.id} item={c} path={path} nowrap />
            ))}
          </ul>
        </Collapsible.Content>
      </li>
    </Collapsible.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsed                                                           */
/* ------------------------------------------------------------------ */

const FLYOUT_LINK = "px-2.5 py-2 rounded-lg text-sm transition-all duration-150";
const FLYOUT_IDLE = "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";

function CollapsedSection({ item, path }: { item: NavItem; path: string }) {
  const [open, setOpen] = React.useState(false);
  const active = isActive(item, path);
  const close = () => setOpen(false);
  return (
    <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className="group/menu-item relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-sidebar="menu-button"
          data-size="default"
          data-active={active}
          title={item.name}
          data-testid={`nav-${item.slug}`}
          className={cn(COLLAPSED_BASE, "cursor-pointer", active ? COLLAPSED_ACTIVE : COLLAPSED_IDLE)}
          style={{ paddingLeft: 0, paddingRight: 0 }}
        >
          <span className="flex justify-center items-center shrink-0">{item.icon}</span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={12}
          className="relative w-52 p-2 rounded-xl shadow-sm border border-gray-200/80 dark:border-white/10 overflow-visible"
          style={{ width: "13rem" }}
          data-testid="nav-flyout"
        >
          <div className="absolute left-0 top-3.5 -translate-x-1/2 rotate-45 size-2.5 bg-white dark:bg-popover border-l border-b border-gray-200/80 dark:border-white/10" />
          <div className="flex items-center gap-2 px-2.5 py-2 mb-1 border-b border-gray-100 dark:border-white/10">
            <span className="flex shrink-0 text-primary">
              {React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 14, className: "text-primary" }) : null}
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {item.children.map((c) =>
              c.children.length > 0 ? (
                <div key={c.id} className="mb-1">
                  <div className="px-2.5 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.name}</div>
                  {c.children.map((g) => (
                    <Link key={g.id} href={g.href || "#"} onClick={close} className={cn("block", FLYOUT_LINK, isOn(g.href, path) ? ACTIVE : FLYOUT_IDLE)}>
                      {g.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={c.id} href={c.href || "#"} onClick={close} className={cn(FLYOUT_LINK, isOn(c.href, path) ? ACTIVE : FLYOUT_IDLE)}>
                  {c.name}
                </Link>
              ),
            )}
          </div>
        </PopoverContent>
      </Popover>
    </li>
  );
}

/** Top-level link without children (Dashboard). */
function LeafEntry({ item, path, expanded }: { item: NavItem; path: string; expanded: boolean }) {
  const active = isActive(item, path);
  return (
    <li data-slot="collapsible" data-sidebar="menu-item" className="group/menu-item relative group/collapsible" data-state={active ? "open" : "closed"}>
      <Link className="w-full" href={item.href || "#"} data-testid={`nav-${item.slug}`}>
        <span
          data-slot="sidebar-menu-button"
          data-sidebar="menu-button"
          data-size="default"
          data-active={active}
          title={expanded ? undefined : item.name}
          className={
            expanded
              ? cn(MENU_BUTTON, "transition-all duration-150 flex items-center rounded-lg", active ? ACTIVE : IDLE)
              : cn(COLLAPSED_BASE, active ? COLLAPSED_ACTIVE : COLLAPSED_IDLE)
          }
          style={expanded ? undefined : { paddingLeft: 0, paddingRight: 0 }}
        >
          <span className={cn("flex shrink-0", expanded ? "mr-2" : "justify-center items-center")}>{item.icon}</span>
          {expanded && <span>{item.name}</span>}
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const SKELETON = [0, 3, 0, 4, 0, 2, 0, 0, 0, 0];
const SKELETON_W = ["w-4/5", "w-3/5", "w-11/12", "w-2/3"];

export function AppSidebar() {
  const { organizationId, userId } = useSession();
  const path = usePathname();
  const [expanded, setExpanded] = React.useState(false);
  const { data, isLoading } = useApiQuery<SidebarItem[]>({
    endpoint: endpoints.user.sidebar.endpoint(organizationId ?? 0),
    queryKey: endpoints.user.sidebar.queryKey(organizationId ?? 0),
    enabled: !!organizationId,
  });
  const items = React.useMemo(() => (data && userId && organizationId ? buildNav(data, userId, organizationId) : []), [data, userId, organizationId]);

  // Restore the remembered state after mount (server render is always collapsed → no hydration mismatch).
  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "expanded") setExpanded(true);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = React.useCallback(() => {
    setExpanded((v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v ? "collapsed" : "expanded");
      } catch {
        /* ignore */
      }
      return !v;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const state = expanded ? "expanded" : "collapsed";

  return (
    <div className="relative z-60 shrink-0 md:min-w-20" data-testid="app-sidebar" data-state={state}>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="TimeWorks Logo"
                src="/logo-icon.svg"
                style={{ transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                className={cn("h-14 mx-auto", expanded ? "hidden pointer-events-none opacity-0 scale-95" : "block pointer-events-auto opacity-100 scale-100")}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="TimeWorks Logo"
                src="/logo-fc.svg"
                style={{ transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                className={cn("h-10 px-4", expanded ? "block pointer-events-auto opacity-100 scale-100" : "hidden pointer-events-none opacity-0 scale-95")}
              />
            </div>
            <div
              data-slot="sidebar-content"
              data-sidebar="content"
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
            >
              <OrgSwitcher collapsed={!expanded} />
              {isLoading || items.length === 0 ? (
                <div className="space-y-2 p-3">
                  {SKELETON.map((n, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex gap-3 items-center">
                        <div className="skeleton-shimmer size-10 rounded-lg bg-primary/10 dark:bg-primary/15 mx-auto shrink-0" />
                        {expanded && <div className="skeleton-shimmer h-8 w-full rounded-md bg-primary/10 dark:bg-primary/15" />}
                      </div>
                      {expanded && n > 0 && (
                        <div className="mx-3.5 flex flex-col gap-1.5 border-l border-sidebar-border pl-3.5 py-0.5">
                          {Array.from({ length: n }).map((_, j) => (
                            <div key={j} className={cn("skeleton-shimmer h-5 rounded-md bg-primary/10 dark:bg-primary/15", SKELETON_W[j % SKELETON_W.length])} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div data-slot="sidebar-group" data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
                  <ul data-slot="sidebar-menu" data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1" data-testid="sidebar-menu">
                    {items.map((item) =>
                      item.children.length === 0 ? (
                        <LeafEntry key={item.id} item={item} path={path} expanded={expanded} />
                      ) : expanded ? (
                        <ExpandedSection key={item.id} item={item} path={path} />
                      ) : (
                        <CollapsedSection key={item.id} item={item} path={path} />
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div data-slot="sidebar-footer" data-sidebar="footer" className="flex flex-col gap-2 p-2 pb-3">
              <div className="hidden md:flex border-t border-white/50 dark:border-white/10 pt-2">
                <Tooltip.Provider delayDuration={300}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        onClick={toggle}
                        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                        data-testid="sidebar-toggle"
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
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="right"
                        sideOffset={6}
                        className="z-120 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95"
                      >
                        <span className="flex items-center gap-1.5">
                          {expanded ? "Collapse" : "Expand"} sidebar
                          <kbd className="rounded border border-background/30 px-1 py-px font-mono text-[10px] leading-4">⌘/Ctrl + B</kbd>
                        </span>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
