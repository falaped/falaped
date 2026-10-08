import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-6 gap-1 rounded-md border border-transparent px-2 py-0.5 text-caption font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge",
  {
    variants: {
      variant: {
        // Papéis fixos do guia: accent (canal e tipo), neutral (informação),
        // success, warning (pendência), destructive (erro), clinical (alergia).
        default:
          "bg-primary-soft text-primary-ink-strong border-primary-soft-border",
        secondary: "bg-muted text-muted-foreground border-border",
        success: "bg-success-soft text-success-text border-success-border",
        warning: "bg-warning-soft text-warning-text border-warning-border",
        destructive: "bg-danger-soft text-danger-text border-danger-border",
        clinical:
          "bg-destructive text-destructive-foreground border-transparent font-semibold",
        outline:
          "border-border text-foreground [a]:hover:bg-accent",
        ghost:
          "hover:bg-accent hover:text-foreground",
        link: "text-primary-ink underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
