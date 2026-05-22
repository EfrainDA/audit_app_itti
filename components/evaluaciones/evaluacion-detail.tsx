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
  Save,
  Send,
  Download,
  FileText,
  Plus,
  Trash2,
} from "lucide-react"
import {
  type Control,
  type Vertical,
  getScoreColor,
  getScoreBgColor,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import {
  fetchAnswersForControl,
  finalizeEvaluation,
  saveEvaluationDraft,
  sendControlToReplica,
  type EvaluationAnswerInput,
} from "@/lib/supabase-data"
import { downloadCsv } from "@/lib/export"
import { getErrorMessage } from "@/lib/error-message"

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

const createEmptyRespuesta = (parametroId: string): Respuesta => ({
  parametroId,
  valor: null,
  personasAuditadas: [""],
  cargos: [""],
  comentario: "",
})

export function EvaluacionDetail({ controlId }: EvaluacionDetailProps) {
  const { data, refresh } = useAppData()
  const { appUser } = useAuth()
  // Buscar el control en los loteVerticales
  let control: Control | undefined
  let loteVertical = data.loteVerticales.find((lv) => {
    const found = lv.controles.find((c) => c.id === controlId)
    if (found) {
      control = found
      return true
    }
    return false
  })

  const lote = data.lotes.find((l) => l.id === loteVertical?.loteId)
  const unidad = data.unidades.find((u) => u.id === lote?.unidadNegocioId)
  const modelo = data.modelos.find((m) => m.id === lote?.modeloControlId)
  const vertical = modelo?.verticales.find((v) => v.id === loteVertical?.verticalId)
  const auditor = data.users.find((u) => u.id === control?.auditorId)

  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({})
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canEditEvaluation = appUser?.role === "auditor" && control?.auditorId === appUser.id

  useEffect(() => {
    fetchAnswersForControl(controlId)
      .then((answers) => {
        setRespuestas(
          Object.fromEntries(
            answers.map((answer) => [
              answer.parametroId,
              {
                parametroId: answer.parametroId,
                valor: answer.valor,
                personasAuditadas: answer.personasAuditadas,
                cargos: answer.cargos,
                comentario: answer.comentario,
              },
            ]),
          ),
        )
        if (answers.length) setAutoSaveStatus("saved")
      })
      .catch((loadError) => setFormError(getErrorMessage(loadError, "No se pudieron cargar las respuestas.")))
  }, [controlId])

  // Implementación de autoguardado con debounce (retraso de 1.5s)
  useEffect(() => {
    if (!canEditEvaluation) return
    if (Object.keys(respuestas).length === 0) return

    setAutoSaveStatus("saving")

    const timer = setTimeout(() => {
      const answers = Object.values(respuestas).filter((respuesta): respuesta is Respuesta & { valor: Exclude<RespuestaValor, null> } => respuesta.valor !== null)
      saveEvaluationDraft(
        controlId,
        answers.map((respuesta) => ({
          parametroId: respuesta.parametroId,
          valor: respuesta.valor,
          comentario: respuesta.comentario,
          personasAuditadas: respuesta.personasAuditadas,
          cargos: respuesta.cargos,
        })),
      )
        .then(() => setAutoSaveStatus("saved"))
        .catch((saveError) => {
          setFormError(getErrorMessage(saveError, "No se pudo guardar el borrador."))
          setAutoSaveStatus("idle")
        })
    }, 1500)

    return () => clearTimeout(timer)
  }, [canEditEvaluation, respuestas, controlId])

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

  const currentControl = control
  const currentLote = lote

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

  const getAnswersPayload = (): EvaluationAnswerInput[] =>
    Object.values(respuestas)
      .filter((respuesta): respuesta is Respuesta & { valor: Exclude<RespuestaValor, null> } => respuesta.valor !== null)
      .map((respuesta) => ({
        parametroId: respuesta.parametroId,
        valor: respuesta.valor,
        comentario: respuesta.comentario,
        personasAuditadas: respuesta.personasAuditadas,
        cargos: respuesta.cargos,
      }))

  const handleSaveDraft = async () => {
    if (!canEditEvaluation) return
    setFormError(null)
    setIsSubmitting(true)

    try {
      await saveEvaluationDraft(controlId, getAnswersPayload())
      setAutoSaveStatus("saved")
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo guardar el borrador."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportEvaluation = () => {
    downloadCsv(
      `evaluacion-${controlId}.csv`,
      vertical.parametros.map((parametro) => {
        const respuesta = {
          ...createEmptyRespuesta(parametro.id),
          ...respuestas[parametro.id],
        }

        return {
          control: currentControl.identificador,
          vertical: vertical.nombre,
          parametro: parametro.nombre,
          respuesta: respuesta.valor ?? "",
          comentario: respuesta.comentario,
          personasAuditadas: respuesta.personasAuditadas.filter(Boolean).join("; "),
          cargos: respuesta.cargos.filter(Boolean).join("; "),
          puntosBase: parametro.puntosBase,
        }
      }),
    )
  }

  // Calcular progreso basado en parámetros de la vertical
  const totalParametros = vertical.parametros.length
  const parametroIds = new Set(vertical.parametros.map((parametro) => parametro.id))
  const respuestasDeLaVertical = Object.values(respuestas).filter((respuesta) => parametroIds.has(respuesta.parametroId))
  const respondidos = respuestasDeLaVertical.filter((r) => r.valor !== null).length
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

  const scoreCalculado = calcularScore()
  const scoreActual = respondidos > 0 ? scoreCalculado : control.scoreControl ?? scoreCalculado

  const handleSendToReplica = async () => {
    if (!canEditEvaluation) return
    setFormError(null)
    setIsSubmitting(true)

    try {
      await handleSaveDraft()
      await sendControlToReplica(currentControl.id)
      await refresh()
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo enviar a replica."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalizeEvaluation = async () => {
    if (!canEditEvaluation) return
    setFormError(null)
    setIsSubmitting(true)

    try {
      await finalizeEvaluation({
        lotId: currentLote.id,
        controlId: currentControl.id,
        score: scoreCalculado,
        answers: getAnswersPayload(),
      })
      await refresh()
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo finalizar la evaluacion."))
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                {autoSaveStatus !== "idle" && (
                  <div className="flex h-8 items-center rounded-md border border-border bg-secondary/60 px-3 text-xs font-medium text-muted-foreground">
                    {autoSaveStatus === "saving" ? "Guardando..." : "Guardado automático"}
                  </div>
                )}
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportEvaluation}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                {canEditEvaluation && (
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleSaveDraft} disabled={isSubmitting}>
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                )}
                {canEditEvaluation && control.estado !== "terminado" && (
                  <Button size="sm" className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 sm:flex-none" onClick={handleSendToReplica} disabled={isSubmitting}>
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
      {formError && (
        <Card className="border-destructive/25 bg-destructive/10">
          <CardContent className="p-3 text-sm text-destructive">{formError}</CardContent>
        </Card>
      )}

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
                    <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-primary text-sm font-medium">{index + 1}</span>
                      </div>
                      <div className="min-w-0">
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
                      disabled={!canEditEvaluation}
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
                        disabled={!canEditEvaluation}
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
                      disabled={!canEditEvaluation}
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
                      disabled={!canEditEvaluation}
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
                            disabled={!canEditEvaluation}
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
                                disabled={!canEditEvaluation}
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
                                  disabled={!canEditEvaluation}
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
                            disabled={!canEditEvaluation}
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
                                disabled={!canEditEvaluation}
                              />
                              {respuesta.cargos.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mt-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveRespuestaListItem(parametro.id, "cargos", cargoIndex)}
                                  disabled={!canEditEvaluation}
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
                        disabled={!canEditEvaluation}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      {/* Acciones finales */}
      {canEditEvaluation && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Progreso de Evaluación</p>
                <p className="text-sm text-muted-foreground">
                  {respondidos} de {totalParametros} parámetros evaluados
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleSaveDraft} disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
                  onClick={handleFinalizeEvaluation}
                  disabled={isSubmitting || respondidos < totalParametros}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar Evaluación
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
