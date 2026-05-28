"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  FileText,
  ChevronDown,
  Paperclip,
  Plus,
  Trash2,
  X,
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
  saveAnswerEvidenceFiles,
  saveEvaluationDraft,
  sendControlToReplica,
  type EvaluationAnswerInput,
} from "@/lib/supabase-data"
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

const respuestaValorLabels: Record<Exclude<RespuestaValor, null>, string> = {
  cumple: "Cumple",
  intermedio: "Intermedio",
  no_cumple: "No cumple",
  na: "N/A",
}

const getRespuestaValorLabel = (valor: RespuestaValor) =>
  valor ? respuestaValorLabels[valor] : "Sin responder"

const maxEvidenceFiles = 3
const evidenceFileAccept = [
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".xlsb",
  ".csv",
  ".ods",
  ".ppt",
  ".pptx",
  ".pps",
  ".ppsx",
  ".odp",
  "image/*",
].join(",")
const evidenceFileExtensions = new Set(
  evidenceFileAccept
    .split(",")
    .filter((item) => item.startsWith("."))
    .map((item) => item.toLowerCase()),
)

const isAcceptedEvidenceFile = (file: File) => {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
  return file.type.startsWith("image/") || evidenceFileExtensions.has(extension)
}

export function EvaluacionDetail({ controlId }: EvaluacionDetailProps) {
  const { data, refresh } = useAppData()
  const { appUser } = useAuth()
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
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File[]>>({})
  const [expandedParametroId, setExpandedParametroId] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
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

  const getAnsweredParamsWithoutComment = () =>
    vertical.parametros.filter((parametro) => {
      const respuesta = respuestas[parametro.id]
      return respuesta?.valor !== null && respuesta?.valor !== undefined && !respuesta.comentario.trim()
    })

  const validateRequiredComments = () => {
    const missingComments = getAnsweredParamsWithoutComment()
    if (missingComments.length === 0) return true

    const firstMissing = missingComments[0]
    setExpandedParametroId(firstMissing.id)
    setFormError(
      missingComments.length === 1
        ? `Completa el comentario / hallazgo del parámetro "${firstMissing.nombre}".`
        : `Completa los comentarios / hallazgos obligatorios en ${missingComments.length} parámetros.`,
    )
    return false
  }

  const toggleParametro = (parametroId: string) => {
    setExpandedParametroId((currentParametroId) => currentParametroId === parametroId ? null : parametroId)
  }

  const handleEvidenceFilesChange = (parametroId: string, files: FileList | null) => {
    if (!files) return

    const selectedFiles = Array.from(files)
    const acceptedFiles = selectedFiles.filter(isAcceptedEvidenceFile)

    if (acceptedFiles.length !== selectedFiles.length) {
      setFormError("Solo se permiten PDF, Excel, documentos, presentaciones e imágenes.")
    }

    setEvidenceFiles((prev) => {
      const currentFiles = prev[parametroId] ?? []
      const remainingSlots = maxEvidenceFiles - currentFiles.length

      if (remainingSlots <= 0) {
        setFormError("Solo puedes adjuntar hasta 3 archivos por parámetro.")
        return prev
      }

      const nextFiles = acceptedFiles.slice(0, remainingSlots)
      if (acceptedFiles.length > remainingSlots) {
        setFormError("Solo puedes adjuntar hasta 3 archivos por parámetro.")
      }

      return {
        ...prev,
        [parametroId]: [...currentFiles, ...nextFiles],
      }
    })
  }

  const handleRemoveEvidenceFile = (parametroId: string, fileIndex: number) => {
    setEvidenceFiles((prev) => ({
      ...prev,
      [parametroId]: (prev[parametroId] ?? []).filter((_, index) => index !== fileIndex),
    }))
  }

  const handleSaveDraft = async () => {
    if (!canEditEvaluation) return
    setFormError(null)
    if (!validateRequiredComments()) return
    setIsSubmitting(true)

    try {
      await saveEvaluationDraft(controlId, getAnswersPayload())
      await saveAnswerEvidenceFiles(controlId, evidenceFiles)
      setEvidenceFiles({})
      setAutoSaveStatus("saved")
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo guardar el borrador."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalParametros = vertical.parametros.length
  const parametroIds = new Set(vertical.parametros.map((parametro) => parametro.id))
  const respuestasDeLaVertical = Object.values(respuestas).filter((respuesta) => parametroIds.has(respuesta.parametroId))
  const respondidos = respuestasDeLaVertical.filter((r) => r.valor !== null).length
  const progreso = totalParametros > 0 ? (respondidos / totalParametros) * 100 : 0
  const isComplete = totalParametros > 0 && respondidos === totalParametros

  const handleSaveOrFinalize = async () => {
    if (!canEditEvaluation) return
    if (isComplete) {
      const finalized = await handleFinalizeEvaluation()
      if (finalized) {
        router.push("/evaluaciones")
      }
      return
    }

    await handleSaveDraft()
  }

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
        puntosTotal -= param.puntosBase
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
    if (!validateRequiredComments()) return
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

  const handleFinalizeEvaluation = async (): Promise<boolean> => {
    if (!canEditEvaluation) return false
    setFormError(null)
    if (!validateRequiredComments()) return false
    setIsSubmitting(true)

    try {
      await finalizeEvaluation({
        lotId: currentLote.id,
        controlId: currentControl.id,
        score: scoreCalculado,
        answers: getAnswersPayload(),
      })
      await saveAnswerEvidenceFiles(currentControl.id, evidenceFiles)
      setEvidenceFiles({})
      await refresh()
      return true
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo finalizar la evaluacion."))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_304px]">
        <Card className="bg-card border-border py-0">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">{control.identificador}</h2>
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
                      <span className="text-foreground">{auditor.cargo || "Cargo"}:</span> {auditor.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 pr-2 md:w-auto md:justify-end md:pr-0">
                {autoSaveStatus !== "idle" && (
                  <div className="flex h-8 items-center rounded-md border border-border bg-secondary/60 px-3 text-xs font-medium text-muted-foreground">
                    {autoSaveStatus === "saving" ? "Guardando..." : "Guardado automático"}
                  </div>
                )}
                {canEditEvaluation && control.estado !== "terminado" && (
                  <Button size="sm" className="flex-none bg-warning text-warning-foreground hover:bg-warning/90" onClick={handleSendToReplica} disabled={isSubmitting}>
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

      {formError && (
        <Card className="border-destructive/25 bg-destructive/10">
          <CardContent className="p-3 text-sm text-destructive">{formError}</CardContent>
        </Card>
      )}

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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Parámetros a Evaluar ({vertical.parametros.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {vertical.parametros.map((parametro, index) => {
            const respuesta = {
              ...createEmptyRespuesta(parametro.id),
              ...respuestas[parametro.id],
            }
            const tieneRespuesta = respuesta.valor !== null && respuesta.valor !== undefined
            const missingRequiredComment = tieneRespuesta && !respuesta.comentario.trim()
            const expanded = expandedParametroId === parametro.id
            const valorLabel = getRespuestaValorLabel(respuesta.valor)
            const parametroEvidenceFiles = evidenceFiles[parametro.id] ?? []

            return (
              <Card
                key={parametro.id}
                className={cn(
                  "overflow-hidden bg-card shadow-none transition-colors",
                  "border border-border/70",
                  tieneRespuesta && "ring-1",
                  respuesta?.valor === "cumple" && "border-success/60 ring-success/35",
                  respuesta?.valor === "intermedio" && "border-warning/60 ring-warning/35",
                  respuesta?.valor === "no_cumple" && "border-destructive/60 ring-destructive/35",
                  respuesta?.valor === "na" && "border-muted/60 ring-muted-foreground/30"
                )}
              >
                <div
                  className="flex min-h-[42px] cursor-pointer items-center justify-between gap-3 px-3 py-1.5 sm:min-h-[44px] sm:px-4"
                  onClick={() => toggleParametro(parametro.id)}
                  role="button"
                  aria-expanded={expanded}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/12">
                      <span className="text-[11px] font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="truncate text-[13px] font-semibold leading-4 text-foreground sm:text-sm">{parametro.nombre}</h5>
                        <Badge variant="outline" className="h-5 shrink-0 px-2 text-[10px] font-semibold">{parametro.puntosBase} pts</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-3 text-muted-foreground">{valorLabel}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    expanded && "rotate-180"
                  )} />
                </div>

                {expanded && (
                  <CardContent className="animate-in fade-in-0 slide-in-from-top-2 border-t border-border/60 p-5 duration-200 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_148px] lg:items-start">
                      <div className="space-y-4">
                        {parametro.descripcion && (
                          <div className="rounded-lg border border-border/50 bg-secondary/30 px-3.5 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Descripción</p>
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                              {parametro.descripcion}
                            </p>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-muted-foreground">Personas auditadas</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handleAddRespuestaListItem(parametro.id, "personasAuditadas")}
                                disabled={!canEditEvaluation}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Agregar
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {respuesta.personasAuditadas.map((persona, personIndex) => (
                                <div key={`persona-${parametro.id}-${personIndex}`} className="flex gap-2">
                                  <Textarea
                                    placeholder="Nombre de la persona auditada..."
                                    className="min-h-[42px] border-border bg-background"
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
                              <Label className="text-xs font-semibold text-muted-foreground">Cargo</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handleAddRespuestaListItem(parametro.id, "cargos")}
                                disabled={!canEditEvaluation}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Agregar
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {respuesta.cargos.map((cargo, cargoIndex) => (
                                <div key={`cargo-${parametro.id}-${cargoIndex}`} className="flex gap-2">
                                  <Textarea
                                    placeholder="Cargo o rol..."
                                    className="min-h-[42px] border-border bg-background"
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

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Comentario / Hallazgo <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            placeholder="Describe el hallazgo o justificación..."
                            className={cn(
                              "min-h-[64px] border-border bg-background",
                              missingRequiredComment && "border-destructive/70 focus-visible:ring-destructive/30"
                            )}
                            value={respuesta.comentario}
                            onChange={(e) => handleSetComentario(parametro.id, e.target.value)}
                            disabled={!canEditEvaluation}
                          />
                          {missingRequiredComment && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>El comentario / hallazgo es obligatorio para este parámetro.</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-secondary/15 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground">Adjuntar evidencia</Label>
                              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                Máximo 3 archivos: PDF, Excel, documentos, presentaciones o imágenes.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              disabled={!canEditEvaluation || parametroEvidenceFiles.length >= maxEvidenceFiles}
                              asChild
                            >
                              <label>
                                <Paperclip className="mr-1 h-3 w-3" />
                                Adjuntar
                                <input
                                  type="file"
                                  className="hidden"
                                  multiple
                                  accept={evidenceFileAccept}
                                  disabled={!canEditEvaluation || parametroEvidenceFiles.length >= maxEvidenceFiles}
                                  onChange={(event) => {
                                    handleEvidenceFilesChange(parametro.id, event.target.files)
                                    event.target.value = ""
                                  }}
                                />
                              </label>
                            </Button>
                          </div>
                          {parametroEvidenceFiles.length > 0 && (
                            <div className="grid gap-2">
                              {parametroEvidenceFiles.map((file, fileIndex) => (
                                <div
                                  key={`${parametro.id}-${file.name}-${fileIndex}`}
                                  className="flex min-h-8 items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-foreground">{file.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveEvidenceFile(parametro.id, fileIndex)}
                                    disabled={!canEditEvaluation}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid w-full gap-2 rounded-lg border border-border/60 bg-secondary/20 p-2 shadow-none sm:w-36 lg:w-full">
                        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado</p>
                        <Button
                          size="sm"
                          variant={respuesta?.valor === "cumple" ? "default" : "outline"}
                          onClick={() => handleSetRespuesta(parametro.id, "cumple")}
                          disabled={!canEditEvaluation}
                          className={cn(
                            "h-8 w-full justify-start px-3 text-left text-xs",
                            respuesta?.valor === "cumple" && "bg-success hover:bg-success/90 text-success-foreground"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Cumple
                        </Button>
                        {parametro.permiteIntermedio && (
                          <Button
                            size="sm"
                            variant={respuesta?.valor === "intermedio" ? "default" : "outline"}
                            onClick={() => handleSetRespuesta(parametro.id, "intermedio")}
                            disabled={!canEditEvaluation}
                            className={cn(
                              "h-8 w-full justify-start px-3 text-left text-xs",
                              respuesta?.valor === "intermedio" && "bg-warning hover:bg-warning/90 text-warning-foreground"
                            )}
                          >
                            <MinusCircle className="h-3.5 w-3.5" />
                            Intermedio
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={respuesta?.valor === "no_cumple" ? "default" : "outline"}
                          onClick={() => handleSetRespuesta(parametro.id, "no_cumple")}
                          disabled={!canEditEvaluation}
                          className={cn(
                            "h-8 w-full justify-start px-3 text-left text-xs",
                            respuesta?.valor === "no_cumple" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          )}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          No cumple
                        </Button>
                        <Button
                          size="sm"
                          variant={respuesta?.valor === "na" ? "default" : "outline"}
                          onClick={() => handleSetRespuesta(parametro.id, "na")}
                          disabled={!canEditEvaluation}
                          className={cn(
                            "h-8 w-full justify-start px-3 text-left text-xs",
                            respuesta?.valor === "na" && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          N/A
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </CardContent>
      </Card>

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
              <div className="w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSaveOrFinalize}
                  disabled={isSubmitting}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {isComplete ? "Finalizar" : "Guardar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start pt-1">
        <Button variant="ghost" asChild>
          <Link href="/evaluaciones">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Evaluaciones
          </Link>
        </Button>
      </div>
    </div>
  )
}
