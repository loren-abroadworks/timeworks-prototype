import * as React from "react";
import { Slot } from "radix-ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — port of the TimeWorks design-system button.
 * Two styling APIs exist in the live app (both supported here):
 *  - legacy:   variant="outline" | "brand" | ...  + size
 *  - current:  kind="primary|secondary|tertiary" + color="primary|surface|..." + size
 * e.g. the dashboards' "View All" button is  <Button kind="secondary" color="surface" size="sm" className="rounded-md">
 */

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer";

const legacyVariants = cva("rounded-lg", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:bg-destructive/60",
      outline:
        "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-brand-blue dark:hover:bg-input/50",
      secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
      link: "text-primary underline-offset-4 hover:underline",
      brand: "bg-brand-blue text-primary-foreground shadow-xs hover:bg-brand-blue/90 focus-visible:ring-brand-blue/30",
    },
    size: {
      xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
      sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
      md: "h-9 px-4 py-2 has-[>svg]:px-3",
      default: "h-9 px-4 py-2 has-[>svg]:px-3",
      lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
      icon: "size-9",
      "icon-sm": "size-8",
      "icon-lg": "size-10",
    },
  },
  defaultVariants: { variant: "brand", size: "default" },
});

const kindVariants = cva("rounded-lg font-medium", {
  variants: {
    kind: { primary: "", secondary: "border bg-transparent", tertiary: "border border-transparent bg-transparent" },
    color: { primary: "", negative: "", positive: "", brand: "", inverted: "", themed: "", surface: "" },
    size: {
      xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
      sm: "h-8 gap-1.5 px-3 text-sm",
      md: "h-9 gap-2 px-4 text-sm",
      default: "h-9 gap-2 px-4 text-sm",
      lg: "h-10 gap-2 px-5 text-base",
      icon: "size-9",
      "icon-sm": "size-8",
      "icon-lg": "size-10",
    },
  },
  compoundVariants: [
    { kind: "primary", color: "primary", class: "bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90" },
    { kind: "secondary", color: "primary", class: "border-primary text-primary hover:bg-primary-highlight" },
    { kind: "secondary", color: "surface", class: "border-ui-border bg-secondary-surface text-primary-text shadow-xs hover:bg-muted" },
    { kind: "tertiary", color: "primary", class: "text-primary hover:bg-primary-highlight" },
  ],
  defaultVariants: { kind: "primary", color: "primary", size: "md" },
});

type Size = "xs" | "sm" | "md" | "default" | "lg" | "icon" | "icon-sm" | "icon-lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "brand";
  kind?: "primary" | "secondary" | "tertiary";
  color?: "primary" | "negative" | "positive" | "brand" | "inverted" | "themed" | "surface";
  size?: Size;
  asChild?: boolean;
}

export function buttonClasses({ variant, kind, color, size, className }: Pick<ButtonProps, "variant" | "kind" | "color" | "size" | "className">) {
  const useKind = kind != null || color != null;
  return cn(base, useKind ? kindVariants({ kind, color, size }) : legacyVariants({ variant, size }), className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, kind, color, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp ref={ref} data-slot="button" className={buttonClasses({ variant, kind, color, size, className })} {...props} />;
});
