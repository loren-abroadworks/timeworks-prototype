"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

export const PAGE_SIZE = 20;

/** Pagination math shared by every "View All" sheet (20 rows per page). */
export function pageInfo(page: number, totalCount: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  return { page: current, totalPages, totalCount, rangeStart: (current - 1) * PAGE_SIZE + 1, rangeEnd: Math.min(PAGE_SIZE * current, totalCount) };
}

/** Footer: "Showing 1–20 of 32 results"  ‹ 1 / 2 › */
export function SheetPagination({
  page,
  totalPages,
  totalCount,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
}: ReturnType<typeof pageInfo> & { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between text-sm text-muted-foreground" data-testid="sheet-pagination">
      <span data-testid="sheet-range">
        {totalCount > 0 ? `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(totalCount)} results` : "No results"}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" onClick={onPrev} disabled={page === 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 font-medium" data-testid="sheet-page">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="size-8" onClick={onNext} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Loading / empty rows used inside sheet tables. */
export function SheetStatusRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-10">
        {children}
      </TableCell>
    </TableRow>
  );
}

/** Right-side sheet frame shared by all "View All" panels. */
export function ViewAllSheet({
  open,
  onClose,
  title,
  description,
  filters,
  children,
  footer,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  filters?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testId?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-3/4 sm:max-w-4xl flex flex-col overflow-hidden p-0" data-testid={testId}>
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
          {filters ? <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">{filters}</div> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer}
      </SheetContent>
    </Sheet>
  );
}
