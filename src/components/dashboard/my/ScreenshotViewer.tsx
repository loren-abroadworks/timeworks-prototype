"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface ViewerShot {
  id: number | null;
  percentage: number;
  timeSlot: string;
  src: string | null;
  date: string;
}

/**
 * Full-screen screenshot viewer: header with "Screenshot 03/10 | date - @time", prev/next/close,
 * blurred neighbours left/right, footer with Previous/Next and up to 3 "next" thumbnails.
 * Keyboard: ← / → to navigate, Esc to close.
 */
export function ScreenshotViewer({ screenshots, initialIndex, onClose }: { screenshots: ViewerShot[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = React.useState(initialIndex);
  React.useEffect(() => setIndex(initialIndex), [initialIndex]);

  const current = screenshots[index];
  const prevShot = index > 0 ? screenshots[index - 1] : null;
  const nextShot = index < screenshots.length - 1 ? screenshots[index + 1] : null;
  const upcoming = screenshots.slice(index + 1, index + 4);
  const prev = () => index > 0 && setIndex((i) => i - 1);
  const next = () => index < screenshots.length - 1 && setIndex((i) => i + 1);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;
  const counter = `${String(index + 1).padStart(2, "0")}/${String(screenshots.length).padStart(2, "0")}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="screenshot-viewer"
        className="max-w-none sm:max-w-none w-screen h-screen p-0 bg-[#12131a] border-none fixed inset-0 translate-x-0 translate-y-0 top-0 left-0 rounded-none"
      >
        <DialogTitle className="hidden" />
        <DialogDescription className="sr-only">Full screen screenshot viewer with navigation between screenshots.</DialogDescription>
        <div className="flex flex-col w-full h-full">
          <div className="relative flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 text-white text-sm">
              <span className="font-semibold" data-testid="viewer-counter">
                Screenshot {counter}
              </span>
              <span className="text-white/30">|</span>
              <span className="text-white/80">{current.date}</span>
              <span className="text-white/30">-</span>
              <span className="text-white/80">@{current.timeSlot}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={index === 0}
                aria-label="Previous screenshot"
                className="size-8 flex items-center justify-center rounded border border-white/20 text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={next}
                disabled={index === screenshots.length - 1}
                aria-label="Next screenshot"
                className="size-8 flex items-center justify-center rounded border border-white/20 text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={onClose}
                aria-label="Close viewer"
                className="size-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center overflow-hidden">
            {prevShot && (
              <div className="hidden sm:block absolute left-0 top-0 h-full w-32 md:w-44 opacity-25 blur-sm cursor-pointer hover:opacity-35 transition-opacity z-0" onClick={prev}>
                <img src={prevShot.src ?? ""} alt="previous screenshot" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
            <div className="relative z-10 mx-auto flex items-center justify-center h-full w-full px-4 sm:px-36 md:px-48">
              <div className="relative w-full h-full max-h-[calc(100vh-200px)]">
                <img src={current.src ?? ""} alt={`Screenshot ${index + 1}`} className="absolute inset-0 h-full w-full object-contain rounded-md shadow-2xl" />
              </div>
            </div>
            {nextShot && (
              <div className="hidden sm:block absolute right-0 top-0 h-full w-32 md:w-44 opacity-25 blur-sm cursor-pointer hover:opacity-35 transition-opacity z-0" onClick={next}>
                <img src={nextShot.src ?? ""} alt="next screenshot" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div className="bg-black/80 border-t border-white/10 px-6 pt-4 pb-5 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={prev}
                disabled={index === 0}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2 rounded shrink-0 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="text-white/70 text-sm text-center">
                {upcoming.length > 0 ? (
                  <>
                    Next screenshots <span className="text-white font-medium">{upcoming[0]?.date}</span> - <span className="text-white font-medium">@{upcoming[0]?.timeSlot}</span>
                  </>
                ) : (
                  <span className="text-white/40">Next screenshots</span>
                )}
              </span>
              <button
                onClick={next}
                disabled={index === screenshots.length - 1}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2 rounded shrink-0 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex gap-3 justify-center">
              {upcoming.map((s, i) => {
                const target = index + 1 + i;
                return (
                  <button
                    key={s.id ?? target}
                    onClick={() => setIndex(target)}
                    className="relative w-48 h-28 rounded-lg overflow-hidden border border-white/20 hover:border-white/60 transition-colors shrink-0 cursor-pointer group"
                  >
                    <img src={s.src ?? ""} alt={`screenshot ${target + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-black/60 rounded-full p-1.5">
                        <Eye className="size-4 text-white" />
                      </div>
                    </div>
                  </button>
                );
              })}
              {upcoming.length < 3 && (
                <div className="relative w-48 h-28 rounded-lg border border-white/10 bg-white/5 shrink-0 flex items-center justify-center">
                  <span className="text-white/30 text-xs text-center px-2">No next screenshots</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
