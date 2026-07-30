import type { ReactNode } from "react"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsSectionHeader({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card className="border-border/70 py-0 shadow-none">
      <CardHeader className="gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </CardHeader>
    </Card>
  )
}
