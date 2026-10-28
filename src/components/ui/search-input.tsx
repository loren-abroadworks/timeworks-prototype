"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryParams } from "@/lib/use-query-params";

const inputClasses =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-ui-border flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

/**
 * DebouncedSearch — search box used in the "View All" sheets.
 * With `updateQueryParam` it writes ?search=… to the URL after 300ms (like the live app),
 * and the sheet's query reads it back from the URL.
 */
export function DebouncedSearch({
  className,
  onChange,
  updateQueryParam = false,
  queryParamKey = "search",
  debounceDelay = 300,
  placeholder = "Search...",
}: {
  className?: string;
  onChange?: (value: string) => void;
  updateQueryParam?: boolean;
  queryParamKey?: string;
  debounceDelay?: number;
  placeholder?: string;
}) {
  const { get, push, remove } = useQueryParams();
  const [value, setValue] = React.useState(updateQueryParam ? (get(queryParamKey) ?? "") : "");
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (updateQueryParam) {
        if (value) push({ [queryParamKey]: value });
        else remove(queryParamKey);
      }
    }, debounceDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        data-slot="input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
        }}
        className={cn(inputClasses, "bg-secondary-surface pl-9", value.length > 0 && "pr-9", className)}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            onChange?.("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
