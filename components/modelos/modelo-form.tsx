"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { createControlModel, updateControlModel, type ControlModelInput } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"
import type { ModeloControl } from "@/lib/data"

interface ModeloFormProps {
  onClose: () => void
  onSaved?: () => Promise<void> | void
  modelo?: ModeloControl
}

interface VerticalForm {
  id: string
  nombre: string
  peso: number
  tipoEvaluacion: 'distribuida' | 'cascada'
  parametros: ParametroForm[]
}

interface ParametroForm {
  id: string
  nombre: string
  descripcion: string
  puntosBase: number
  permiteIntermedio: boolean
}

function getInitialVerticales(modelo?: ModeloControl): VerticalForm[] {
  if (!modelo) {
    return [
      {
        id: "1",
        nombre: "",
        peso: 100,
        tipoEvaluacion: "distribuida",
        parametros: [{ id: "1", nombre: "", descripcion: "", puntosBase: 100, permiteIntermedio: false }],
      },
    ]
  }

  if (!modelo.verticales.length) {
    return [
      {
        id: "1",
        nombre: "",
        peso: 100,
        tipoEvaluacion: "distribuida",
        parametros: [{ id: "1", nombre: "", descripcion: "", puntosBase: 100, permiteIntermedio: false }],
      },
    ]
  }

  return modelo.verticales.map((vertical) => ({
    id: vertical.id,
    nombre: vertical.nombre,
    peso: vertical.peso,
    tipoEvaluacion: vertical.tipoEvaluacion,
    parametros: vertical.parametros.length
      ? vertical.parametros.map((parametro) => ({
          id: parametro.id,
          nombre: parametro.nombre,
          descripcion: parametro.descripcion ?? "",
          puntosBase: parametro.puntosBase,
          permiteIntermedio: parametro.permiteIntermedio,
        }))
      : [{ id: `${vertical.id}-parametro`, nombre: "", descripcion: "", puntosBase: 100, permiteIntermedio: false }],
  }))
}

export function ModeloForm({ onClose, onSaved, modelo }: ModeloFormProps) {
  const isEditing = Boolean(modelo)
  const [nombre, setNombre] = useState(modelo?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(modelo?.descripcion ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verticales, setVerticales] = useState<VerticalForm[]>(() => getInitialVerticales(modelo))

  const totalPeso = verticales.reduce((acc, v) => acc + v.peso, 0)

  const addVertical = () => {
    setVerticales([
      ...verticales,
      {
        id: Date.now().toString(),
        nombre: "",
        peso: 0,
        tipoEvaluacion: "distribuida",
        parametros: [{ id: Date.now().toString(), nombre: "", descripcion: "", puntosBase: 100, permiteIntermedio: false }],
      },
    ])
  }

  const removeVertical = (id: string) => {
    if (verticales.length > 1) {
      setVerticales(verticales.filter((v) => v.id !== id))
    }
  }

  const updateVertical = (id: string, field: keyof VerticalForm, value: unknown) => {
    setVerticales(
      verticales.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    )
  }

  const addParametro = (verticalId: string) => {
    setVerticales(
      verticales.map((v) =>
        v.id === verticalId
          ? {
              ...v,
              parametros: [
                ...v.parametros,
                { id: Date.now().toString(), nombre: "", descripcion: "", puntosBase: 0, permiteIntermedio: false },
              ],
            }
          : v
      )
    )
  }

  const removeParametro = (verticalId: string, parametroId: string) => {
    setVerticales(
      verticales.map((v) =>
        v.id === verticalId
          ? {
              ...v,
              parametros: v.parametros.filter((p) => p.id !== parametroId),
            }
          : v
      )
    )
  }

  const updateParametro = (
    verticalId: string,
    parametroId: string,
    field: keyof ParametroForm,
    value: unknown
  ) => {
    setVerticales(
      verticales.map((v) =>
        v.id === verticalId
          ? {
              ...v,
              parametros: v.parametros.map((p) =>
                p.id === parametroId ? { ...p, [field]: value } : p
              ),
            }
          : v
      )
    )
  }

  const saveModel = async (status: ControlModelInput["status"]) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        name: nombre,
        description: descripcion,
        status,
        verticals: verticales.map((vertical) => ({
          name: vertical.nombre,
          weight: vertical.peso,
          evaluationMode: vertical.tipoEvaluacion,
          parameters: vertical.parametros.map((parametro) => ({
            name: parametro.nombre,
            description: parametro.descripcion,
            basePoints: parametro.puntosBase,
            allowsIntermediate: parametro.permiteIntermedio,
          })),
        })),
      }

      if (modelo) {
        await updateControlModel(modelo.id, payload)
      } else {
        await createControlModel(payload)
      }

      await onSaved?.()
      onClose()
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo guardar el modelo."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del Modelo *</Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ecosistema Financiero V.1"
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el propósito de este modelo..."
            className="bg-secondary border-border"
            rows={3}
          />
        </div>
      </div>

      {/* Verticales */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-medium">Verticales</h3>
            <p className="text-sm text-muted-foreground">
              Define las dimensiones de evaluación
            </p>
          </div>
          <Badge className={totalPeso === 100 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
            Peso Total: {totalPeso}%
          </Badge>
        </div>

        <div className="space-y-4">
          {verticales.map((vertical, index) => (
            <Card key={vertical.id} className="bg-card border-border shadow-none rounded-xl">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 mb-1">
                  <GripVertical className="hidden h-5 w-5 text-muted-foreground mt-2 cursor-grab sm:block" />
                  <div className="min-w-0 flex-1 space-y-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Nombre de la Vertical</Label>
                        <Input
                          value={vertical.nombre}
                          onChange={(e) => updateVertical(vertical.id, "nombre", e.target.value)}
                          placeholder="Ej: Producto / Servicio"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Peso (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={vertical.peso}
                          onChange={(e) => updateVertical(vertical.id, "peso", parseInt(e.target.value) || 0)}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Evaluación</Label>
                        <Select
                          value={vertical.tipoEvaluacion}
                          onValueChange={(value) => updateVertical(vertical.id, "tipoEvaluacion", value)}
                        >
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="distribuida">Distribuida</SelectItem>
                            <SelectItem value="cascada">Cascada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Parámetros */}
                    <div className="border-t border-border pt-4">
                      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-foreground">Parámetros</p>
                        <Badge variant="outline" className="text-xs">
                          Total: {vertical.parametros.reduce((acc, p) => acc + p.puntosBase, 0)} / 100 pts
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {vertical.parametros.map((parametro) => (
                          <div
                            key={parametro.id}
                            className="grid min-h-[42px] grid-cols-1 items-center gap-2 rounded-md border border-border/70 bg-secondary px-2 py-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,2fr)_96px_auto] md:gap-1.5 md:py-1.5"
                          >
                            <Input
                              value={parametro.nombre}
                              onChange={(e) => updateParametro(vertical.id, parametro.id, "nombre", e.target.value)}
                              placeholder="Nombre del parámetro"
                              className="h-7 bg-background border-border text-sm"
                            />
                            <Input
                              value={parametro.descripcion}
                              onChange={(e) => updateParametro(vertical.id, parametro.id, "descripcion", e.target.value)}
                              placeholder="Descripción del parámetro"
                              className="h-7 bg-background border-border text-sm"
                            />
                            <div className="flex h-full items-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={parametro.puntosBase}
                                onChange={(e) =>
                                  updateParametro(vertical.id, parametro.id, "puntosBase", parseInt(e.target.value) || 0)
                                }
                                className="h-7 w-full bg-background border-border text-center text-sm"
                                placeholder="Puntaje"
                              />
                            </div>
                            <div className="flex h-full items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={parametro.permiteIntermedio}
                                  onCheckedChange={(checked) =>
                                    updateParametro(vertical.id, parametro.id, "permiteIntermedio", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Intermedio</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeParametro(vertical.id, parametro.id)}
                                disabled={vertical.parametros.length === 1}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => addParametro(vertical.id)}
                      >
                        <Plus className="h-3 w-3" />
                        Agregar Parámetro
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVertical(vertical.id)}
                    disabled={verticales.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={addVertical} className="w-full">
          <Plus className="h-4 w-4" />
          Agregar Vertical
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        {error && <p className="mr-auto text-sm text-destructive">{error}</p>}
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="secondary" onClick={() => saveModel("borrador")} disabled={isSubmitting || !nombre}>
          {isEditing ? "Guardar Cambios" : "Guardar como Borrador"}
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => saveModel("publicado")}
          disabled={isSubmitting || !nombre || totalPeso !== 100}
        >
          {isSubmitting ? "Guardando..." : "Publicar Modelo"}
        </Button>
      </div>
    </div>
  )
}
