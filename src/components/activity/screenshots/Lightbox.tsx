"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiSend } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { ActivityShot } from "@/lib/types/screenshots";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const NAV = "inline-flex items-center justify-center size-9 rounded-md bg-black/50 text-white hover:bg-black/70 pointer-events-auto cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
const tracked = new Set<number>();

/**
 * Full-screen screenshot viewer (live chunk 27rrbvodphkw4.js): black backdrop, ← → buttons + keyboard,
 * caption = captured_at_user_tz, "n / N", "Use ← → arrows to navigate". Each newly shown screenshot fires
 * POST /track-screenshot-detail-view/{org}?captured_at&timezone&user_id (view audit).
 */
export function ScreenshotLightbox({ shots, initialId, userId, timezone, onClose }: { shots: ActivityShot[]; initialId: number; userId: string; timezone: string; onClose: () => void }) {
  const { organizationId } = useSession();
  const [index, setIndex] = React.useState(() => Math.max(0, shots.findIndex((s) => s.id === initialId)));
  const current = shots[index];

  React.useEffect(() => {
    if (!current || !organizationId || tracked.has(current.id)) return;
    tracked.add(current.id);
    const q = new URLSearchParams({ captured_at: current.captured_at.replace("T", " "), timezone, user_id: userId });
    apiSend("POST", `/track-screenshot-detail-view/${organizationId}?${q}`, {}).catch(() => tracked.delete(current.id));
  }, [current, organizationId, timezone, userId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(shots.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shots.length]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-none sm:max-w-none max-h-none w-screen h-screen p-0 gap-0 rounded-none overflow-hidden bg-black! dark:bg-black! border-none fixed inset-0 translate-x-0 translate-y-0 top-0 left-0"
        data-testid="screenshot-lightbox"
      >
        <DialogTitle className="hidden">Screenshot</DialogTitle>
        <DialogDescription className="sr-only">Full screen screenshot viewer with navigation between screenshots.</DialogDescription>
        <div className="relative w-full h-full flex flex-col bg-black">
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex items-center justify-center size-9 text-white hover:bg-white/20 absolute top-4 right-4 z-10 rounded-full group cursor-pointer">
            <X className="group-hover:text-red-600" />
          </button>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {current && <img src={current.url} alt={current.captured_at_user_tz} className="max-h-full max-w-full object-contain" data-testid="lightbox-image" />}
          </div>
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
            <button type="button" aria-label="Previous screenshot" className={NAV} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" aria-label="Next screenshot" className={NAV} disabled={index === shots.length - 1} onClick={() => setIndex((i) => i + 1)}>
              <ChevronRight className="size-6" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-br from-black/50 to-black/20 p-4">
            <div className="flex justify-between items-baseline-last">
              <span />
              <div className="items-center">
                <span className="text-lg font-semibold text-white" data-testid="lightbox-caption">
                  {current?.captured_at_user_tz}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white" data-testid="lightbox-counter">
                  {index + 1} / {shots.length}
                </span>
                <span className="text-xs text-gray-300">Use ← → arrows to navigate</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
