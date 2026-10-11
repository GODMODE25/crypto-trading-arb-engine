import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity duration-[var(--motion-quick)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:opacity-90",
        secondary: "bg-surface text-fg border border-border hover:bg-surface-2",
        ghost: "text-muted hover:text-fg hover:bg-surface",
        danger: "bg-loss text-fg hover:opacity-90",
        outline: "border border-border-strong text-fg bg-transparent hover:bg-surface",
      },
      size: {
        default: "h-11 px-4 text-sm rounded-[var(--radius-sm)]",
        sm: "h-9 px-3 text-xs rounded-[var(--radius-xs)]",
        lg: "h-12 px-5 text-sm rounded-[var(--radius-md)]",
        icon: "size-11 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
