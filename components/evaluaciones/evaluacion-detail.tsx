"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  Upload,
  Save,
  Send,
  Download,
  FileText,
  Plus,
  Trash2,
} from "lucide-react"
import {
  mockLotes,
  mockUnidades,
  mockUsers,
  mockModelos,
  mockLoteVerticales,
  type Control,
  type Vertical,
  getScoreColor,
  getScoreBgColor,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface EvaluacionDetailProps {
  controlId: string
}

type RespuestaValor = 'cumple' | 'intermedio' | 'no_cumple' | 'na' | null

interface Respuesta {
  parametroId: string
  valor: RespuestaValor
  personasAuditadas: string[]
  cargos: string[]
  comentario: string
}

const getStorageKey = (controlId: string) => `qualittyx-evaluacion-${controlId}`

const createEmptyRespuesta = (parametroId: string): Respuesta => ({
  parametroId,
  valor: null,
  personasAuditadas: [""],
  cargos: [""],
  comentario: "",
})

export function EvaluacionDetail({ controlId }: EvaluacionDetailProps) {
  // Buscar el control en los loteVerticales
  let control: Control | undefined
  let loteVertical = mockLoteVerticales.find((lv) => {
    const found = lv.controles.find((c) => c.id === controlId)
    if (found) {
      control = found
      return true
    }
    return false
  })

  const lote = mockLotes.find((l) => l.id === loteVertical?.loteId)
  const unidad = mockUnidades.find((u) => u.id === lote?.unidadNegocioId)
  const modelo = mockModelos.find((m) => m.id === lote?.modeloControlId)
  const vertical = modelo?.verticales.find((v) => v.id === loteVertical?.verticalId)
  const auditor = mockUsers.find((u) => u.id === control?.auditorId)

  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({})
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  useEffect(() => {
    const saved = window.localStorage.getItem(getStorageKey(controlId))
    if (!saved) return

    try {
      setRespuestas(JSON.parse(saved) as Record<string, Respuesta>)
      setAutoSaveStatus("saved")
    } catch {
      window.localStorage.removeItem(getStorageKey(controlId))
    }
  }, [controlId])

  // Implementación de autoguardado con debounce (retraso de 1.5s)
  useEffect(() => {
    if (Object.keys(respuestas).length === 0) return

    setAutoSaveStatus("saving")

    const timer = setTimeout(() => {
      window.localStorage.setItem(getStorageKey(controlId), JSON.stringify(respuestas))
      console.log("Auto-saving responses for control:", controlId, respuestas)
      setAutoSaveStatus("saved")
    }, 1500)

    return () => clearTimeout(timer)
  }, [respuestas, controlId])

  if (!control || !vertical || !lote || !modelo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Control no encontrado</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/evaluaciones">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    )
  }

  const handleSetRespuesta = (parametroId: string, valor: RespuestaValor) => {
    setRespuestas((prev) => ({
      ...prev,
      [parametroId]: {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
        valor,
      },
    }))
  }

  const handleSetComentario = (parametroId: string, comentario: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [parametroId]: {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
        comentario,
      },
    }))
  }

  const handleSetRespuestaListItem = (
    parametroId: string,
    field: "personasAuditadas" | "cargos",
    index: number,
    value: string
  ) => {
    setRespuestas((prev) => {
      const current = {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
      }
      const nextValues = [...current[field]]
      nextValues[index] = value

      return {
        ...prev,
        [parametroId]: {
          ...current,
          [field]: nextValues,
        },
      }
    })
  }

  const handleAddRespuestaListItem = (parametroId: string, field: "personasAuditadas" | "cargos") => {
    setRespuestas((prev) => {
      const current = {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
      }

      return {
        ...prev,
        [parametroId]: {
          ...current,
          [field]: [...current[field], ""],
        },
      }
    })
  }

  const handleRemoveRespuestaListItem = (
    parametroId: string,
    field: "personasAuditadas" | "cargos",
    index: number
  ) => {
    setRespuestas((prev) => {
      const current = {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
      }
      const nextValues = current[field].filter((_, itemIndex) => itemIndex !== index)

      return {
        ...prev,
        [parametroId]: {
          ...current,
          [field]: nextValues.length > 0 ? nextValues : [""],
        },
      }
    })
  }

  const handleSaveDraft = () => {
    window.localStorage.setItem(getStorageKey(controlId), JSON.stringify(respuestas))
    setAutoSaveStatus("saved")
  }

  // Calcular progreso basado en parámetros de la vertical
  const totalParametros = vertical.parametros.length
  const respondidos = Object.values(respuestas).filter((r) => r.valor !== null).length
  const progreso = totalParametros > 0 ? (respondidos / totalParametros) * 100 : 0

  // Calcular score provisional
  const calcularScore = () => {
    let puntosObtenidos = 0
    let puntosTotal = 0

    vertical.parametros.forEach((param) => {
      const resp = respuestas[param.id]
      puntosTotal += param.puntosBase

      if (resp?.valor === "cumple") {
        puntosObtenidos += param.puntosBase
      } else if (resp?.valor === "intermedio") {
        puntosObtenidos += param.puntosBase * 0.5
      } else if (resp?.valor === "na") {
        puntosTotal -= param.puntosBase // No se cuenta
      }
    })

    if (puntosTotal === 0) return null
    return Math.round((puntosObtenidos / puntosTotal) * 100)
  }

  const scoreActual = control.scoreControl ?? calcularScore()

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/evaluaciones">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Evaluaciones
        </Link>
      </Button>

      {/* Header Info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_304px]">
        <Card className="bg-card border-border py-0">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mono">{control.identificador}</h2>
                  <Badge className={getEstadoBadgeColor(control.estado)}>
                    {formatEstado(control.estado)}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground">Unidad de Negocio:</span> {unidad?.nombre}
                  </p>
                  {auditor && (
                    <p>
                      <span className="text-foreground">Auditor:</span> {auditor.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {autoSaveStatus !== "idle" && (
                  <div className="flex h-8 items-center rounded-md border border-border bg-secondary/60 px-3 text-xs font-medium text-muted-foreground">
                    {autoSaveStatus === "saving" ? "Guardando..." : "Guardado automático"}
                  </div>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
                {control.estado !== "terminado" && (
                  <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground">
                    <Send className="h-4 w-4" />
                    Enviar a Réplica
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("bg-card border-border py-0", scoreActual !== null && getScoreBgColor(scoreActual))}>
          <CardContent className="p-5 text-center">
            <p className={cn("text-4xl font-bold leading-none", scoreActual !== null && getScoreColor(scoreActual))}>
              {scoreActual !== null ? scoreActual : "-"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Puntuación Lograda</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Progreso</span>
                <span>{respondidos}/{totalParametros}</span>
              </div>
              <Progress value={progreso} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Info */}
      <Card className="bg-card border-border py-0">
        <CardHeader className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <span className="font-bold text-primary">{vertical.peso}%</span>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">{vertical.nombre}</CardTitle>
              <p className="truncate text-sm text-muted-foreground">
                {vertical.descripcion} | Evaluación {vertical.tipoEvaluacion === "cascada" ? "en Cascada" : "Distribuida"}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Parámetros a Evaluar */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Parámetros a Evaluar ({vertical.parametros.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vertical.parametros.map((parametro, index) => {
            const respuesta = {
              ...createEmptyRespuesta(parametro.id),
              ...respuestas[parametro.id],
            }
            const tieneRespuesta = respuesta.valor !== null && respuesta.valor !== undefined

            return (
              <Card
                key={parametro.id}
                className={cn(
                  "bg-secondary border-border transition-colors",
                  tieneRespuesta && "border-l-4",
                  respuesta?.valor === "cumple" && "border-l-success",
                  respuesta?.valor === "intermedio" && "border-l-warning",
                  respuesta?.valor === "no_cumple" && "border-l-destructive",
                  respuesta?.valor === "na" && "border-l-muted-foreground"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-primary text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <h5 className="font-medium">{parametro.nombre}</h5>
                        {parametro.descripcion && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {parametro.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{parametro.puntosBase} pts</Badge>
                  </div>

                  {/* Preguntas guía */}
                  {parametro.preguntas.length > 0 && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Criterios de evaluación:</p>
                      {parametro.preguntas.map((pregunta) => (
                        <p key={pregunta.id} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {pregunta.texto}
                          {pregunta.evidenciaObligatoria && (
                            <Badge variant="outline" className="text-xs shrink-0">Evidencia req.</Badge>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Botones de Respuesta */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      size="sm"
                      variant={respuesta?.valor === "cumple" ? "default" : "outline"}
                      className={cn(
                        respuesta?.valor === "cumple" && "bg-success hover:bg-success/90 text-success-foreground"
                      )}
                      onClick={() => handleSetRespuesta(parametro.id, "cumple")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Cumple (100%)
                    </Button>
                    {parametro.permiteIntermedio && (
                      <Button
                        size="sm"
                        variant={respuesta?.valor === "intermedio" ? "default" : "outline"}
                        className={cn(
                          respuesta?.valor === "intermedio" && "bg-warning hover:bg-warning/90 text-warning-foreground"
                        )}
                        onClick={() => handleSetRespuesta(parametro.id, "intermedio")}
                      >
                        <MinusCircle className="h-4 w-4" />
                        Intermedio (50%)
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={respuesta?.valor === "no_cumple" ? "default" : "outline"}
                      className={cn(
                        respuesta?.valor === "no_cumple" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      )}
                      onClick={() => handleSetRespuesta(parametro.id, "no_cumple")}
                    >
                      <XCircle className="h-4 w-4" />
                      No Cumple (0%)
                    </Button>
                    <Button
                      size="sm"
                      variant={respuesta?.valor === "na" ? "default" : "outline"}
                      className={cn(
                        respuesta?.valor === "na" && "bg-muted text-muted-foreground"
                      )}
                      onClick={() => handleSetRespuesta(parametro.id, "na")}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      N/A
                    </Button>
                  </div>

                  {/* Comentario y Evidencia */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Personas auditadas</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddRespuestaListItem(parametro.id, "personasAuditadas")}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {respuesta.personasAuditadas.map((persona, personIndex) => (
                            <div key={`persona-${parametro.id}-${personIndex}`} className="flex gap-2">
                              <Textarea
                                placeholder="Nombre de la persona auditada..."
                                className="bg-background border-border min-h-[42px]"
                                value={persona}
                                onChange={(e) =>
                                  handleSetRespuestaListItem(parametro.id, "personasAuditadas", personIndex, e.target.value)
                                }
                              />
                              {respuesta.personasAuditadas.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mt-1 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    handleRemoveRespuestaListItem(parametro.id, "personasAuditadas", personIndex)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Cargo</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddRespuestaListItem(parametro.id, "cargos")}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {respuesta.cargos.map((cargo, cargoIndex) => (
                            <div key={`cargo-${parametro.id}-${cargoIndex}`} className="flex gap-2">
                              <Textarea
                                placeholder="Cargo o rol..."
                                className="bg-background border-border min-h-[42px]"
                                value={cargo}
                                onChange={(e) =>
                                  handleSetRespuestaListItem(parametro.id, "cargos", cargoIndex, e.target.value)
                                }
                              />
                              {respuesta.cargos.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mt-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveRespuestaListItem(parametro.id, "cargos", cargoIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Comentario / Hallazgo</Label>
                      <Textarea
                        placeholder="Describe el hallazgo o justificación..."
                        className="mt-1 bg-background border-border min-h-[60px]"
                        value={respuesta.comentario}
                        onChange={(e) => handleSetComentario(parametro.id, e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Adjuntar Evidencia
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      {/* Acciones finales */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Progreso de Evaluación</p>
              <p className="text-sm text-muted-foreground">
                {respondidos} de {totalParametros} parámetros evaluados
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Borrador
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                disabled={respondidos < totalParametros}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar Evaluación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


