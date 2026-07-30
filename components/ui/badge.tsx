import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-[2px] aria-invalid:ring-status-danger-solid/45 aria-invalid:border-status-danger-border transition-[color,border-color,background,transform] overflow-hidden shadow-none',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/10 text-primary [a&]:hover:bg-primary/14',
        secondary:
          'border-border/75 bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-status-danger-border bg-status-danger-surface text-status-danger-text [a&]:hover:brightness-95 focus-visible:ring-status-danger-solid/45',
        success:
          'border-status-success-border bg-status-success-surface text-status-success-text [a&]:hover:brightness-95',
        warning:
          'border-status-warning-border bg-status-warning-surface text-status-warning-text [a&]:hover:brightness-95',
        info:
          'border-status-info-border bg-status-info-surface text-status-info-text [a&]:hover:brightness-95',
        outline:
          'border-border/80 bg-background text-foreground [a&]:hover:bg-accent/15 [a&]:hover:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
