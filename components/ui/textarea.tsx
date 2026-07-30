import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 aria-invalid:border-status-danger-border aria-invalid:ring-0 flex field-sizing-content min-h-16 w-full resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-base shadow-none transition-[color,border-color,background] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
