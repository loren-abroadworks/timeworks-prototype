/** Class strings copied from the live filter-bar components (shared by every page's toolbar). */

/** Outline "surface" button (Filters, Today, Clear Filters, Cancel …). */
export const SURFACE_BUTTON =
  "inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-medium border h-9 gap-2 text-sm border-ui-border bg-secondary-surface text-primary-text shadow-xs hover:bg-muted cursor-pointer rounded-lg px-4";

/** Gradient primary button ("+ Add Time", "Save Filters", "Save" …). */
export const THEMED_BUTTON =
  "inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer font-medium h-9 gap-2 px-4 text-sm bg-[image:var(--gradient-theme)] text-white hover:opacity-90 rounded-lg";

/** Square 36px icon button (prev / next arrows). */
export const ICON_NAV_BUTTON =
  "inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer font-medium gap-2 px-4 text-sm hover:bg-muted text-primary-foreground size-9 bg-secondary-surface border border-ui-border rounded-lg shadow-none";

/** Popover shell shared by the "Filter by …" chip popovers. */
export const CHIP_POPOVER =
  "bg-popover text-popover-foreground pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-110 max-w-(--radix-popover-content-available-width) origin-(--radix-popover-content-transform-origin) outline-hidden w-64 overflow-hidden rounded-2xl border border-ui-border p-0 shadow-xl";

/** cmdk item (shadcn CommandItem + live overrides). */
export const COMMAND_ITEM =
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 my-0.5 gap-3 rounded-md px-2.5 py-1.5";

export const COMMAND_LIST = "scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain max-h-72 px-2 pb-2";

export const COMMAND_GROUP =
  "text-foreground **:[[cmdk-group-heading]]:text-muted-foreground overflow-hidden **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium p-0";

/** Chip trigger: idle vs. active (value selected). */
export const CHIP_IDLE =
  "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors border-ui-border bg-secondary-surface text-foreground hover:bg-muted";
export const CHIP_ACTIVE =
  "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 border-primary/40 bg-primary-selected-hover text-primary-text";

/** Dropdown menu content of the "⋮" / export action menus. */
export const ACTION_MENU_CONTENT =
  "text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-100 max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg shadow-md mt-1 border border-border min-w-48 p-1 bg-secondary";

export const ACTION_MENU_ITEM =
  "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 rounded-md px-3 py-2 mx-1 my-0.5 transition-colors duration-150 cursor-pointer";
