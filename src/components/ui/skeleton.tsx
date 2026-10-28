import { cn } from "@/lib/utils";

/** Shimmering placeholder used by the dashboard cards while data loads. */
export function ShimmerSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md bg-primary/10 dark:bg-primary/15", className)} />;
}

/** Pulsing placeholder used inside the Manager View tables while loading. */
export function Skeleton({ className, variant = "rect" }: { className?: string; variant?: "rect" | "text" | "circle" }) {
  const v = { rect: "rounded-md", text: "h-4 w-full rounded", circle: "size-10 rounded-full" }[variant];
  return <div data-slot="skeleton" className={cn("animate-pulse bg-gray-300 dark:bg-accent", v, className)} />;
}
