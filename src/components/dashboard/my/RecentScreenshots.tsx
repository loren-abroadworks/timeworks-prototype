"use client";

import * as React from "react";
import Link from "next/link";
import { Ellipsis, Eye, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShimmerSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import type { ScreenshotsResponse } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { ScreenshotViewer, type ViewerShot } from "./ScreenshotViewer";

/**
 * "Recent Screenshots" on My Dashboard.
 *  - "Every ten minutes": the latest 2 hours, each with 6 ten-minute slots (empty slots show "No Activity").
 *  - "All screenshots":  every screenshot captured in those 2 hours.
 * Each hour group has a timeline dot/checkbox that selects all its cards; cards have their own checkbox on hover.
 * Clicking a card opens the full-screen viewer.
 */

type ViewMode = "every_ten_minutes" | "all_records";

const timeFmt = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", hour12: true });
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function rangeLabel(hhmm: string, addMinutes: number) {
  try {
    const [h, m] = hhmm.split(":").map(Number);
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0);
    const b = new Date(a);
    b.setMinutes(a.getMinutes() + addMinutes);
    return `${timeFmt.format(a)} – ${timeFmt.format(b)}`;
  } catch {
    return hhmm;
  }
}

/** "2026-10-29 02:03:12 PM" -> "02:03 PM" */
function capturedLabel(value: string) {
  const parts = value.trim().split(" ");
  if (parts.length >= 3) {
    const [h, m] = parts[1].split(":");
    const base = `${h}:${m} ${parts[2]}`;
    return parts[3] ? `${base} ${parts[3]}` : base;
  }
  return value;
}

interface CardItem {
  key: string;
  id: number | null;
  percentage: number;
  timeRange: string;
  src: string | null;
  isEmpty: boolean;
  viewerIndex: number | null;
  project: string | null;
}

function ScreenshotCard({
  item,
  index,
  isSelected,
  onClick,
  onToggle,
}: {
  item: CardItem;
  index: number;
  isSelected: boolean;
  onClick?: () => void;
  onToggle?: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  if (item.isEmpty) {
    return (
      <div className="space-y-2 opacity-60" data-testid="screenshot-empty-slot">
        <div className="flex justify-between">
          <h6 className="font-semibold text-muted-foreground">No Activity</h6>
        </div>
        <div className="relative w-full rounded-md overflow-hidden border-2 border-dashed border-gray-200 bg-linear-to-br from-gray-50 to-gray-100 aspect-video flex flex-col items-center justify-center gap-1.5">
          <div className="bg-gray-200 rounded-full p-2.5">
            <ImageOff className="size-4 text-icon" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">No Screenshot</span>
        </div>
        <div className="px-2 pb-2 space-y-2">
          <div className="h-1.5 bg-gray-100 w-full rounded-full" />
          <div className="flex justify-end font-medium items-end text-xs text-muted-foreground">
            <span>{item.timeRange}</span>
          </div>
        </div>
      </div>
    );
  }
  const title = item.project || `Screenshot - ${index + 1}`;
  const p = item.percentage;
  return (
    <div className="space-y-2" data-testid="screenshot-card">
      <div className="flex justify-between">
        <h6 className="font-semibold truncate" title={title}>
          {title}
        </h6>
        <span className="bg-gray-300 size-6 flex items-center justify-center rounded-sm shadow-sm">
          <Ellipsis size={16} />
        </span>
      </div>
      <div
        className="relative w-full rounded-md overflow-hidden cursor-pointer group border-2 border-gray-300 shadow-sm"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        data-testid="screenshot-thumb"
      >
        {(hover || isSelected) && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle?.()}
            shape="circle"
            variant="brand"
            className="absolute top-2 left-2 z-20"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <img src={item.src || ""} height={100} width={200} alt="ssc" className="w-full rounded-md" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-black/60 rounded-full p-2">
            <Eye className="size-3 text-white" />
          </div>
        </div>
      </div>
      <div className="px-2 pb-2 space-y-2">
        <div className="h-1.5 bg-gray-100 w-full rounded-full">
          <div className={cn("min-h-full rounded-full", p >= 50 ? "bg-green-500" : p >= 35 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${p}%` }} />
        </div>
        <div className="flex justify-between font-medium items-end text-xs">
          <span>Activity - {p}%</span>
          <span>{item.timeRange}</span>
        </div>
      </div>
    </div>
  );
}

export function RecentScreenshots() {
  const { user_time_zone, userId, organizationId } = useSession();
  const { get } = useQueryParams();
  const [mode, setMode] = React.useState<ViewMode>("every_ten_minutes");
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);
  const [selectedGroups, setSelectedGroups] = React.useState<Set<number>>(new Set());
  const [selectedCards, setSelectedCards] = React.useState<Set<string>>(new Set());
  const date = get("ss_date") || todayIso();
  const query = new URLSearchParams({ activity_date: date, timezone: user_time_zone || browserTz(), view_mode: mode, ...(userId ? { user_id: userId } : {}) }).toString();
  const { data, isLoading } = useApiQuery<ScreenshotsResponse>({
    endpoint: endpoints.screenshots.dashboard.endpoint(organizationId ?? 0, query),
    queryKey: endpoints.screenshots.dashboard.queryKey(organizationId ?? 0, query),
    enabled: !!organizationId,
  });

  const { groups, viewerShots } = React.useMemo(() => {
    if (!data) return { groups: [] as { label: string; items: CardItem[] }[], viewerShots: [] as ViewerShot[] };
    let counter = 0;
    let groups: { label: string; items: CardItem[] }[];
    if (mode === "every_ten_minutes") {
      const hours = [...(data.hourly_slots ?? [])].sort((a, b) => b.hour_slot.localeCompare(a.hour_slot)).slice(0, 2).reverse();
      groups = hours
        .map((h) => {
          const bySlot = new Map((h.ten_minute_slots ?? []).map((s) => [s.time_slot, s]));
          const hour = String(Number(h.hour_slot.split(":")[0]) || 0).padStart(2, "0");
          const items = [0, 10, 20, 30, 40, 50].map((m) => {
            const slotKey = `${hour}:${String(m).padStart(2, "0")}`;
            const slot = bySlot.get(slotKey);
            const has = !!(slot && slot.screenshots.length > 0);
            const item: CardItem = {
              key: has ? String(slot!.screenshots[0].id) : `empty-${slotKey}`,
              id: has ? slot!.screenshots[0].id : null,
              percentage: slot?.activity_percentage ?? 0,
              timeRange: rangeLabel(slotKey, 10),
              src: has ? slot!.screenshots[0].url : null,
              isEmpty: !has,
              viewerIndex: has ? counter : null,
              project: has ? slot!.screenshots[0].project : null,
            };
            if (has) counter++;
            return item;
          });
          return { label: rangeLabel(h.hour_slot, 60), items };
        })
        .filter((g) => g.items.some((i) => !i.isEmpty));
    } else {
      const buckets = [...(data.hourly_buckets ?? [])].sort((a, b) => b.hour_slot.localeCompare(a.hour_slot)).slice(0, 2).reverse();
      groups = buckets
        .map((b) => ({
          label: rangeLabel(b.hour_slot, 60),
          items: (b.screenshots ?? []).map((s) => {
            const item: CardItem = { key: String(s.id), id: s.id, percentage: 0, timeRange: capturedLabel(s.captured_at_user_tz), src: s.url, isEmpty: false, viewerIndex: counter, project: s.project };
            counter++;
            return item;
          }),
        }))
        .filter((g) => g.items.length > 0);
    }
    const viewerShots = groups.flatMap((g) => g.items.filter((i) => !i.isEmpty).map((i) => ({ id: i.id, percentage: i.percentage, timeSlot: i.timeRange, src: i.src, date })));
    return { groups, viewerShots };
  }, [data, mode, date]);

  const toggleGroup = (gi: number) => {
    const ids = groups[gi]?.items.filter((i) => i.id !== null).map((i) => `${gi}-${i.id}`) ?? [];
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      const on = !next.has(gi);
      if (on) next.add(gi);
      else next.delete(gi);
      setSelectedCards((cards) => {
        const c = new Set(cards);
        ids.forEach((id) => (on ? c.add(id) : c.delete(id)));
        return c;
      });
      return next;
    });
  };

  const toggleCard = (gi: number, id: number) => {
    const key = `${gi}-${id}`;
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-6" data-testid="recent-screenshots">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Screenshots</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="every_ten_minutes">Every ten minutes</TabsTrigger>
              <TabsTrigger value="all_records">All screenshots</TabsTrigger>
            </TabsList>
          </Tabs>
          <Link href={`/organizations/${organizationId ?? 3}/activities/screenshots`}>
            <Button kind="secondary" color="surface" size="sm" className="rounded-md">
              View All
            </Button>
          </Link>
        </div>
      </div>

      {isLoading || !organizationId ? (
        <div className="space-y-8">
          {[0, 1].map((g) => (
            <div key={g} className="flex w-full relative">
              <div className="absolute left-1.75 top-4 bottom-0 w-0.5 bg-border" />
              <div className="flex flex-col items-center mr-4 shrink-0 z-10">
                <ShimmerSkeleton className="size-3.5 rounded-full mt-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <ShimmerSkeleton className="h-4 w-36" />
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <ShimmerSkeleton className="w-full aspect-video rounded-md" />
                      <ShimmerSkeleton className="h-3 w-2/3" />
                      <ShimmerSkeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">No recent activity</div>
      ) : (
        <div>
          {groups.map((g, gi) => (
            <div key={gi} className="flex w-full mb-8 relative" data-testid="screenshot-group">
              <div className="absolute left-1.75 top-4 bottom-0 w-0.5 bg-border" />
              <div className="flex flex-col items-center mr-4 shrink-0 z-10">
                <Checkbox checked={selectedGroups.has(gi)} onCheckedChange={() => toggleGroup(gi)} shape="circle" className="mt-0.5 cursor-pointer" variant="brand" aria-label={`Select ${g.label}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground shrink-0 font-medium">{g.label}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {g.items.map((item, i) => (
                    <ScreenshotCard
                      key={item.key}
                      item={item}
                      index={i}
                      isSelected={selectedCards.has(`${gi}-${item.id}`)}
                      onClick={item.viewerIndex !== null ? () => setViewerIndex(item.viewerIndex) : undefined}
                      onToggle={item.id !== null ? () => toggleCard(gi, item.id!) : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {viewerIndex !== null && <ScreenshotViewer screenshots={viewerShots} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </div>
  );
}
