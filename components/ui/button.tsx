import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-[color,border-color,background,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-status-danger-border aria-invalid:ring-status-danger-solid/45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'border border-primary/20 bg-primary text-primary-foreground shadow-none hover:bg-primary/90',
        destructive:
          'border border-status-danger-solid bg-status-danger-solid text-white shadow-none hover:brightness-95 focus-visible:ring-status-danger-solid/45',
        outline:
          'border border-border/70 bg-card shadow-none hover:border-border hover:bg-muted/40 hover:text-foreground dark:hover:bg-muted/45',
        secondary:
          'border border-border/65 bg-secondary text-secondary-foreground shadow-none hover:border-border hover:bg-secondary/90',
        ghost:
          'shadow-none hover:bg-muted/45 hover:text-foreground dark:hover:bg-muted/45',
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
