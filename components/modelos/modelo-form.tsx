"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { FileText, Layers3, Plus, Trash2 } from "lucide-react"
import { createControlModel, updateControlModel, type ControlModelInput } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"
import type { ModeloControl } from "@/lib/data"

interface ModeloFormProps {
  onClose?: () => void
  onSaved?: () => Promise<void> | void
  modelo?: ModeloControl
  redirectOnSaved?: string
  cancelHref?: string
}

interface VerticalForm {
  id: string
  nombre: string
  peso: number
  tipoEvaluacion: "distribuida" | "cascada"
  parametros: ParametroForm[]
}

interface ParametroForm {
  id: string
  nombre: string
  descripcion: string
  puntosBase: number
  permiteIntermedio: boolean
}

function createEmptyParametro(id = Date.now().toString(), puntosBase = 100): ParametroForm {
  return {
    id,
    nombre: "",
    descripcion: "",
    puntosBase,
    permiteIntermedio: false,
  }
}

function getInitialVerticales(modelo?: ModeloControl): VerticalForm[] {
  if (!modelo?.verticales.length) {
    return [
      {
        id: "1",
        nombre: "",
        peso: 100,
        tipoEvaluacion: "distribuida",
        parametros: [createEmptyParametro("1", 100)],
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
      : [createEmptyParametro(`${vertical.id}-parametro`, 100)],
  }))
}

export function ModeloForm({ onClose, onSaved, modelo, redirectOnSaved, cancelHref }: ModeloFormProps) {
  const router = useRouter()
  const isEditing = Boolean(modelo)
  const [nombre, setNombre] = useState(modelo?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(modelo?.descripcion ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verticales, setVerticales] = useState<VerticalForm[]>(() => getInitialVerticales(modelo))

  const totalPeso = verticales.reduce((acc, vertical) => acc + vertical.peso, 0)
  const pesoCompleto = totalPeso === 100

  const addVertical = () => {
    setVerticales([
      ...verticales,
      {
        id: Date.now().toString(),
        nombre: "",
        peso: 0,
        tipoEvaluacion: "distribuida",
        parametros: [createEmptyParametro(Date.now().toString(), 100)],
      },
    ])
  }

  const removeVertical = (id: string) => {
    if (verticales.length > 1) {
      setVerticales(verticales.filter((vertical) => vertical.id !== id))
    }
  }

  const updateVertical = (id: string, field: keyof VerticalForm, value: unknown) => {
    setVerticales(
      verticales.map((vertical) => (vertical.id === id ? { ...vertical, [field]: value } : vertical)),
    )
  }

  const addParametro = (verticalId: string) => {
    setVerticales(
      verticales.map((vertical) =>
        vertical.id === verticalId
          ? {
              ...vertical,
              parametros: [...vertical.parametros, createEmptyParametro(Date.now().toString(), 0)],
            }
          : vertical,
      ),
    )
  }

  const removeParametro = (verticalId: string, parametroId: string) => {
    setVerticales(
      verticales.map((vertical) =>
        vertical.id === verticalId
          ? { ...vertical, parametros: vertical.parametros.filter((parametro) => parametro.id !== parametroId) }
          : vertical,
      ),
    )
  }

  const updateParametro = (
    verticalId: string,
    parametroId: string,
    field: keyof ParametroForm,
    value: unknown,
  ) => {
    setVerticales(
      verticales.map((vertical) =>
        vertical.id === verticalId
          ? {
              ...vertical,
              parametros: vertical.parametros.map((parametro) =>
                parametro.id === parametroId ? { ...parametro, [field]: value } : parametro,
              ),
            }
          : vertical,
      ),
    )
  }

  const closeOrRedirect = () => {
    if (redirectOnSaved) {
      router.push(redirectOnSaved)
      return
    }

    onClose?.()
  }

  const handleCancel = () => {
    if (cancelHref) {
      router.push(cancelHref)
      return
    }

    onClose?.()
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
      closeOrRedirect()
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo guardar el modelo."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Datos base</h3>
            <p className="text-xs text-muted-foreground">Identifica el modelo antes de construir su estructura.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del modelo *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej: Ecosistema Financiero V.1"
              className="h-10 border-border bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripcion</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Describe el proposito de este modelo..."
              className="min-h-10 border-border bg-card"
              rows={1}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2.5 rounded-lg border border-border/70 bg-card p-3 shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <Layers3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Estructura del modelo</h3>
              <p className="text-xs text-muted-foreground">Verticales, peso relativo y parametros evaluables.</p>
            </div>
          </div>
          <Badge className={pesoCompleto ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
            Peso total: {totalPeso}%
          </Badge>
        </div>

        <div className="space-y-2.5">
          {verticales.map((vertical, index) => (
            <Card key={vertical.id} className="relative rounded-lg border-border/70 bg-muted/15 py-0 shadow-none">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeVertical(vertical.id)}
                disabled={verticales.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="p-3 pr-10">
                <div className="min-w-0 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{vertical.nombre || "Nueva vertical"}</p>
                        <p className="text-xs text-muted-foreground">
                          {vertical.parametros.length}{" "}
                          {vertical.parametros.length === 1 ? "parametro configurado" : "parametros configurados"}
                        </p>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_7rem_13rem]">
                    <div className="space-y-1.5">
                      <Label>Nombre de la vertical</Label>
                      <Input
                        value={vertical.nombre}
                        onChange={(event) => updateVertical(vertical.id, "nombre", event.target.value)}
                        placeholder="Ej: Producto / Servicio"
                        className="h-9 border-border bg-card"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Peso (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={vertical.peso}
                        onChange={(event) => updateVertical(vertical.id, "peso", parseInt(event.target.value) || 0)}
                        className="h-9 border-border bg-card [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={vertical.tipoEvaluacion}
                        onValueChange={(value) => updateVertical(vertical.id, "tipoEvaluacion", value)}
                      >
                        <SelectTrigger className="h-9 w-full border-border bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distribuida">Distribuida</SelectItem>
                          <SelectItem value="cascada">Cascada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-2.5">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-foreground">Parametros</p>
                      <Badge variant="outline" className="text-xs">
                        Total: {vertical.parametros.reduce((acc, parametro) => acc + parametro.puntosBase, 0)} / 100 pts
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {vertical.parametros.map((parametro) => (
                        <div key={parametro.id} className="rounded-md border border-border/65 bg-card p-2">
                          <div className="grid min-h-[42px] grid-cols-1 items-start gap-2 md:grid-cols-[minmax(14rem,1fr)_minmax(24rem,2.4fr)_6rem_auto] md:gap-2">
                            <Input
                              value={parametro.nombre}
                              onChange={(event) => updateParametro(vertical.id, parametro.id, "nombre", event.target.value)}
                              placeholder="Nombre del parametro"
                              className="h-9 border-border bg-card text-sm"
                            />
                            <Textarea
                              value={parametro.descripcion}
                              onChange={(event) => updateParametro(vertical.id, parametro.id, "descripcion", event.target.value)}
                              placeholder="Descripcion del parametro"
                              className="min-h-9 border-border bg-card py-2 text-sm"
                              rows={1}
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={parametro.puntosBase}
                              onChange={(event) =>
                                updateParametro(vertical.id, parametro.id, "puntosBase", parseInt(event.target.value) || 0)
                              }
                              className="h-9 w-full border-border bg-card text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              placeholder="Puntaje"
                            />
                            <div className="flex h-9 items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={parametro.permiteIntermedio}
                                  onCheckedChange={(checked) =>
                                    updateParametro(vertical.id, parametro.id, "permiteIntermedio", checked)
                                  }
                                />
                                <span className="whitespace-nowrap text-xs text-muted-foreground">Intermedio</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeParametro(vertical.id, parametro.id)}
                                disabled={vertical.parametros.length === 1}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 h-8" onClick={() => addParametro(vertical.id)}>
                      <Plus className="h-3 w-3" />
                      Agregar Parametro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={addVertical} className="w-full">
          <Plus className="h-4 w-4" />
          Agregar Vertical
        </Button>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:justify-end">
        {error && <p className="mr-auto text-sm text-destructive">{error}</p>}
        <Button variant="outline" onClick={handleCancel}>
          {cancelHref ? "Volver" : "Cancelar"}
        </Button>
        <Button variant="secondary" onClick={() => saveModel("borrador")} disabled={isSubmitting || !nombre}>
          {isEditing ? "Guardar cambios" : "Guardar como borrador"}
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => saveModel("publicado")}
          disabled={isSubmitting || !nombre || totalPeso !== 100}
        >
          {isSubmitting ? "Guardando..." : "Publicar modelo"}
        </Button>
      </div>
    </div>
  )
}
