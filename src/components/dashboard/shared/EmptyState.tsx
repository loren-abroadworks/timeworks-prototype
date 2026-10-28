/** "No data for the selected range" block with the astronaut illustration. */
export function EmptyState({
  message = "No data for the selected range",
  hint = "Try a different date range or filters",
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8" data-testid="empty-state">
      <img alt="No data" loading="lazy" width={140} height={140} decoding="async" className="mb-3" src="/no-data-placeholder.svg" style={{ color: "transparent" }} />
      <p className="text-sm font-medium text-secondary-text">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
