'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex min-h-9 max-w-full items-center justify-start overflow-x-auto rounded-lg border border-border/65 bg-card p-[3px] text-muted-foreground shadow-none sm:w-fit sm:justify-center',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 py-1 text-sm font-semibold text-foreground transition-[color,border-color,background] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[2px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary/28 data-[state=active]:bg-primary/9 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:[&_svg]:text-primary dark:text-muted-foreground dark:data-[state=active]:border-primary/35 dark:data-[state=active]:bg-primary/12 dark:data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
