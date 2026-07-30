import * as React from 'react'

import { cn } from '@/lib/utils'

type CardProps = React.ComponentProps<'div'> & {
  variant?: 'card' | 'surface' | 'section' | 'interactive'
}

function Card({ className, variant = 'card', ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'group/card relative flex min-w-0 flex-col gap-3 overflow-hidden py-3 text-card-foreground sm:gap-3',
        variant === 'card' && 'rounded-lg border border-border/60 bg-card shadow-none',
        variant === 'surface' && 'rounded-lg border border-transparent bg-muted/25 shadow-none',
        variant === 'section' && 'overflow-visible rounded-none border-0 bg-transparent shadow-none',
        variant === 'interactive' &&
          'elevation-1 cursor-pointer rounded-lg border border-border/60 bg-card transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/45 hover:bg-muted/15 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/45',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] [.border-b]:pb-3 sm:px-4',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
}
