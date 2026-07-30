"use client"

// Confirmación reutilizable que mantiene abierto el diálogo cuando la acción
// falla y presenta un error recuperable al usuario.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getErrorMessage } from "@/lib/error-message"
import { useState, type MouseEvent } from "react"

type ConfirmDestructiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  pendingLabel?: string
  errorMessage: string
  onConfirm: () => Promise<void>
}

export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  pendingLabel = "Eliminando...",
  errorMessage,
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (cause) {
      setError(getErrorMessage(cause, errorMessage))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-status-danger-solid text-destructive-foreground hover:brightness-95"
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
