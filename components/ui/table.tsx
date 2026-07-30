'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto rounded-lg border border-border/60 bg-card shadow-none [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain]',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn('w-full min-w-full caption-bottom bg-card text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-muted/25 [&_tr]:border-b [&_tr]:border-border/60 [&_tr]:bg-muted/25 [&_th]:bg-muted/25', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border/50 transition-[background,border-color] hover:bg-muted/25 data-[state=selected]:bg-muted/45',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-9 whitespace-nowrap bg-muted/25 px-3 text-left align-middle text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'max-w-[18rem] whitespace-nowrap px-3 py-2 align-middle text-foreground/90 [&:has([role=checkbox])]:pr-0 [&_*]:min-w-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
}
