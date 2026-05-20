import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-base shadow-[inset_0_1px_0_oklch(1_0_0_/_0.42),0_4px_12px_oklch(0.30_0.032_252_/_0.035)] transition-[color,box-shadow,border-color,background] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/18 focus-visible:ring-[3px] focus-visible:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.74),0_10px_28px_oklch(0.32_0.04_252_/_0.11)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
