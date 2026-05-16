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

interface ModeloFormProps {
  onClose: () => void
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
  puntosBase: number
  permiteIntermedio: boolean
}

export function ModeloForm({ onClose }: ModeloFormProps) {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [verticales, setVerticales] = useState<VerticalForm[]>([
    {
      id: "1",
      nombre: "",
      peso: 100,
      tipoEvaluacion: "distribuida",
      parametros: [{ id: "1", nombre: "", puntosBase: 100, permiteIntermedio: false }],
    },
  ])

  const totalPeso = verticales.reduce((acc, v) => acc + v.peso, 0)

  const addVertical = () => {
    setVerticales([
      ...verticales,
      {
        id: Date.now().toString(),
        nombre: "",
        peso: 0,
        tipoEvaluacion: "distribuida",
        parametros: [{ id: Date.now().toString(), nombre: "", puntosBase: 100, permiteIntermedio: false }],
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
                { id: Date.now().toString(), nombre: "", puntosBase: 0, permiteIntermedio: false },
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

  const handleSubmit = () => {
    // In a real app, this would save to the database
    console.log({ nombre, descripcion, verticales })
    onClose()
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
            placeholder="Ej: Modelo Operativo 2026"
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
        <div className="flex items-center justify-between">
          <div>
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
            <Card key={vertical.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label>Nombre de Vertical</Label>
                        <Input
                          value={vertical.nombre}
                          onChange={(e) => updateVertical(vertical.id, "nombre", e.target.value)}
                          placeholder="Ej: Cumplimiento Normativo"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
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
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Parámetros</p>
                        <Badge variant="outline" className="text-xs">
                          Total: {vertical.parametros.reduce((acc, p) => acc + p.puntosBase, 0)} / 100 pts
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {vertical.parametros.map((parametro) => (
                          <div key={parametro.id} className="flex items-center gap-2 bg-secondary p-2 rounded">
                            <Input
                              value={parametro.nombre}
                              onChange={(e) => updateParametro(vertical.id, parametro.id, "nombre", e.target.value)}
                              placeholder="Nombre del parámetro"
                              className="flex-1 bg-background border-border h-8"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={parametro.puntosBase}
                              onChange={(e) =>
                                updateParametro(vertical.id, parametro.id, "puntosBase", parseInt(e.target.value) || 0)
                              }
                              className="w-20 bg-background border-border h-8"
                              placeholder="Pts"
                            />
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
                              className="h-8 w-8"
                              onClick={() => removeParametro(vertical.id, parametro.id)}
                              disabled={vertical.parametros.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => addParametro(vertical.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
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
          <Plus className="h-4 w-4 mr-2" />
          Agregar Vertical
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="secondary">
          Guardar como Borrador
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={!nombre || totalPeso !== 100}
        >
          Publicar Modelo
        </Button>
      </div>
    </div>
  )
}
