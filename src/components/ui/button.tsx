import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
          default:
            "bg-[var(--btn-bg)] text-[var(--btn-text)] border-[1px] border-[var(--btn-border)] hover:opacity-95",
          destructive:
            "bg-[var(--destructive)] text-[var(--btn-text)] hover:opacity-95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          outline:
            "border border-[var(--btn-border)] bg-[var(--background)] shadow-xs hover:bg-[var(--popover)] hover:text-[var(--popover-foreground)] dark:bg-[var(--input)] dark:border-[var(--input)] dark:hover:bg-[var(--ring)]",
          secondary:
            "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90",
          ghost:
            "bg-transparent hover:bg-[var(--popover)] hover:text-[var(--popover-foreground)] dark:hover:bg-[var(--popover)]",
          link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
