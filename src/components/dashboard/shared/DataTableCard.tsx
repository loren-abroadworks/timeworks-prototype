"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./EmptyState";

export interface Column<Row> {
  label: string;
  key: string;
  className?: string;
  render?: (args: { row: Row; index: number; data: Row[] }) => React.ReactNode;
}

const hasAlign = (c?: string) => /\btext-(left|center|right)\b/.test(c ?? "");
/** Last column is right-aligned unless it already sets an alignment (live behaviour). */
const colClass = (c: Column<unknown>, i: number, n: number) => `${c.className ?? ""} ${hasAlign(c.className) || i !== n - 1 ? "" : "text-right"}`.trim();

/** Card with a title, "View All" button and a compact table. Used by most Manager View widgets. */
export function DataTableCard<Row>({
  title,
  columns,
  data,
  onViewAll,
  isLoading,
  testId,
}: {
  title: string;
  columns: Column<Row>[];
  data: Row[] | undefined;
  onViewAll?: () => void;
  isLoading?: boolean;
  testId?: string;
}) {
  const n = columns.length;
  const rows = Array.isArray(data) ? data : [];
  const cols = columns as Column<unknown>[];
  return (
    <div data-slot="card" data-testid={testId} className="text-card-foreground flex flex-col p-4 gap-2 bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {!isLoading && onViewAll ? (
          <Button onClick={onViewAll} kind="secondary" color="surface" size="sm" className="rounded-md">
            View All
          </Button>
        ) : null}
      </div>
      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c, i) => (
                <TableHead key={c.key} className={colClass(c, i, n)}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, r) => (
              <TableRow key={r}>
                {cols.map((c, i) => (
                  <TableCell key={c.key} className={colClass(c, i, n)}>
                    {i === 0 ? (
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ) : (
                      <Skeleton className={`h-4 w-16 ${i === n - 1 && !hasAlign(c.className) ? "ml-auto" : ""}`} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c, i) => (
                <TableHead key={c.key} className={colClass(c, i, n)}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, r) => (
              <TableRow key={r}>
                {columns.map((c, i) => (
                  <TableCell key={c.key} className={colClass(c as Column<unknown>, i, n)}>
                    {c.render ? c.render({ row, index: r, data: rows }) : c.key === "actions" ? null : ((row as Record<string, React.ReactNode>)[c.key] ?? null)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
