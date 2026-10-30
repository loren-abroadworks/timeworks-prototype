"use client";

import * as React from "react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Bug, CircleQuestionMark, Download, LogOut, Palette, UserRound } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { toast } from "@/components/filters/toast";
import { AppearanceDialog } from "./AppearanceDialog";
import { ReportBugDialog } from "./ReportBugDialog";

const CONTENT =
  "text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-100 max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) w-60 p-0 shadow-sm border border-border rounded-md overflow-hidden bg-secondary-surface backdrop-blur-xl";
const ITEM =
  "focus:text-accent-foreground data-[variant=destructive]:text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 px-3 py-2 mx-1 my-0.5 rounded-lg transition-colors";

function Row({ icon, label, className = "text-foreground" }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <p className={cn("text-sm leading-relaxed normal-case whitespace-normal", className)}>{label}</p>
    </div>
  );
}

/**
 * Top-right user chip (avatar ring, name, role) + "ACCOUNT" menu, port of the live profile menu:
 * Profile, Appearance (dialog), Desktop App, Help & FAQs, Report a Bug (dialog), Sign out.
 * Sign out does not log you out in the replica (there is no auth) — it only shows the live toast.
 */
export function UserMenu() {
  const { user, role } = useSession();
  const name = user?.full_name ?? "";
  const [open, setOpen] = React.useState(false);
  const [appearance, setAppearance] = React.useState(false);
  const [bug, setBug] = React.useState(false);

  return (
    <div className="relative flex items-center gap-3">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <div className="flex items-center gap-3 cursor-pointer" data-slot="dropdown-menu-trigger" data-testid="user-chip" role="button" tabIndex={0}>
            <div className="relative" title={user?.profile_image_url ? name : "Upload your profile picture"}>
              <span data-slot="avatar" data-size="default" className="group/avatar flex shrink-0 overflow-hidden select-none size-8 rounded-full relative ring-2 ring-primary ring-offset-2">
                {user?.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img data-slot="avatar-image" src={user.profile_image_url} alt={name} className="aspect-square size-full" />
                ) : (
                  <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs bg-primary text-primary-foreground">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm tracking-wide text-inherit font-semibold normal-case truncate whitespace-normal leading-none">{name}</p>
              <span className="text-xs text-inherit capitalize truncate whitespace-normal leading-none">{role}</span>
            </div>
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} data-slot="dropdown-menu-content" className={CONTENT} data-testid="user-menu">
            <div className="px-3 py-2 border-b border-border">
              <span className="whitespace-normal text-muted-foreground font-medium uppercase text-xs">Account</span>
            </div>
            <div className="py-1">
              <DropdownMenu.Item asChild data-slot="dropdown-menu-item" data-variant="default" className={cn(ITEM, "hover:bg-accent focus:bg-accent")}>
                <Link className="text-foreground w-full" href="/account">
                  <Row icon={<UserRound size={18} className="text-primary" />} label="Profile" />
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                data-slot="dropdown-menu-item"
                data-variant="default"
                className={cn(ITEM, "hover:bg-accent focus:bg-accent")}
                onSelect={(e) => e.preventDefault()}
                onClick={() => {
                  setAppearance(true);
                  setOpen(false);
                }}
              >
                <Row icon={<Palette size={18} className="text-brand" />} label="Appearance" />
              </DropdownMenu.Item>
            </div>
            <div className="border-t border-border py-1">
              <DropdownMenu.Item asChild data-slot="dropdown-menu-item" data-variant="default" className={cn(ITEM, "hover:bg-accent focus:bg-accent")}>
                <Link className="text-foreground w-full" href="/download">
                  <Row icon={<Download size={18} className="text-positive" />} label="Desktop App" />
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild data-slot="dropdown-menu-item" data-variant="default" className={cn(ITEM, "hover:bg-accent focus:bg-accent")}>
                <Link className="text-foreground w-full" href="/faq">
                  <Row icon={<CircleQuestionMark size={18} className="text-brand-teal" />} label="Help & FAQs" />
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                data-slot="dropdown-menu-item"
                data-variant="default"
                className={cn(ITEM, "hover:bg-accent focus:bg-accent")}
                onSelect={(e) => e.preventDefault()}
                onClick={() => {
                  setBug(true);
                  setOpen(false);
                }}
              >
                <Row icon={<Bug size={18} className="text-private" />} label="Report a Bug" />
              </DropdownMenu.Item>
            </div>
            <div className="border-t border-border py-1">
              <DropdownMenu.Item
                data-slot="dropdown-menu-item"
                data-variant="default"
                className={cn(ITEM, "hover:bg-destructive/10 focus:bg-destructive/10")}
                onClick={() => toast("Sign out is disabled in the replica (no login).")}
              >
                <Row icon={<LogOut size={18} className="text-destructive" />} label="Sign out" className="text-destructive font-medium" />
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ReportBugDialog open={bug} onOpenChange={setBug} />
      <AppearanceDialog open={appearance} onOpenChange={setAppearance} />
    </div>
  );
}
