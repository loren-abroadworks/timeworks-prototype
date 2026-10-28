"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ShimmerSkeleton } from "@/components/ui/skeleton";

export interface StatData {
  title: string;
  value: React.ReactNode;
  image: string;
  /** Money values are blurred until clicked (click outside blurs them again). */
  blurred?: boolean;
}

/** One of the KPI cards at the top of each dashboard (title, big value, illustration). */
export function StatCard({ statsData, isLoading }: { statsData: StatData; isLoading?: boolean }) {
  const [revealed, setRevealed] = React.useState(false);
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!statsData.blurred || !revealed) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setRevealed(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [statsData.blurred, revealed]);

  if (isLoading) {
    return (
      <article className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-4" data-testid="stat-card-loading">
        <ShimmerSkeleton className="h-4 w-32" />
        <div className="flex items-center justify-between flex-wrap-reverse mt-3">
          <ShimmerSkeleton className="h-9 w-24" />
          <ShimmerSkeleton className="w-20 h-16 rounded-xl" />
        </div>
      </article>
    );
  }

  return (
    <article ref={ref} className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-4" data-testid="stat-card">
      <h3 className="text-sm font-medium">{statsData.title}</h3>
      <div className="flex items-center justify-between flex-wrap-reverse">
        <div className="flex flex-col gap-6 justify-between h-full mt-3">
          <h1
            data-testid="stat-value"
            className={cn(
              "text-4xl font-bold text-foreground transition-[filter] duration-200 select-none",
              statsData.blurred && !revealed ? "blur-sm cursor-pointer" : "select-auto",
            )}
            onClick={() => statsData.blurred && !revealed && setRevealed(true)}
          >
            {statsData.value}
          </h1>
        </div>
        <div className="shrink-0 w-20 h-16 flex items-center justify-center">
          <img src={statsData.image} className="size-20 object-contain" alt="Monthly Activity Illustration" />
        </div>
      </div>
    </article>
  );
}
