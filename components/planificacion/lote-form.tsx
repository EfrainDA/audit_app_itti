"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockUnidades, mockUsers, mockModelos } from "@/lib/data"

interface LoteFormProps {
  onClose: () => void
}

export function LoteForm({ onClose }: LoteFormProps) {
  const [unidadId, setUnidadId] = useState("")
  const [año, setAño] = useState("2026")
  const [ciclo, setCiclo] = useState("")
  const [modeloId, setModeloId] = useState("")
  const [auditores, setAuditores] = useState<string[]>([])

  const auditoresDisponibles = mockUsers.filter((u) => u.role === "auditor" && u.status === "activo")
  const modelosPublicados = mockModelos.filter((m) => m.estado === "publicado")

  const toggleAuditor = (auditorId: string) => {
    setAuditores(
      auditores.includes(auditorId)
        ? auditores.filter((id) => id !== auditorId)
        : [...auditores, auditorId]
    )
  }

  const handleSubmit = () => {
    console.log({ unidadId, año, ciclo, modeloId, auditores })
    onClose()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Unidad de Negocio *</Label>
          <Select value={unidadId} onValueChange={setUnidadId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona una unidad" />
            </SelectTrigger>
            <SelectContent>
              {mockUnidades.map((unidad) => (
                <SelectItem key={unidad.id} value={unidad.id}>
                  {unidad.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Año *</Label>
          <Select value={año} onValueChange={setAño}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ciclo de Control *</Label>
          <Select value={ciclo} onValueChange={setCiclo}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona el ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Ciclo 1 (Ene - Feb)</SelectItem>
              <SelectItem value="2">Ciclo 2 (Mar - Abr)</SelectItem>
              <SelectItem value="3">Ciclo 3 (May - Jun)</SelectItem>
              <SelectItem value="4">Ciclo 4 (Jul - Ago)</SelectItem>
              <SelectItem value="5">Ciclo 5 (Sep - Oct)</SelectItem>
              <SelectItem value="6">Ciclo 6 (Nov - Dic)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Modelo de Control *</Label>
          <Select value={modeloId} onValueChange={setModeloId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona un modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelosPublicados.map((modelo) => (
                <SelectItem key={modelo.id} value={modelo.id}>
                  {modelo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Auditores Asignados *</Label>
        <p className="text-sm text-muted-foreground">
          Selecciona los auditores que participarán en este lote
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {auditoresDisponibles.map((auditor) => (
            <div
              key={auditor.id}
              className="flex items-center space-x-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer"
              onClick={() => toggleAuditor(auditor.id)}
            >
              <Checkbox
                id={auditor.id}
                checked={auditores.includes(auditor.id)}
                onCheckedChange={() => toggleAuditor(auditor.id)}
              />
              <div className="flex-1">
                <label htmlFor={auditor.id} className="text-sm font-medium cursor-pointer">
                  {auditor.name}
                </label>
                <p className="text-xs text-muted-foreground">{auditor.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={!unidadId || !ciclo || !modeloId || auditores.length === 0}
        >
          Crear Lote
        </Button>
      </div>
    </div>
  )
}
