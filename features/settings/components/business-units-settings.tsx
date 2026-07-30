"use client"

// CRUD de unidades de negocio usadas como alcance transversal del sistema.
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Building2, Pencil, Plus, Trash2 } from "lucide-react"
import type { UnidadNegocio } from "@/lib/data"
import { createBusinessUnit, deleteBusinessUnit, updateBusinessUnit } from "@/lib/repositories/supabase/business-units"
import { getErrorMessage } from "@/lib/error-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog"
import { SafeImage } from "@/components/ui/safe-image"
import { SettingsSectionHeader } from "./settings-section-header"

const schema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre de la unidad."),
  ecosistema: z.string().trim().min(2, "Ingresa el ecosistema."),
  logo: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function BusinessUnitsSettings({ units, canManage, canDelete, onChanged }: { units: UnidadNegocio[]; canManage: boolean; canDelete: boolean; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<UnidadNegocio | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [unitToDelete, setUnitToDelete] = useState<UnidadNegocio | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nombre: "", ecosistema: "", logo: "" } })

  const showForm = (unit?: UnidadNegocio) => {
    setEditing(unit ?? null)
    setError(null)
    form.reset({ nombre: unit?.nombre ?? "", ecosistema: unit?.ecosistema ?? "", logo: unit?.logo ?? "" })
    setOpen(true)
  }
  const submit = form.handleSubmit(async (values) => {
    try {
      if (editing) await updateBusinessUnit(editing.id, { name: values.nombre, ecosystem: values.ecosistema, logoUrl: values.logo || null })
      else await createBusinessUnit({ name: values.nombre, ecosystem: values.ecosistema, logoUrl: values.logo || null })
      await onChanged()
      setOpen(false)
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo guardar la unidad."))
    }
  })

  return <>
    <div className="space-y-3">
      <SettingsSectionHeader
        title="Unidades de negocio"
        description="Información general de cada unidad."
        action={<Button size="sm" onClick={() => showForm()} disabled={!canManage}><Plus className="mr-2 h-4 w-4" />Nueva unidad</Button>}
      />
      <Card className="overflow-hidden border-border/70 py-0 shadow-none">
        {success && <p role="status" className="border-b px-4 py-2 text-sm text-status-success-text">{success}</p>}
        <CardContent className="p-0"><Table className="min-w-[620px] table-fixed" containerClassName="rounded-none border-0"><colgroup><col className="w-[12%]" /><col className="w-[38%]" /><col className="w-[38%]" /><col className="w-[12%]" /></colgroup><TableHeader><TableRow><TableHead>Logo</TableHead><TableHead>Unidad</TableHead><TableHead>Ecosistema</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{units.map((unit) => <TableRow key={unit.id}><TableCell><div className="flex h-8 w-12 items-center justify-center overflow-hidden rounded border">{unit.logo ? <SafeImage src={unit.logo} alt="" className="h-full w-full object-contain" /> : <Building2 className="h-4 w-4 text-primary" />}</div></TableCell><TableCell className="font-medium"><span className="block truncate" title={unit.nombre}>{unit.nombre}</span></TableCell><TableCell><span className="block truncate" title={unit.ecosistema}>{unit.ecosistema}</span></TableCell><TableCell>{canManage && <div className="flex justify-end"><Button size="icon" variant="ghost" onClick={() => showForm(unit)}><Pencil className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-status-danger-text" onClick={() => { setSuccess(null); setUnitToDelete(unit) }}><Trash2 className="h-4 w-4" /></Button>}</div>}</TableCell></TableRow>)}</TableBody></Table></CardContent>
      </Card>
    </div>
    <ConfirmDestructiveDialog open={Boolean(unitToDelete)} onOpenChange={(next) => { if (!next) setUnitToDelete(null) }} title="Eliminar unidad de negocio" description={`Se eliminará “${unitToDelete?.nombre ?? ""}”. Esta acción no se puede deshacer.`} errorMessage="No se pudo eliminar la unidad." onConfirm={async () => { if (!unitToDelete) return; const name = unitToDelete.nombre; await deleteBusinessUnit(unitToDelete.id); await onChanged(); setSuccess(`La unidad “${name}” fue eliminada.`) }} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar unidad" : "Nueva unidad"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div><Label>Nombre</Label><Input {...form.register("nombre")} />{form.formState.errors.nombre && <p className="text-xs text-status-danger-text">{form.formState.errors.nombre.message}</p>}</div><div><Label>Ecosistema</Label><Input {...form.register("ecosistema")} />{form.formState.errors.ecosistema && <p className="text-xs text-status-danger-text">{form.formState.errors.ecosistema.message}</p>}</div><div><Label>URL o imagen del logo</Label><Input {...form.register("logo")} /></div>{error && <p className="text-sm text-status-danger-text">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>Guardar</Button></div></form></DialogContent></Dialog>
  </>
}
