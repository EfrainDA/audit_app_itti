// Estados visuales uniformes para carga, vacío, error y confirmación.
// Evita que cada pantalla implemente mensajes y skeletons incompatibles.
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, CircleAlert, Inbox, LoaderCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ContentSkeletonProps {
  className?: string
  variant?: "dashboard" | "detail" | "list"
  label?: string
}

function ContentSkeleton({
  className,
  variant = "list",
  label = "Cargando contenido",
}: ContentSkeletonProps) {
  const cardCount = variant === "dashboard" ? 4 : variant === "detail" ? 2 : 3

  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("animate-in fade-in space-y-4", className)}
    >
      <span className="sr-only">{label}</span>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-4 w-72 max-w-[70vw] bg-muted/70" />
        </div>
        <Skeleton className="h-10 w-28 bg-muted" />
      </div>
      <div className={cn("grid gap-4", variant === "dashboard" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2")}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border/60 bg-card p-4">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="mt-4 h-8 w-20 bg-muted" />
            <Skeleton className="mt-3 h-3 w-full bg-muted/70" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <Skeleton className="h-5 w-40 bg-muted" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: variant === "detail" ? 5 : 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full bg-muted/70" />
          ))}
        </div>
      </div>
    </div>
  )
}

function AppShellSkeleton({ label = "Preparando sesión" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="flex min-h-screen bg-background">
      <span className="sr-only">{label}</span>
      <aside className="hidden w-56 border-r border-sidebar-border bg-sidebar p-4 lg:block">
        <Skeleton className="mx-auto h-10 w-32 bg-sidebar-accent" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full bg-sidebar-accent" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card px-4 sm:px-6">
          <Skeleton className="h-6 w-40 bg-muted" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-11 rounded-full bg-muted" />
            <Skeleton className="h-11 w-11 rounded-full bg-muted" />
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] p-4 sm:p-6">
          <ContentSkeleton variant="dashboard" label={label} />
        </main>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn("min-h-52 border border-border/60 bg-muted/15", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  className?: string
}

function ErrorState({
  title = "No pudimos cargar la información",
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      className={cn("border-status-danger-border bg-status-danger-surface", className)}
      title={title}
      description={description}
      icon={CircleAlert}
      action={onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      ) : undefined}
    />
  )
}

type SaveStatusValue = "idle" | "saving" | "saved" | "error"

function SaveStatus({
  status,
  onRetry,
  className,
}: {
  status: SaveStatusValue
  onRetry?: () => void
  className?: string
}) {
  if (status === "idle") return null

  const config = status === "saving"
    ? { icon: LoaderCircle, label: "Guardando…", tone: "text-muted-foreground", animate: true }
    : status === "saved"
      ? { icon: CheckCircle2, label: "Guardado", tone: "text-status-success-text", animate: false }
      : { icon: CircleAlert, label: "No se pudo guardar", tone: "text-status-danger-text", animate: false }
  const Icon = config.icon

  return (
    <div aria-live="polite" className={cn("flex min-h-11 items-center gap-2 text-xs font-semibold", config.tone, className)}>
      <Icon className={cn("h-4 w-4", config.animate && "animate-spin")} />
      <span>{config.label}</span>
      {status === "error" && onRetry && (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export { AppShellSkeleton, ContentSkeleton, EmptyState, ErrorState, SaveStatus }
