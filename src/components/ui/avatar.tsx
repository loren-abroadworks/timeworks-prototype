"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Avatar with image + initial fallback. */

export function Avatar({
  className,
  size = "default",
  shape = "circle",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & { size?: "sm" | "default" | "md" | "lg"; shape?: "circle" | "square" }) {
  const sizes = { sm: "size-6", default: "size-8", md: "size-8", lg: "size-10" };
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn("group/avatar relative flex shrink-0 overflow-hidden select-none", sizes[size], shape === "circle" ? "rounded-full" : "rounded-md", className)}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}
