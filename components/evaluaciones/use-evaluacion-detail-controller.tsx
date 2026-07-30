"use client"

// Formulario de evaluación: administra respuestas, evidencias, borradores y cierre.
import { useAuth } from "@/components/auth/auth-provider"
import { ContentSkeleton, ErrorState } from "@/components/ui/async-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SafeImage } from "@/components/ui/safe-image"
import {
  calculateEvaluationScore,
  createEmptyRespuesta,
  getEvaluationProgress,
  isAcceptedEvidenceFile,
  MAX_EVIDENCE_FILES,
  toAnswerPayload,
  type EditableRespuesta as Respuesta,
  type RespuestaValor
} from "@/features/evaluations/domain/evaluation-answer"
import { useAppData } from "@/hooks/use-app-data"
import {
  formatEstado,
  getControlDisplayEstado,
  getEstadoBadgeColor,
  getScoreBgColor,
  getScoreColor,
  type Control,
} from "@/lib/data"
import { canEditAssignedControl } from "@/lib/domain/permissions"
import { getErrorMessage } from "@/lib/error-message"
import {
  fetchAnswersForControl,
  finalizeEvaluation,
  saveEvaluationDraft,
  type EvaluationAnswerInput,
} from "@/lib/repositories/supabase/evaluations"
import { saveAnswerEvidenceFiles } from "@/lib/repositories/supabase/evidences"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  Eye,
  Play
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface EvaluacionDetailProps {
  controlId: string
}


// Coordina carga, edición por vertical y acciones de guardado.
export function useEvaluacionDetailController({ controlId }: EvaluacionDetailProps) {
  const { data, isLoading, error: dataError, refresh } = useAppData({ domains: ["users", "settings", "models", "planning", "evaluations"] })
  const { appUser } = useAuth()
  const loteVertical = data.loteVerticales.find((lv) => lv.controles.some((item) => item.id === controlId))
  const control: Control | undefined = loteVertical?.controles.find((item) => item.id === controlId)

  const lote = data.lotes.find((l) => l.id === loteVertical?.loteId)
  const cicloLote = data.ciclos.find((item) => item.año === lote?.año && item.bimestre === lote?.ciclo)
  const unidad = data.unidades.find((u) => u.id === lote?.unidadNegocioId)
  const modelo = data.modelos.find((m) => m.id === lote?.modeloControlId)
  const vertical = modelo?.verticales.find((v) => v.id === loteVertical?.verticalId)
  const auditor = data.users.find((u) => u.id === control?.auditorId)
  const selectedLote = data.lotes.find((item) => item.id === controlId)
  const selectedUnidad = data.unidades.find((item) => item.id === selectedLote?.unidadNegocioId)
  const selectedModelo = data.modelos.find((item) => item.id === selectedLote?.modeloControlId)
  const selectedLoteVerticales = selectedLote
    ? data.loteVerticales.filter((item) => item.loteId === selectedLote.id)
    : []

  // Estado editable indexado por parámetro para actualizar cada respuesta sin búsquedas lineales.
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({})
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File[]>>({})
  const [activeParametroIndex, setActiveParametroIndex] = useState(0)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [areAnswersLoading, setAreAnswersLoading] = useState(true)
  const router = useRouter()
  const nowTime = Date.now()
  const cycleStartsAt = cicloLote ? new Date(`${cicloLote.fechaInicio}T00:00:00`).getTime() : null
  const cycleEndsAt = cicloLote ? new Date(`${cicloLote.fechaFin}T23:59:59`).getTime() : null
  const cycleIsEnabled = (cicloLote?.estado ?? "habilitado") === "habilitado"
  const cycleIsInForce = cycleIsEnabled && cycleStartsAt !== null && cycleEndsAt !== null && nowTime >= cycleStartsAt && nowTime <= cycleEndsAt
  const evaluationBlockedReason = !cicloLote
    ? "No se pudo validar el ciclo del lote."
    : !cycleIsEnabled
      ? "El ciclo del lote está deshabilitado."
      : cycleStartsAt !== null && nowTime < cycleStartsAt
        ? "La evaluación estará disponible cuando el ciclo del lote entre en vigor."
        : cycleEndsAt !== null && nowTime > cycleEndsAt
          ? "El ciclo del lote ya finalizó."
          : null
  const canEditEvaluation = !areAnswersLoading
    && appUser?.role === "auditor"
    && canEditAssignedControl(appUser.role, appUser.id, control?.auditorId)
    && cycleIsInForce
  const answeredControlIds = new Set(data.respuestas.map((answer) => answer.controlId))
  const hasLocalAnswers = Object.values(respuestas).some((respuesta) => respuesta.valor !== null)
  if (control && hasLocalAnswers) answeredControlIds.add(control.id)
  const displayEstado = control ? getControlDisplayEstado(control, answeredControlIds) : undefined

  // Hidrata respuestas y evidencias al cambiar de control o refrescar los datos.
  useEffect(() => {
    if (!control) {
      if (!isLoading) setAreAnswersLoading(false)
      return
    }

    setAreAnswersLoading(true)
    fetchAnswersForControl(controlId)
      .then((answers) => {
        const remoteAnswers = Object.fromEntries(
            answers.map((answer) => [
              answer.parametroId,
              {
                id: answer.id,
                parametroId: answer.parametroId,
                valor: answer.valor,
                personasAuditadas: answer.personasAuditadas,
                cargos: answer.cargos,
                areas: answer.areas,
                fechaRespuesta: answer.fechaRespuesta,
                comentario: answer.comentario,
                evidencias: answer.evidencias,
              },
            ]),
          )
        // Si el usuario alcanzó a modificar estado local, sus cambios prevalecen
        // sobre la respuesta remota en vez de ser reemplazados.
        setRespuestas((current) => ({ ...remoteAnswers, ...current }))
        if (answers.length) setAutoSaveStatus("saved")
      })
      .catch((loadError) => setFormError(getErrorMessage(loadError, "No se pudieron cargar las respuestas.")))
      .finally(() => setAreAnswersLoading(false))
  }, [control, controlId, isLoading])

  // Autosave diferido: evita una escritura por pulsación y no finaliza la evaluación.
  useEffect(() => {
    if (!canEditEvaluation) return
    if (Object.keys(respuestas).length === 0) return

    setAutoSaveStatus("saving")

    const timer = setTimeout(() => {
      saveEvaluationDraft(
        controlId,
        Object.values(respuestas).map(toAnswerPayload),
      )
        .then(() => setAutoSaveStatus("saved"))
        .catch((saveError) => {
          setFormError(getErrorMessage(saveError, "No se pudo guardar el borrador."))
          setAutoSaveStatus("error")
        })
    }, 1500)

    return () => clearTimeout(timer)
  }, [canEditEvaluation, respuestas, controlId])

  if (selectedLote && selectedModelo) {
    const selectedAuditores = selectedLote.auditores
      .map((id) => data.users.find((user) => user.id === id))
      .filter(Boolean)
    const completeLoteVerticales = selectedModelo.verticales.map((modeloVertical, index) => {
      const loteVertical = selectedLoteVerticales.find((item) => item.verticalId === modeloVertical.id)

      return loteVertical ?? {
        id: `lv-${selectedLote.id}-${modeloVertical.id}-${index}`,
        loteId: selectedLote.id,
        verticalId: modeloVertical.id,
        controles: [],
      }
    })
    const totalControles = completeLoteVerticales.reduce((acc, item) => acc + item.controles.length, 0)
    const controlesEnAvance = completeLoteVerticales.reduce(
      (acc, item) =>
        acc +
        item.controles.filter((itemControl) => getControlDisplayEstado(itemControl, answeredControlIds) !== "pendiente").length,
      0,
    )

    return (
      <div className="space-y-5">
        <Card className="border-border/70 bg-card">
          <CardContent className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
            <div className="min-w-0 space-y-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-secondary/35">
                  {selectedUnidad?.logo ? (
                    <SafeImage src={selectedUnidad.logo} alt={selectedUnidad.nombre} className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex min-h-12 min-w-0 items-center">
                  <p className="truncate text-2xl font-semibold leading-none tracking-tight text-foreground">{selectedUnidad?.nombre ?? "N/A"}</p>
                </div>
              </div>

              <div className="grid gap-1.5 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 font-semibold text-foreground">Estado:</span>
                  <Badge className={cn("h-5 rounded-full px-2 text-xs font-semibold", getEstadoBadgeColor(selectedLote.estado))}>
                    {formatEstado(selectedLote.estado)}
                  </Badge>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="shrink-0 font-semibold text-foreground">Ciclo de Control:</span>
                  <span className="truncate text-muted-foreground">{selectedLote.ciclo} - {selectedLote.año}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="shrink-0 font-semibold text-foreground">Modelo Aplicado:</span>
                  <span className="truncate text-muted-foreground">{selectedModelo.nombre}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="shrink-0 font-semibold text-foreground">Detalle del Modelo:</span>
                  <span className="truncate text-muted-foreground">{completeLoteVerticales.length} verticales</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="shrink-0 font-semibold text-foreground">Equipo de Control de Calidad:</span>
                  <span className="truncate text-muted-foreground">{selectedAuditores.map((item) => item?.name).join(", ") || "Sin auditores asignados"}</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-52 space-y-2 lg:ml-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground lg:text-right">Progreso general</p>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-2xl font-semibold leading-none text-foreground">{controlesEnAvance}</span>
                <span className="text-sm font-medium text-muted-foreground">/{totalControles}</span>
              </div>
              <Progress value={totalControles > 0 ? (controlesEnAvance / totalControles) * 100 : 0} className="h-2.5" />
              <p className="text-right text-xs text-muted-foreground">controles en avance</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {completeLoteVerticales.map((item) => {
            const itemVertical = selectedModelo.verticales.find((modeloVertical) => modeloVertical.id === item.verticalId)
            if (!itemVertical) return null

            const verticalEnAvance = item.controles.filter((itemControl) => getControlDisplayEstado(itemControl, answeredControlIds) !== "pendiente").length
            const verticalProgressWidth = item.controles.length > 0 ? (verticalEnAvance / item.controles.length) * 100 : 0
            const controlesConScore = item.controles.filter((itemControl) => itemControl.scoreControl !== undefined)
            const scorePromedio = controlesConScore.length
              ? Math.round(controlesConScore.reduce((acc, itemControl) => acc + (itemControl.scoreControl || 0), 0) / controlesConScore.length)
              : null

            return (
              <section key={item.id} className="overflow-hidden rounded-lg border border-border/70 bg-card">
                <div className="border-b border-border/60 px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">{itemVertical.peso}%</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-foreground">{itemVertical.nombre}</h4>
                        <p className="truncate text-xs text-muted-foreground">{itemVertical.parametros.length} parámetros configurados</p>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="min-w-[112px] flex-1">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Avance</span>
                            <span className="font-semibold text-foreground">{verticalEnAvance}/{item.controles.length}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${verticalProgressWidth}%` }} />
                          </div>
                        </div>
                        <div className={cn("min-w-[64px] rounded-md px-2 py-1 text-center", scorePromedio !== null ? getScoreBgColor(scorePromedio) : "bg-secondary")}>
                          <p className="text-xs font-medium text-muted-foreground">Logrado</p>
                          <p className={cn("font-semibold", scorePromedio !== null ? getScoreColor(scorePromedio) : "text-muted-foreground")}>
                            {scorePromedio !== null ? ((scorePromedio / 100) * itemVertical.peso).toFixed(1) : "0.0"}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="relative pl-5">
                    <div className="absolute bottom-1 left-1.5 top-1 w-px bg-border" />
                  {item.controles.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/80 bg-secondary/20 px-4 py-5 text-center text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">Sin controles para esta vertical</p>
                      <p className="text-xs">Cuando se agreguen controles en planificación aparecerán aquí.</p>
                    </div>
                  ) : (
                    item.controles.map((itemControl) => {
                      const itemAuditor = itemControl.auditorId ? data.users.find((user) => user.id === itemControl.auditorId) : null
                      const canEvaluateThisControl = appUser?.role === "auditor" && itemControl.auditorId === appUser.id
                      const itemDisplayEstado = getControlDisplayEstado(itemControl, answeredControlIds)

                      return (
                        <div key={itemControl.id} className="group relative grid gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/70 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-center">
                          <span className="absolute -left-[1.05rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary/70" />
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{itemControl.identificador}</span>
                              <Badge className={cn("h-5 rounded-full px-2 text-xs font-semibold", getEstadoBadgeColor(itemDisplayEstado))}>{formatEstado(itemDisplayEstado)}</Badge>
                              {itemControl.scoreControl !== undefined && (
                                <span className={`text-xs font-semibold ${getScoreColor(itemControl.scoreControl)}`}>{itemControl.scoreControl} pts</span>
                              )}
                            </div>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                              <span className="text-xs font-bold uppercase text-muted-foreground">
                                {itemAuditor ? itemAuditor.name.split(" ").map((namePart) => namePart[0]).join("") : "-"}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {itemAuditor ? itemAuditor.name : "Sin analista"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 md:justify-end">
                            {!canEvaluateThisControl || itemDisplayEstado === "terminado" ? (
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                                <Link href={`/evaluaciones/${itemControl.id}`}>
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  Ver
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" className="h-7 px-2 text-xs" asChild>
                                <Link href={`/evaluaciones/${itemControl.id}`}>
                                  <Play className="mr-1 h-3.5 w-3.5" />
                                  Evaluar
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        <div className="flex justify-start pt-1">
          <Button variant="outline" onClick={() => router.push("/evaluaciones")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <ContentSkeleton variant="detail" label="Cargando evaluación" />
  }

  if (dataError) {
    return <ErrorState description={dataError} onRetry={() => void refresh()} />
  }

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

  // Mutaciones locales del formulario; la persistencia queda centralizada más abajo.
  const handleSetRespuesta = (parametroId: string, valor: RespuestaValor) => {
    setRespuestas((prev) => ({
      ...prev,
      [parametroId]: {
        ...createEmptyRespuesta(parametroId),
        ...prev[parametroId],
        valor,
        fechaRespuesta:
          prev[parametroId]?.valor === valor && prev[parametroId]?.fechaRespuesta
            ? prev[parametroId].fechaRespuesta
            : new Date().toISOString(),
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
    field: "personasAuditadas" | "cargos" | "areas",
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

  // Convierte el estado visual al contrato transaccional del repositorio.
  const getAnswersPayload = (): EvaluationAnswerInput[] =>
    Object.values(respuestas)
      .map(toAnswerPayload)

  const getAnsweredParamsWithoutComment = () =>
    vertical.parametros.filter((parametro) => {
      const respuesta = respuestas[parametro.id]
      return respuesta?.valor !== null && respuesta?.valor !== undefined && !respuesta.comentario.trim()
    })

  const validateRequiredComments = () => {
    const missingComments = getAnsweredParamsWithoutComment()
    if (missingComments.length === 0) return true

    const firstMissing = missingComments[0]
    setActiveParametroIndex(Math.max(0, vertical.parametros.findIndex((parametro) => parametro.id === firstMissing.id)))
    setFormError(
      missingComments.length === 1
        ? `Completa el comentario / hallazgo del parámetro "${firstMissing.nombre}".`
        : `Completa los comentarios / hallazgos obligatorios en ${missingComments.length} parámetros.`,
    )
    return false
  }

  // Valida evidencias antes de incorporarlas al borrador local.
  const handleEvidenceFilesChange = (parametroId: string, files: FileList | null) => {
    if (!files) return

    const selectedFiles = Array.from(files)
    const acceptedFiles = selectedFiles.filter(isAcceptedEvidenceFile)

    if (acceptedFiles.length !== selectedFiles.length) {
      setFormError("Solo se permiten PDF, Excel, documentos, presentaciones e imágenes.")
    }

    setEvidenceFiles((prev) => {
      const currentFiles = prev[parametroId] ?? []
      const remainingSlots = MAX_EVIDENCE_FILES - currentFiles.length

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

  // Guarda respuestas incompletas de forma atómica sin cambiar el estado final.
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
      setAutoSaveStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const evaluationProgress = getEvaluationProgress(
    vertical.parametros.map((parametro) => parametro.id),
    respuestas,
  )
  const totalParametros = evaluationProgress.total
  const respondidos = evaluationProgress.answered
  const progreso = evaluationProgress.percentage
  const isComplete = evaluationProgress.complete
  const currentParametroIndex = totalParametros > 0 ? Math.min(activeParametroIndex, totalParametros - 1) : 0
  const currentParametro = vertical.parametros[currentParametroIndex]
  const currentRespuesta = currentParametro
    ? {
        ...createEmptyRespuesta(currentParametro.id),
        ...respuestas[currentParametro.id],
      }
    : null
  const currentParametroEvidenceFiles = currentParametro ? evidenceFiles[currentParametro.id] ?? [] : []
  const currentTieneRespuesta = Boolean(currentRespuesta?.valor)
  const currentMissingRequiredComment = Boolean(currentTieneRespuesta && !currentRespuesta?.comentario.trim())
  const canGoToPreviousParametro = currentParametroIndex > 0
  const canGoToNextParametro = currentParametroIndex < totalParametros - 1

  const goToPreviousParametro = () => {
    setActiveParametroIndex((currentIndex) => Math.max(0, currentIndex - 1))
  }

  const goToNextParametro = () => {
    if (canGoToNextParametro) {
      setActiveParametroIndex((currentIndex) => Math.min(totalParametros - 1, currentIndex + 1))
    }
  }

  // Decide entre borrador y cierre según la completitud de todos los parámetros.
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

  const scoreCalculado = calculateEvaluationScore(vertical.parametros, respuestas)
  const scoreActual = respondidos > 0 ? scoreCalculado : control.scoreControl ?? scoreCalculado

  // Valida comentarios obligatorios y finaliza respuestas, auditoría y control en una transacción.
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
      setFormError(getErrorMessage(submitError, "No se pudo finalizar la evaluación."))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

    return { controlId, data, isLoading, dataError, refresh, appUser, loteVertical, control, lote, cicloLote, unidad, modelo, vertical, auditor, selectedLote, selectedUnidad, selectedModelo, selectedLoteVerticales, respuestas, setRespuestas, evidenceFiles, setEvidenceFiles, activeParametroIndex, setActiveParametroIndex, autoSaveStatus, setAutoSaveStatus, formError, setFormError, isSubmitting, setIsSubmitting, areAnswersLoading, setAreAnswersLoading, router, nowTime, cycleStartsAt, cycleEndsAt, cycleIsEnabled, cycleIsInForce, evaluationBlockedReason, canEditEvaluation, answeredControlIds, hasLocalAnswers, displayEstado, currentControl, currentLote, handleSetRespuesta, handleSetComentario, handleSetRespuestaListItem, getAnswersPayload, getAnsweredParamsWithoutComment, validateRequiredComments, handleEvidenceFilesChange, handleRemoveEvidenceFile, handleSaveDraft, evaluationProgress, totalParametros, respondidos, progreso, isComplete, currentParametroIndex, currentParametro, currentRespuesta, currentParametroEvidenceFiles, currentTieneRespuesta, currentMissingRequiredComment, canGoToPreviousParametro, canGoToNextParametro, goToPreviousParametro, goToNextParametro, handleSaveOrFinalize, scoreCalculado, scoreActual, handleFinalizeEvaluation }
}
