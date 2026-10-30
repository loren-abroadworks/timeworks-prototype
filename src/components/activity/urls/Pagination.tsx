"use client";

import * as React from "react";
import { Select } from "radix-ui";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryParams } from "@/lib/use-query-params";
import { cn } from "@/lib/utils";

/**
 * List footer: "Showing 1-20 of 57 results", page buttons, "Show per page" select.
 * Port of the live Pagination (state in the `page` / `perPage` URL params).
 */
export function Pagination({ total, defaultPageSize = 20, pageSizeOptions = [10, 20, 50, 100] }: { total: number; defaultPageSize?: number; pageSizeOptions?: number[] }) {
  const { get, update } = useQueryParams();
  const perPage = Number(get("perPage") || defaultPageSize);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(pages, Math.max(1, Number(get("page") || 1)));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total, page * perPage);
  const nums = pageList(page, pages);
  const nav = "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex w-full flex-col gap-4 p-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8" data-testid="pagination">
      <p className="flex items-center gap-1 whitespace-nowrap text-sm" data-testid="pagination-summary">
        {total ? (
          <>
            <span className="text-muted-foreground">
              Showing {from}-{to} of
            </span>
            <span className="font-semibold text-foreground">{total} results</span>
          </>
        ) : (
          <span className="text-muted-foreground">No results</span>
        )}
      </p>
      <div className="flex items-center gap-1 sm:gap-2">
        <button type="button" aria-label="Go to previous page" className={nav} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                aria-current={n === page ? "page" : undefined}
                onClick={() => update({ page: String(n) })}
                className={cn(
                  "flex size-7 min-w-7 sm:size-8 sm:min-w-8 items-center justify-center rounded px-2 text-sm transition-colors",
                  n === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {n}
              </button>
            ),
          )}
        </div>
        <button type="button" aria-label="Go to next page" className={nav} disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <p className="whitespace-nowrap text-sm text-muted-foreground">Show per page</p>
        <Select.Root value={String(perPage)} onValueChange={(v) => update({ perPage: v, page: "1" })}>
          <Select.Trigger
            data-slot="select-trigger"
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none h-9 w-20 border border-ui-border bg-secondary-surface dark:bg-input/30 dark:hover:bg-input/50"
          >
            <Select.Value data-slot="select-value" />
            <ChevronDown className="size-4 opacity-50" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content position="popper" sideOffset={4} className="z-110 min-w-20 overflow-hidden rounded-md border border-ui-border bg-popover p-1 text-popover-foreground shadow-md">
              <Select.Viewport>
                {pageSizeOptions.map((n) => (
                  <Select.Item key={n} value={String(n)} className="relative flex cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent">
                    <Select.ItemText>{n}</Select.ItemText>
                    <Select.ItemIndicator className="absolute right-2">
                      <Check className="size-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  );
}

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push("…");
  out.push(pages);
  return out;
}
