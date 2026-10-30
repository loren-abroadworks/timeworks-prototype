"use client";

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_MENU_CONTENT, ACTION_MENU_ITEM } from "./styles";

/** The live "⋮" icon (Font Awesome ellipsis-vertical). */
export function DotsIcon({ className = "text-accent-foreground transition-all duration-300" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16" fill="currentColor" className={className}>
      <path d="M320 208C289.1 208 264 182.9 264 152C264 121.1 289.1 96 320 96C350.9 96 376 121.1 376 152C376 182.9 350.9 208 320 208zM320 432C350.9 432 376 457.1 376 488C376 518.9 350.9 544 320 544C289.1 544 264 518.9 264 488C264 457.1 289.1 432 320 432zM376 320C376 350.9 350.9 376 320 376C289.1 376 264 350.9 264 320C264 289.1 289.1 264 320 264C350.9 264 376 289.1 376 320z" />
    </svg>
  );
}

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  /** Hover tint: blue (Excel), red (PDF), default accent. */
  tone?: "blue" | "red" | "default";
  onSelect: () => void;
  testId?: string;
}

const TONES = {
  blue: "hover:bg-blue-50 dark:hover:bg-blue-500/15",
  red: "hover:bg-red-100 dark:hover:bg-red-500/20",
  default: "hover:bg-accent",
};

/**
 * Square toolbar menu button (⋮ or download icon) with an uppercase caption ("EXPORT", "ACTIONS")
 * and icon + label items. Port of the live ActionMenu.
 */
export function ActionMenu({
  label,
  items,
  trigger = "dots",
  testId,
}: {
  label: string;
  items: ActionMenuItem[];
  trigger?: "dots" | "download";
  testId?: string;
}) {
  return (
    <div className="flex justify-end">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <div
            data-slot="action-menu-trigger"
            role="button"
            tabIndex={0}
            data-testid={testId}
            className="transition-all duration-200 flex items-center justify-center cursor-pointer shadow-xs border bg-secondary-surface hover:bg-secondary-surface/50 border-ui-border rounded-lg size-9.5"
          >
            {trigger === "download" ? <Download className="text-accent-foreground transition-all duration-300" size={16} /> : <DotsIcon />}
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} data-slot="dropdown-menu-content" className={ACTION_MENU_CONTENT} data-testid={testId ? `${testId}-content` : undefined}>
            <DropdownMenu.Label data-slot="dropdown-menu-label" className="text-sm font-medium px-3 py-2 border-b border-border">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">{label}</span>
            </DropdownMenu.Label>
            {items.map((it) => (
              <DropdownMenu.Item
                key={it.label}
                data-slot="dropdown-menu-item"
                data-variant="default"
                data-testid={it.testId}
                className={cn(ACTION_MENU_ITEM, TONES[it.tone ?? "default"])}
                onSelect={it.onSelect}
              >
                <div className="flex items-center gap-3">
                  {it.icon}
                  <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{it.label}</span>
                </div>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
