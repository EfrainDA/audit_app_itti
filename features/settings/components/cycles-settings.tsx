"use client"

// Gestión de ciclos configurables: período, vigencia, estado y eliminación.
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Ciclo } from "@/lib/data"
import { getErrorMessage } from "@/lib/error-message"
import { createCycle, deleteCycle, updateCycle, updateCycleStatus } from "@/lib/repositories/supabase/cycles"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Power, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { SettingsSectionHeader } from "./settings-section-header"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const schema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  startMonth: z.coerce.number().int().min(1).max(12),
  endMonth: z.coerce.number().int().min(1).max(12),
}).refine((values) => values.endMonth >= values.startMonth, {
  path: ["endMonth"],
  message: "El mes de cierre debe ser igual o posterior al mes de inicio.",
})
type Values = z.infer<typeof schema>

export function CyclesSettings({ cycles, canManage, onChanged }: { cycles: Ciclo[]; canManage: boolean; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Ciclo | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cycleToDelete, setCycleToDelete] = useState<Ciclo | null>(null)
  const [cycleToDisable, setCycleToDisable] = useState<Ciclo | null>(null)
  const currentMonth = new Date().getMonth() + 1
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { year: new Date().getFullYear(), startMonth: currentMonth, endMonth: currentMonth },
  })
  const show = (cycle?: Ciclo) => {
    setEditing(cycle ?? null)
    setError(null)
    form.reset({
      year: cycle?.año ?? new Date().getFullYear(),
      startMonth: cycle?.mesInicio ?? currentMonth,
      endMonth: cycle?.mesFin ?? currentMonth,
    })
    setOpen(true)
  }
  const submit = form.handleSubmit(async (values) => {
    try {
      if (editing) await updateCycle(editing.id, values)
      else await createCycle(values)
      await onChanged(); setOpen(false)
    } catch (cause) { setError(getErrorMessage(cause, "No se pudo guardar el ciclo.")) }
  })

  return <>
    <div className="space-y-3">
      <SettingsSectionHeader
        title="Ciclos de evaluación"
        description="Periodos configurables por mes habilitados para planificar."
        action={<Button size="sm" onClick={() => show()} disabled={!canManage}><Plus className="mr-2 h-4 w-4" />Nuevo ciclo</Button>}
      />
      <Card className="overflow-hidden border-border/70 py-0 shadow-none">
        {success && <p role="status" className="border-b px-4 py-2 text-sm text-status-success-text">{success}</p>}
        <CardContent className="p-0"><Table containerClassName="rounded-none border-0"><TableHeader><TableRow><TableHead>Año</TableHead><TableHead>Mes de inicio</TableHead><TableHead>Mes de cierre</TableHead><TableHead>Fecha de inicio</TableHead><TableHead>Fecha de cierre</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{cycles.map((cycle) => <TableRow key={cycle.id}><TableCell className="font-medium">{cycle.año}</TableCell><TableCell>{MONTHS[cycle.mesInicio - 1]}</TableCell><TableCell>{MONTHS[cycle.mesFin - 1]}</TableCell><TableCell>{cycle.fechaInicio}</TableCell><TableCell>{cycle.fechaFin}</TableCell><TableCell className="capitalize">{cycle.estado ?? "habilitado"}</TableCell><TableCell>{canManage && <div className="flex justify-end"><Button size="icon" variant="ghost" onClick={() => show(cycle)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={async () => { if (cycle.estado !== "deshabilitado") { setCycleToDisable(cycle); return } await updateCycleStatus(cycle.id, "habilitado"); await onChanged() }}><Power className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-status-danger-text" onClick={() => { setSuccess(null); setCycleToDelete(cycle) }}><Trash2 className="h-4 w-4" /></Button></div>}</TableCell></TableRow>)}</TableBody></Table>{error && <p className="p-4 text-sm text-status-danger-text">{error}</p>}</CardContent>
      </Card>
    </div>
    <ConfirmDestructiveDialog open={Boolean(cycleToDelete)} onOpenChange={(next) => { if (!next) setCycleToDelete(null) }} title="Eliminar ciclo" description={`Se eliminará el ciclo ${MONTHS[(cycleToDelete?.mesInicio ?? 1) - 1]} — ${MONTHS[(cycleToDelete?.mesFin ?? 1) - 1]} ${cycleToDelete?.año ?? ""}. Esta acción no se puede deshacer.`} errorMessage="No se pudo eliminar el ciclo." onConfirm={async () => { if (!cycleToDelete) return; await deleteCycle(cycleToDelete.id); await onChanged(); setSuccess("El ciclo fue eliminado correctamente.") }} />
    <ConfirmDestructiveDialog open={Boolean(cycleToDisable)} onOpenChange={(next) => { if (!next) setCycleToDisable(null) }} title="Deshabilitar ciclo" description={`¿Estás seguro de que deseas deshabilitar el ciclo ${MONTHS[(cycleToDisable?.mesInicio ?? 1) - 1]} — ${MONTHS[(cycleToDisable?.mesFin ?? 1) - 1]} ${cycleToDisable?.año ?? ""}?`} confirmLabel="Sí, deshabilitar" pendingLabel="Deshabilitando..." errorMessage="No se pudo deshabilitar el ciclo." onConfirm={async () => { if (!cycleToDisable) return; await updateCycleStatus(cycleToDisable.id, "deshabilitado"); await onChanged() }} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md md:max-w-md lg:max-w-md"><DialogHeader><DialogTitle>{editing ? "Editar ciclo" : "Nuevo ciclo"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div><Label>Año</Label><Input type="number" {...form.register("year")} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Mes de inicio</Label><Select value={String(form.watch("startMonth"))} onValueChange={(value) => form.setValue("startMonth", Number(value), { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent></Select></div><div><Label>Mes de cierre</Label><Select value={String(form.watch("endMonth"))} onValueChange={(value) => form.setValue("endMonth", Number(value), { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent></Select>{form.formState.errors.endMonth && <p className="mt-1 text-xs text-status-danger-text">{form.formState.errors.endMonth.message}</p>}</div></div>{error && <p className="text-sm text-status-danger-text">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>Guardar</Button></div></form></DialogContent></Dialog>
  </>
}
