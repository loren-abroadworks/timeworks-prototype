"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Checkbox — the screenshot cards/groups use variant="brand" shape="circle". */

const variants = {
  default:
    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary border-primary focus-visible:border-ring focus-visible:ring-ring/50",
  brand:
    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary border-primary focus-visible:border-ring focus-visible:ring-primary/20",
};
const sizes = { sm: "size-3", default: "size-4", lg: "size-5", xl: "size-6" };
const shapes = { square: "rounded-[4px]", circle: "rounded-full", sharp: "rounded-[2px]" };
const indicator = { sm: "[&>svg]:size-2.5", default: "[&>svg]:size-3.5", lg: "[&>svg]:size-4", xl: "[&>svg]:size-5" };

export function Checkbox({
  className,
  variant = "default",
  size = "default",
  shape = "square",
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  shape?: keyof typeof shapes;
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer dark:bg-input/30 shrink-0 border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        shapes[shape],
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={cn("flex items-center justify-center text-current transition-none", indicator[size])}>
        <CheckIcon className="text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
