"use client";

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { LogOut, PanelLeft, UserRound } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Breadcrumb ("Dashboard") on the left, user chip (avatar, name, role) on the right. */
export function PageHeader({ title, className }: { title: string; className?: string }) {
  const { user, role } = useSession();
  const name = user?.full_name ?? "";
  return (
    <div className={cn("font-karla rounded-none! flex justify-between items-center w-full flex-wrap overflow-x-hidden max-w-full", className)}>
      <div className="flex items-center gap-2">
        <nav aria-label="breadcrumb" data-slot="breadcrumb">
          <ol data-slot="breadcrumb-list" className="flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground">
            <li data-slot="breadcrumb-item" className="inline-flex items-center gap-1.5 text-base">
              <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className="font-medium text-foreground">
                {title}
              </span>
            </li>
          </ol>
        </nav>
      </div>
      <div className="relative flex items-center gap-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <div className="flex items-center gap-3 cursor-pointer" data-slot="dropdown-menu-trigger" data-testid="user-chip">
              <div className="relative">
                <span data-slot="avatar" data-size="default" className="group/avatar flex shrink-0 overflow-hidden select-none size-8 rounded-full relative ring-2 ring-primary ring-offset-2">
                  <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs bg-primary text-primary-foreground">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm tracking-wide text-inherit font-semibold normal-case truncate whitespace-normal leading-none">{name}</p>
                <span className="text-xs text-inherit capitalize truncate whitespace-normal leading-none">{role}</span>
              </div>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={10} className="z-110 min-w-56 rounded-xl border border-ui-border bg-popover p-1.5 text-popover-foreground shadow-md font-karla">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-white/10">
                <UserRound className="size-4" /> Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-white/10">
                <LogOut className="size-4" /> Log out (disabled in replica)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

/** Mobile-only sidebar toggle (hidden from md breakpoint up, as in the live app). */
export function MobileSidebarTrigger() {
  return (
    <button
      data-slot="sidebar-trigger"
      data-sidebar="trigger"
      className="items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all shrink-0 outline-none rounded-lg hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-8 flex border shadow-md cursor-pointer md:hidden"
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}
