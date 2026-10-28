"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sheet — slide-in side panel used by every "View All" button. Includes the drag-to-resize handle of the live app. */

export const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => <SheetPrimitive.Root data-slot="sheet" {...props} />;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-100 bg-black/50 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function SheetContent({
  className,
  children,
  side = "right",
  resizable = true,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "right" | "left" | "top" | "bottom"; resizable?: boolean }) {
  const horizontal = side === "left" || side === "right";
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const sizeStyle: React.CSSProperties = {};
  if (resizable && size !== null) {
    if (horizontal) Object.assign(sizeStyle, { width: size, maxWidth: "none" });
    else Object.assign(sizeStyle, { height: size, maxHeight: "none" });
  }
  if (dragging) sizeStyle.transition = "none";

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const startPos = horizontal ? e.clientX : e.clientY;
    const startSize = horizontal ? rect.width : rect.height;
    const min = horizontal ? 320 : 200;
    const max = horizontal ? window.innerWidth * 0.9 : window.innerHeight * 0.9;
    const dir = side === "right" || side === "bottom" ? -1 : 1;
    setDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = horizontal ? "col-resize" : "row-resize";
    const move = (ev: PointerEvent) => setSize(Math.min(max, Math.max(min, startSize + ((horizontal ? ev.clientX : ev.clientY) - startPos) * dir)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        data-slot="sheet-content"
        style={{ ...style, ...sizeStyle }}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-100 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        {resizable && (
          <div
            onPointerDown={onPointerDown}
            className={cn(
              "group absolute z-20 flex items-center justify-center touch-none",
              horizontal ? "inset-y-0 w-1.5 cursor-col-resize" : "inset-x-0 h-1.5 cursor-row-resize",
              side === "right" && "left-0",
              side === "left" && "right-0",
              side === "top" && "bottom-0",
              side === "bottom" && "top-0",
            )}
          >
            <span className={cn("rounded-full bg-border transition-colors group-hover:bg-primary", dragging && "bg-primary", horizontal ? "h-10 w-1" : "w-10 h-1")} />
          </div>
        )}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4  hover:opacity-70 transition-opacity focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none p-1 rounded-full">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-foreground font-semibold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}
