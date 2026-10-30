"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const MENU_CONTENT =
  "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-100 max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md w-72 p-2 shadow-lg border border-ui-border";
const MENU_ITEM =
  "data-[variant=destructive]:text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 px-3 py-2 rounded mx-1 my-0.5 cursor-pointer focus:bg-accent focus:text-accent-foreground";

/**
 * Organization chip at the top of the sidebar ("A" square when collapsed) + dropdown:
 * the user's organizations (✓ current), "Manage organizations" and "Create organization".
 * Like the live app those two navigate to /organizations/active and /organizations/create
 * (both "coming soon" pages in the replica).
 */
export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { user, organizationId, organizationName } = useSession();
  const orgs = user?.organizations ?? [];
  const name = organizationName ?? "Select Organization";
  const label = name.length > 18 ? `${name.slice(0, 18)}...` : name;
  return (
    <div className="w-full px-2 py-1">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <div
            data-slot="dropdown-menu-trigger"
            data-testid="org-switcher"
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center gap-3 cursor-pointer transition-colors rounded-lg border border-ui-border shadow-xs bg-white/30 dark:bg-white/5 backdrop-blur-xl px-2.5 py-2 hover:bg-white/50 dark:hover:bg-white/10",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            <div className="flex items-center gap-3">
              <span data-slot="avatar" data-size="default" title={name} className="group/avatar relative flex shrink-0 overflow-hidden select-none size-8 bg-primary rounded-md">
                <span
                  data-slot="avatar-fallback"
                  className="flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs bg-primary text-primary-foreground font-semibold rounded-md"
                >
                  {name.charAt(0).toUpperCase() || "S"}
                </span>
              </span>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p title={name} className="text-sm leading-relaxed whitespace-normal font-medium text-gray-700 dark:text-gray-200 capitalize">
                    {label}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && <ChevronDown size={12} className={cn("transition-transform duration-200", open && "rotate-180")} />}
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={4} data-slot="dropdown-menu-content" className={MENU_CONTENT} data-testid="org-switcher-menu">
            <div>
              {orgs.map((o) => {
                const current = o.organization_id === organizationId;
                return (
                  <DropdownMenu.Item
                    key={o.organization_id}
                    data-slot="dropdown-menu-item"
                    data-variant="default"
                    className={cn(MENU_ITEM, current && "bg-primary-selected text-primary-text")}
                    onSelect={() => router.push(`/dashboard/${user?.user_id}/my_dashboard`)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <p className="text-sm leading-relaxed whitespace-normal text-foreground capitalize">{o.organization_name}</p>
                      {current && <Check size={16} className="text-primary" />}
                    </div>
                  </DropdownMenu.Item>
                );
              })}
            </div>
            <div className="p-2 mt-1 border-t border-ui-border">
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-3 py-2 mb-1 transition-colors rounded-md cursor-pointer bg-secondary-surface hover:bg-muted"
                onClick={() => {
                  router.push("/organizations/active");
                  setOpen(false);
                }}
              >
                <Building2 size={16} className="text-muted-foreground" />
                <p className="text-sm leading-relaxed normal-case whitespace-normal font-medium text-foreground">Manage organizations</p>
              </div>
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-3 py-2 transition-colors rounded-md cursor-pointer bg-primary-selected hover:bg-primary-selected-hover"
                onClick={() => {
                  setOpen(false);
                  router.push("/organizations/create");
                }}
              >
                <Plus size={16} className="text-primary" />
                <p className="text-sm leading-relaxed normal-case whitespace-normal font-medium text-primary">Create organization</p>
              </div>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
