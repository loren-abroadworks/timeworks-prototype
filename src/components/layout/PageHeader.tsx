"use client";

import * as React from "react";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

/** One breadcrumb part; `href: "@dashboard"` links to the logged-in user's dashboard. Without href it renders as the (non-link) page label. */
export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb ("Dashboard / Activity / Screenshots") on the left, user chip (avatar, name, role) on the right. */
export function PageHeader({ title, crumbs, headerSlot, className }: { title: string; crumbs?: Crumb[]; headerSlot?: React.ReactNode; className?: string }) {
  const { userId } = useSession();
  const parts: Crumb[] = crumbs ?? [{ label: title }];
  return (
    <div className={cn("font-karla rounded-none! flex justify-between items-center w-full flex-wrap overflow-x-hidden max-w-full", className)}>
      <div className="flex items-center gap-2">
        <nav aria-label="breadcrumb" data-slot="breadcrumb">
          <ol data-slot="breadcrumb-list" className="flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground">
            {parts.map((c, i) => (
              <React.Fragment key={`${c.label}-${i}`}>
                {i > 0 && (
                  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className="text-muted-foreground/60 select-none">
                    /
                  </li>
                )}
                <li data-slot="breadcrumb-item" className="inline-flex items-center gap-1.5 text-base">
                  {c.href ? (
                    <Link data-slot="breadcrumb-link" className="transition-colors hover:text-foreground" href={c.href === "@dashboard" ? `/dashboard/${userId ?? ""}/my_dashboard` : c.href}>
                      {c.label}
                    </Link>
                  ) : (
                    <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className="font-medium text-foreground">
                      {c.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            ))}
          </ol>
        </nav>
        {headerSlot}
      </div>
      <UserMenu />
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
