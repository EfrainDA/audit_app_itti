import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:translate-y-px active:scale-[0.985]",
  {
    variants: {
      variant: {
        default: 'border border-primary/20 bg-primary text-primary-foreground shadow-[0_8px_18px_oklch(0.32_0.05_238_/_0.12)] hover:bg-primary/90 hover:shadow-[0_10px_22px_oklch(0.32_0.05_238_/_0.16)]',
        destructive:
          'border border-destructive/30 bg-destructive text-white shadow-[0_8px_18px_oklch(0.64_0.22_25_/_0.12)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border border-border/75 bg-card shadow-[0_6px_14px_oklch(0.30_0.032_252_/_0.045)] hover:border-primary/30 hover:bg-primary/8 hover:text-foreground hover:shadow-[0_8px_18px_oklch(0.32_0.04_252_/_0.08)] dark:hover:bg-primary/12',
        secondary:
          'border border-border/70 bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.52)] hover:border-accent/45 hover:bg-secondary/92',
        ghost:
          'hover:bg-primary/9 hover:text-foreground hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_22%,transparent)] dark:hover:bg-primary/10',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
