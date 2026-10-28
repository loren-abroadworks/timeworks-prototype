"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShimmerSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";

export interface ProgressItem {
  caption: string;
  rightValue: React.ReactNode;
  /** Bar width 0-100. */
  percentage: number;
  avatarUrl?: string | null;
}

/**
 * Card with a title, optional "View All" button and a list of rows, each with a thin progress bar.
 * Used by "Projects & Task Tracking", "Weekly Limits" and "Daily Limits".
 */
export function ProgressListCard({
  title,
  data,
  renderItemContent,
  onViewAll,
  isLoading,
  testId,
}: {
  title: string;
  data: ProgressItem[] | undefined;
  renderItemContent?: (item: ProgressItem, index: number) => React.ReactNode;
  onViewAll?: () => void;
  isLoading?: boolean;
  testId?: string;
}) {
  const rows = Array.isArray(data) ? data : [];
  if (isLoading) {
    return (
      <div className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-6" data-testid={testId}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <ShimmerSkeleton className="h-4 w-2/3" />
                <ShimmerSkeleton className="h-4 w-16" />
              </div>
              <ShimmerSkeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-6" data-testid={testId}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {onViewAll && (
          <Button onClick={onViewAll} kind="secondary" color="surface" size="sm" className="rounded-md">
            View All
          </Button>
        )}
      </div>
      {rows.length === 0 ? <EmptyState /> : null}
      <div className="space-y-3">
        {rows.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">{renderItemContent ? renderItemContent(item, i) : item.caption}</div>
              <span className="text-sm text-foreground font-medium shrink-0">{item.rightValue}</span>
            </div>
            <div className="w-full bg-ui-background rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
