"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShimmerSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayAppName } from "@/lib/format";
import type { AppUsageItem, AppUsageReport } from "@/lib/api-types";
import { EmptyState } from "../shared/EmptyState";
import { TopAppsSheet } from "./TopAppsSheet";

/** "Top Apps & URL's" card on My Dashboard (All / Apps / URLs tabs + View All sheet). */

function UsageList({ items }: { items: AppUsageItem[] }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyState hint="No app or URL activity in this range" />
      ) : (
        rows.map((item, i) => (
          <div key={i} data-testid="app-usage-row">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate mr-4">{`${item.activity_percentage}% - ${displayAppName(item.application_name, item.type)}`}</span>
              <span className="text-sm text-foreground font-medium shrink-0">{item.total_time_spent}</span>
            </div>
            <div className="w-full bg-ui-background rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${item.activity_percentage}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function TopAppsCard({ appUsageReport, isLoading }: { appUsageReport?: AppUsageReport; isLoading?: boolean }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  return (
    <>
      <div className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-6" data-testid="top-apps-card">
        {isLoading ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <ShimmerSkeleton className="h-6 w-40" />
              <ShimmerSkeleton className="h-8 w-48" />
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
          </>
        ) : (
          <Tabs defaultValue="all">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-foreground">Top Apps &amp; URL&apos;s</h2>
              <div className="flex flex-wrap items-center gap-3">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="apps">Apps</TabsTrigger>
                  <TabsTrigger value="urls">URLs</TabsTrigger>
                </TabsList>
                <Button onClick={() => setSheetOpen(true)} kind="secondary" color="surface" size="sm" className="rounded-md" data-testid="top-apps-view-all">
                  View All
                </Button>
              </div>
            </div>
            <TabsContent value="all">
              <UsageList items={appUsageReport?.all ?? []} />
            </TabsContent>
            <TabsContent value="apps">
              <UsageList items={appUsageReport?.apps ?? []} />
            </TabsContent>
            <TabsContent value="urls">
              <UsageList items={appUsageReport?.urls ?? []} />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <TopAppsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
