"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Funnel, Pencil, Search, Trash2 } from "lucide-react";
import { Switch } from "radix-ui";
import { apiSend, useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "./toast";
import { SURFACE_BUTTON, THEMED_BUTTON } from "./styles";

/**
 * "Filters" button + popover (Filter options | Saved filters), port of the live FilterOptions component.
 * Each option is a switch that shows / hides a filter chip in the toolbar. Saved filters are stored through
 * the mock /saved-filters endpoints, per `pageKey`.
 */

export interface FilterOption {
  key: string;
  label: string;
  description?: string;
  /** Locked options cannot be switched off (always shown). */
  locked?: boolean;
}

export interface SavedFilterRow {
  id: string;
  name: string;
  description: string;
  filters: Record<string, string | boolean>;
}

export function FiltersPopover({
  options,
  values,
  onToggle,
  onClear,
  pageKey,
  getSnapshot,
  onApplySaved,
  width = "16rem",
}: {
  options: FilterOption[];
  /** key -> chip visible */
  values: Record<string, boolean>;
  onToggle: (key: string) => void;
  /** "Clear Filters": hide chips + clear their params. */
  onClear: () => void;
  /** Saved-filters page key (e.g. "timesheet"). Omit to hide the Saved filters tab. */
  pageKey?: string;
  /** Current URL filter params to store in a saved filter. */
  getSnapshot?: () => Record<string, string>;
  /** Apply a saved filter (toggles + params). */
  onApplySaved?: (f: SavedFilterRow) => void;
  width?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"options" | "saved">("options");
  const [search, setSearch] = React.useState("");
  const [savedSearch, setSavedSearch] = React.useState("");
  const [dialog, setDialog] = React.useState<null | { editing?: SavedFilterRow }>(null);
  const [deleting, setDeleting] = React.useState<SavedFilterRow | null>(null);
  const [appliedId, setAppliedId] = React.useState<string | null>(null);
  const { organizationId } = useSession();
  const qc = useQueryClient();
  const key = ["SAVED_FILTERS", String(organizationId ?? ""), pageKey ?? ""];
  const { data } = useApiQuery<{ success: boolean; data: SavedFilterRow[] }>({
    endpoint: `/saved-filters/${organizationId}?page_key=${pageKey}`,
    queryKey: key,
    enabled: !!organizationId && !!pageKey,
  });
  const saved = data?.data ?? [];
  const count = options.filter((o) => values[o.key]).length;
  const visible = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  const savedVisible = saved.filter((f) => f.name.toLowerCase().includes(savedSearch.toLowerCase()));

  const save = async (name: string, description: string) => {
    const filters: Record<string, string | boolean> = { ...(getSnapshot?.() ?? {}) };
    options.forEach((o) => (filters[o.key] = !!values[o.key]));
    try {
      if (dialog?.editing) {
        await apiSend("PUT", `/saved-filters/${organizationId}/${dialog.editing.id}`, { page_key: pageKey, name, description, filters });
        toast.success("Filter updated");
      } else {
        await apiSend("POST", `/saved-filters/${organizationId}`, { page_key: pageKey, name, description, filters });
        toast.success("Filter saved");
      }
      qc.invalidateQueries({ queryKey: key });
      setDialog(null);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save filter");
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await apiSend("DELETE", `/saved-filters/${organizationId}/${deleting.id}`);
      toast.success("Filter deleted");
      if (appliedId === deleting.id) setAppliedId(null);
      qc.invalidateQueries({ queryKey: key });
    } catch {
      toast.error("Failed to delete filter");
    }
    setDeleting(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={SURFACE_BUTTON} data-testid="filters-button">
          <Funnel className="lucide-funnel size-4" />
          Filters
          {count > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground">{count}</span>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="border shadow-md outline-hidden w-72! p-0 rounded-xl overflow-hidden" style={{ width }} data-testid="filters-popover">
          {!pageKey && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Filter options</p>
            </div>
          )}
          {pageKey && (
            <div className="grid grid-cols-2 border-b border-border">
              {(["options", "saved"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn("px-4 py-2.5 text-sm font-medium transition-colors", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
                >
                  {t === "options" ? "Filter options" : "Saved filters"}
                </button>
              ))}
            </div>
          )}
          {tab === "options" ? (
            <>
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 transition-colors focus-within:border-primary focus-within:bg-background">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    placeholder="Search filters"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="py-1">
                {visible.map((o) => (
                  <div key={o.key} className="flex items-center justify-between px-4 py-1.5 hover:bg-accent">
                    <div>
                      <p className="text-sm text-foreground">{o.label}</p>
                      {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                    </div>
                    <Switch.Root
                      checked={!!values[o.key]}
                      disabled={o.locked}
                      onCheckedChange={() => {
                        setAppliedId(null);
                        onToggle(o.key);
                      }}
                      data-slot="toggle"
                      aria-label={o.label}
                      className="peer inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 hover:data-[state=checked]:opacity-90 data-[state=unchecked]:bg-input h-6 w-11 data-[state=checked]:bg-primary"
                    >
                      <Switch.Thumb
                        data-slot="toggle-thumb"
                        className="pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[calc(100%+2px)] size-5"
                      />
                    </Switch.Root>
                  </div>
                ))}
              </div>
              {pageKey && (
                <div className="p-3 border-t border-border grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={SURFACE_BUTTON}
                    onClick={() => {
                      setAppliedId(null);
                      onClear();
                      toast.success("Filters cleared");
                    }}
                  >
                    Clear Filters
                  </button>
                  <button type="button" className={THEMED_BUTTON} onClick={() => setDialog({})}>
                    Save Filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    data-slot="input"
                    className="placeholder:text-muted-foreground dark:bg-input/30 border-ui-border flex w-full min-w-0 border bg-transparent px-3 py-1 shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] pl-8 h-8 text-sm rounded-full"
                    placeholder="Search saved filters"
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto py-1 px-1">
                {savedVisible.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{savedSearch ? "No filters match your search" : "No saved filters yet"}</p>
                ) : (
                  savedVisible.map((f) => (
                    <div
                      key={f.id}
                      className={cn("group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-accent", appliedId === f.id && "bg-primary-selected")}
                      onClick={() => {
                        if (appliedId === f.id) {
                          setAppliedId(null);
                          onClear();
                          toast.success("Filters cleared");
                          return;
                        }
                        setAppliedId(f.id);
                        onApplySaved?.(f);
                        toast.success(`"${f.name}" applied`);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                        {f.description && <p className="truncate text-xs text-muted-foreground">{f.description}</p>}
                      </div>
                      <button
                        type="button"
                        aria-label="Edit filter"
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialog({ editing: f });
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete filter"
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(f);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <SaveFilterDialog open={!!dialog} editing={dialog?.editing} onClose={() => setDialog(null)} onSave={save} />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogTitle>Delete saved filter</DialogTitle>
          <DialogDescription>Are you sure you want to delete &quot;{deleting?.name}&quot;? This action cannot be undone.</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" className={SURFACE_BUTTON} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button type="button" className={cn(SURFACE_BUTTON, "border-transparent bg-destructive text-white hover:bg-destructive/90")} onClick={remove}>
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveFilterDialog({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing?: SavedFilterRow;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDesc(editing?.description ?? "");
      setError("");
    }
  }, [open, editing]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{editing ? "Edit filter" : "Save filters"}</DialogTitle>
        <DialogDescription className="sr-only">Name the current filter selection so it can be reused later.</DialogDescription>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <input
              id="filter-name"
              data-slot="input"
              placeholder="e.g. Monthly team overview"
              className="placeholder:text-muted-foreground dark:bg-input/30 border-ui-border flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setError("");
              }}
            />
            {error && <p className="text-xs text-negative">{error}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-desc" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <textarea
              id="filter-desc"
              rows={3}
              placeholder="Add a short description..."
              className="placeholder:text-muted-foreground dark:bg-input/30 border-ui-border w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none min-h-16 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={SURFACE_BUTTON} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={cn(SURFACE_BUTTON, "border-transparent bg-primary text-primary-foreground hover:bg-primary/90")}
            onClick={() => {
              if (!name.trim()) {
                setError("Name is required");
                return;
              }
              onSave(name.trim(), desc.trim());
            }}
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
