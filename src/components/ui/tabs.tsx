"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Tabs — "pill" style segmented control used across the dashboard (e.g. All / Apps / URLs). */

type Variant = "pill" | "line" | "plain";
type Size = "sm" | "md" | "lg";

const TabsCtx = React.createContext<{ variant: Variant; size: Size; stretched: boolean }>({ variant: "pill", size: "md", stretched: false });

const listHeight: Record<Size, string> = { sm: "h-8", md: "h-9", lg: "h-10" };
const triggerSize: Record<Size, string> = { sm: "h-6 px-3", md: "h-7 px-4", lg: "h-8 px-5" };
const textSize: Record<Size, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function TabsList({
  className,
  variant = "pill",
  size = "md",
  stretched = false,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: Variant; size?: Size; stretched?: boolean }) {
  return (
    <TabsCtx.Provider value={{ variant, size, stretched }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-stretched={stretched}
        className={cn(
          variant !== "plain" && "inline-flex items-center",
          variant !== "plain" && stretched && "flex w-full",
          variant === "pill" && cn("border border-ui-border bg-secondary-surface p-0.5 text-foreground rounded-md", listHeight[size]),
          variant === "line" && "gap-4 border-b border-border text-muted-foreground",
          !stretched && variant === "pill" && "w-fit max-w-full overflow-x-auto",
          className,
        )}
        {...props}
      />
    </TabsCtx.Provider>
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { variant, size, stretched } = React.useContext(TabsCtx);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        textSize[size],
        stretched && "flex-1",
        variant === "pill" &&
          cn("rounded-sm dark:data-[state=inactive]:text-foreground", triggerSize[size], "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"),
        variant === "line" && "-mb-px border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}
