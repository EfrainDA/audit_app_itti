"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  Eye,
  Save,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import {
  type DescargoAuditado,
  type Control,
  getScoreColor,
  getScoreBgColor,
  getEstadoBadgeColor,
  formatEstado,
  getControlDisplayEstado,
} from "@/lib/data"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import {
  fetchAnswersForControl,
  finalizeEvaluation,
  saveAnswerEvidenceFiles,
  saveAuditedResponseNote,
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
  id?: string
  parametroId: string
  valor: RespuestaValor
  personasAuditadas: string[]
  cargos: string[]
  areas: string[]
  fechaRespuesta?: string
  comentario: string
  evidencias: string[]
  descargosAuditado: DescargoAuditado[]
}

const createEmptyRespuesta = (parametroId: string): Respuesta => ({
  parametroId,
  valor: null,
  personasAuditadas: [""],
  cargos: [""],
  areas: [""],
  comentario: "",
  evidencias: [],
  descargosAuditado: [],
})

const respuestaValorLabels: Record<Exclude<RespuestaValor, null>, string> = {
  cumple: "Cumple",
  intermedio: "Intermedio",
  no_cumple: "No cumple",
  na: "N/A",
}

const getRespuestaValorLabel = (valor: RespuestaValor) =>
  valor ? respuestaValorLabels[valor] : "Sin responder"

const formatFechaRespuesta = (fechaRespuesta?: string) => {
  if (!fechaRespuesta) return "Sin responder"
  return new Date(fechaRespuesta).toLocaleString("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

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

  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({})
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File[]>>({})
  const [auditedComments, setAuditedComments] = useState<Record<string, string>>({})
  const [auditedEvidenceFiles, setAuditedEvidenceFiles] = useState<Record<string, File[]>>({})
  const [savingAuditedAnswerId, setSavingAuditedAnswerId] = useState<string | null>(null)
  const [activeParametroIndex, setActiveParametroIndex] = useState(0)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const canEditEvaluation = appUser?.role === "auditor" && control?.auditorId === appUser.id && cycleIsInForce
  const answeredControlIds = new Set(data.respuestas.map((answer) => answer.controlId))
  const hasLocalAnswers = Object.values(respuestas).some((respuesta) => respuesta.valor !== null)
  if (control && hasLocalAnswers) answeredControlIds.add(control.id)
  const displayEstado = control ? getControlDisplayEstado(control, answeredControlIds) : undefined

  useEffect(() => {
    if (!control) return

    fetchAnswersForControl(controlId)
      .then((answers) => {
        setRespuestas(
          Object.fromEntries(
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
                descargosAuditado: answer.descargosAuditado,
              },
            ]),
          ),
        )
        if (answers.length) setAutoSaveStatus("saved")
      })
      .catch((loadError) => setFormError(getErrorMessage(loadError, "No se pudieron cargar las respuestas.")))
  }, [control, controlId])

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
          areas: respuesta.areas,
          fechaRespuesta: respuesta.fechaRespuesta,
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
                    <img src={selectedUnidad.logo} alt={selectedUnidad.nombre} className="h-full w-full object-contain p-1.5" />
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
                  <Badge className={cn("h-5 rounded-full px-2 text-[10px] font-semibold", getEstadoBadgeColor(selectedLote.estado))}>
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-right">Progreso general</p>
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

            const verticalTerminados = item.controles.filter((itemControl) => getControlDisplayEstado(itemControl, answeredControlIds) === "terminado").length
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
                        <p className="truncate text-xs text-muted-foreground">{itemVertical.parametros.length} parametros configurados</p>
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
                          <p className="text-[10px] font-medium text-muted-foreground">Logrado</p>
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
                              <Badge className={cn("h-5 rounded-full px-2 text-[10px] font-semibold", getEstadoBadgeColor(itemDisplayEstado))}>{formatEstado(itemDisplayEstado)}</Badge>
                              {itemControl.scoreControl !== undefined && (
                                <span className={`text-xs font-semibold ${getScoreColor(itemControl.scoreControl)}`}>{itemControl.scoreControl} pts</span>
                              )}
                            </div>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
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

  const handleAddRespuestaListItem = (parametroId: string, field: "personasAuditadas" | "cargos" | "areas") => {
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
    field: "personasAuditadas" | "cargos" | "areas",
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
        areas: respuesta.areas,
        fechaRespuesta: respuesta.fechaRespuesta,
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
    setActiveParametroIndex(Math.max(0, vertical.parametros.findIndex((parametro) => parametro.id === firstMissing.id)))
    setFormError(
      missingComments.length === 1
        ? `Completa el comentario / hallazgo del parámetro "${firstMissing.nombre}".`
        : `Completa los comentarios / hallazgos obligatorios en ${missingComments.length} parámetros.`,
    )
    return false
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
  const canRespondAsAudited = appUser?.role === "auditado" && Boolean(currentRespuesta?.id) && (
    currentControl.estado === "en_replica" ||
    currentControl.estado === "terminado"
  )
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

  const handleSaveOrFinalize = async () => {
    if (!canEditEvaluation) return
    if (currentControl.estado === "en_replica") {
      await handleSaveDraft()
      return
    }
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
    if (!isComplete) {
      setFormError("Completa todos los parámetros antes de enviar a réplica.")
      return
    }
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

  const handleSaveAuditedResponse = async () => {
    if (!currentRespuesta?.id || !canRespondAsAudited) return

    setFormError(null)
    setSavingAuditedAnswerId(currentRespuesta.id)

    try {
      await saveAuditedResponseNote(currentRespuesta.id, {
        comment: auditedComments[currentRespuesta.id],
        files: auditedEvidenceFiles[currentRespuesta.id] ?? [],
      })
      setAuditedComments((prev) => ({ ...prev, [currentRespuesta.id!]: "" }))
      setAuditedEvidenceFiles((prev) => ({ ...prev, [currentRespuesta.id!]: [] }))
      await refresh()
      const answers = await fetchAnswersForControl(controlId)
      setRespuestas(
        Object.fromEntries(
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
              descargosAuditado: answer.descargosAuditado,
            },
          ]),
        ),
      )
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo guardar el descargo."))
    } finally {
      setSavingAuditedAnswerId(null)
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Card className="overflow-hidden border-border/60 bg-card py-0 shadow-sm">
          <CardContent className="px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{control.identificador}</h2>
                  <Badge className={cn("h-5 shrink-0 rounded-full px-2 text-[10px]", getEstadoBadgeColor(displayEstado ?? control.estado))}>
                    {formatEstado(displayEstado ?? control.estado)}
                  </Badge>
                </div>
                <div className="grid max-w-xl gap-1 text-xs text-muted-foreground">
                  <p className="min-w-0 truncate">
                    <span className="text-foreground">Unidad de Negocio:</span> {unidad?.nombre}
                  </p>
                  <p className="min-w-0 truncate">
                    <span className="text-foreground">Vertical:</span> {vertical.nombre}
                  </p>
                  {auditor && (
                    <p className="min-w-0 truncate">
                      <span className="text-foreground">{auditor.cargo || "Cargo"}:</span> {auditor.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-border/60 bg-card py-0 shadow-sm", scoreActual !== null && getScoreBgColor(scoreActual))}>
          <CardContent className="flex h-full min-h-[58px] flex-col items-center justify-center px-4 py-2.5 text-center">
            <p className={cn("text-5xl font-bold leading-none", scoreActual !== null && getScoreColor(scoreActual))}>
              {scoreActual !== null ? scoreActual : "-"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Puntuación Lograda</p>
          </CardContent>
        </Card>
      </div>

      {formError && (
        <Card className="border-destructive/25 bg-destructive/10">
          <CardContent className="p-3 text-sm text-destructive">{formError}</CardContent>
        </Card>
      )}

      {evaluationBlockedReason && appUser?.role === "auditor" && control?.auditorId === appUser.id && (
        <Card className="border-warning/25 bg-warning/10">
          <CardContent className="p-3 text-sm text-warning">{evaluationBlockedReason}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parámetros</p>
              {autoSaveStatus !== "idle" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  {autoSaveStatus === "saving" ? "Guardando" : "Guardado"}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold leading-none text-foreground">{respondidos}/{totalParametros}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Avance</span>
              <span className="font-semibold text-foreground">{Math.round(progreso)}%</span>
            </div>
            <Progress value={progreso} className="h-2" />
          </div>
          <div className="space-y-2 pt-1">
            {vertical.parametros.map((parametro, index) => {
              const respuesta = respuestas[parametro.id]
              const selected = index === currentParametroIndex
              const valor = respuesta?.valor ?? null

              return (
                <button
                  key={parametro.id}
                  type="button"
                  onClick={() => setActiveParametroIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                    selected ? "border-primary/70 bg-primary/10 shadow-sm" : "border-border/50 bg-background hover:bg-secondary/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      valor === "cumple" && "bg-success/20 text-success",
                      valor === "intermedio" && "bg-warning/20 text-warning",
                      valor === "no_cumple" && "bg-destructive/20 text-destructive",
                      valor === "na" && "bg-primary/15 text-primary",
                      !valor && "bg-muted text-muted-foreground"
                    )}
                  >
                    {valor ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{parametro.nombre}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{getRespuestaValorLabel(valor)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {currentParametro && currentRespuesta && (
          <section className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
            <div className="bg-secondary/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      Parámetro {currentParametroIndex + 1} de {totalParametros}
                    </span>
                    <span className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-semibold text-foreground">
                      {currentParametro.puntosBase} pts
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-6 text-foreground">{currentParametro.nombre}</h3>
                    {currentParametro.descripcion && (
                      <p className="mt-1 max-w-4xl text-sm leading-5 text-muted-foreground">{currentParametro.descripcion}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-semibold text-muted-foreground">Datos del auditado</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          handleAddRespuestaListItem(currentParametro.id, "personasAuditadas")
                          handleAddRespuestaListItem(currentParametro.id, "cargos")
                          handleAddRespuestaListItem(currentParametro.id, "areas")
                        }}
                        disabled={!canEditEvaluation}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Línea
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {currentRespuesta.personasAuditadas.map((persona, personIndex) => (
                        <div key={`persona-row-${currentParametro.id}-${personIndex}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_30px] md:items-center">
                          <Input
                            placeholder="Persona auditada"
                            className="h-8 border-border bg-background text-xs"
                            value={persona}
                            onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "personasAuditadas", personIndex, e.target.value)}
                            disabled={!canEditEvaluation}
                          />
                          <Input
                            placeholder="Cargo"
                            className="h-8 border-border bg-background text-xs"
                            value={currentRespuesta.cargos[personIndex] ?? ""}
                            onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "cargos", personIndex, e.target.value)}
                            disabled={!canEditEvaluation}
                          />
                          <Input
                            placeholder="Área"
                            className="h-8 border-border bg-background text-xs"
                            value={currentRespuesta.areas[personIndex] ?? ""}
                            onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "areas", personIndex, e.target.value)}
                            disabled={!canEditEvaluation}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 justify-self-end text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              handleRemoveRespuestaListItem(currentParametro.id, "personasAuditadas", personIndex)
                              handleRemoveRespuestaListItem(currentParametro.id, "cargos", personIndex)
                              handleRemoveRespuestaListItem(currentParametro.id, "areas", personIndex)
                            }}
                            disabled={!canEditEvaluation || currentRespuesta.personasAuditadas.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Comentario / Hallazgo <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder="Describe el hallazgo, evidencia observada o justificación de la respuesta."
                      className={cn(
                        "min-h-[132px] border-border bg-background",
                        currentMissingRequiredComment && "border-destructive/70 focus-visible:ring-destructive/30"
                      )}
                      value={currentRespuesta.comentario}
                      onChange={(e) => handleSetComentario(currentParametro.id, e.target.value)}
                      disabled={!canEditEvaluation}
                    />
                    {currentMissingRequiredComment && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>El comentario / hallazgo es obligatorio para este parámetro.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-9 items-center justify-between gap-3 rounded-md border border-border/40 bg-secondary/10 px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="shrink-0 text-xs font-semibold text-muted-foreground">Evidencia</Label>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentParametroEvidenceFiles.length > 0
                          ? currentParametroEvidenceFiles.map((file) => file.name).join(", ")
                          : "Sin archivos adjuntos"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px]"
                      disabled={!canEditEvaluation || currentParametroEvidenceFiles.length >= maxEvidenceFiles}
                      asChild
                    >
                      <label>
                        <Paperclip className="mr-1 h-3.5 w-3.5" />
                        Adjuntar
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept={evidenceFileAccept}
                          disabled={!canEditEvaluation || currentParametroEvidenceFiles.length >= maxEvidenceFiles}
                          onChange={(event) => {
                            handleEvidenceFilesChange(currentParametro.id, event.target.files)
                            event.target.value = ""
                          }}
                        />
                      </label>
                    </Button>
                  </div>

                  {currentRespuesta.evidencias.length > 0 && (
                    <div className="grid gap-1.5">
                      {currentRespuesta.evidencias.map((evidence) => (
                        <div key={evidence} className="flex min-h-7 items-center gap-2 rounded-md border border-border/40 bg-secondary/10 px-2.5 py-1 text-xs">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-foreground">{evidence}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentParametroEvidenceFiles.length > 0 && (
                    <div className="grid gap-1.5">
                      {currentParametroEvidenceFiles.map((file, fileIndex) => (
                        <div
                          key={`${currentParametro.id}-${file.name}-${fileIndex}`}
                          className="flex min-h-7 items-center justify-between gap-2 rounded-md border border-border/40 bg-secondary/10 px-2.5 py-1 text-xs"
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
                            onClick={() => handleRemoveEvidenceFile(currentParametro.id, fileIndex)}
                            disabled={!canEditEvaluation}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {canRespondAsAudited && currentRespuesta.id && (
                    <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold text-primary">Descargo del auditado</Label>
                        {currentRespuesta.descargosAuditado.length > 0 && (
                          <Badge variant="outline" className="h-5 px-2 text-[10px]">Guardado</Badge>
                        )}
                      </div>

                      {currentRespuesta.descargosAuditado.length > 0 && (
                        <div className="space-y-1.5">
                          {currentRespuesta.descargosAuditado.map((note) => (
                            <div key={note.id} className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs">
                              {note.comentario && <p className="text-foreground">{note.comentario}</p>}
                              {note.evidencia && <p className="mt-1 text-muted-foreground">Evidencia: {note.evidencia}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      <Textarea
                        value={auditedComments[currentRespuesta.id] ?? ""}
                        onChange={(event) => setAuditedComments((prev) => ({ ...prev, [currentRespuesta.id!]: event.target.value }))}
                        placeholder="Agrega tu comentario o descargo para este parámetro."
                        className="min-h-24 border-border bg-background"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" asChild>
                          <label>
                            <Paperclip className="mr-1 h-3.5 w-3.5" />
                            Adjuntar evidencia
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept={evidenceFileAccept}
                              onChange={(event) => {
                                const selectedFiles = Array.from(event.target.files ?? []).filter(isAcceptedEvidenceFile)
                                setAuditedEvidenceFiles((prev) => ({ ...prev, [currentRespuesta.id!]: selectedFiles }))
                                event.target.value = ""
                              }}
                            />
                          </label>
                        </Button>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {(auditedEvidenceFiles[currentRespuesta.id] ?? []).length
                            ? (auditedEvidenceFiles[currentRespuesta.id] ?? []).map((file) => file.name).join(", ")
                            : "Sin archivo seleccionado"}
                        </span>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={handleSaveAuditedResponse}
                          disabled={savingAuditedAnswerId === currentRespuesta.id}
                        >
                          <Save className="mr-1 h-3.5 w-3.5" />
                          Guardar descargo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <aside className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultado</p>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      size="sm"
                      variant={currentRespuesta.valor === "cumple" ? "default" : "outline"}
                      onClick={() => handleSetRespuesta(currentParametro.id, "cumple")}
                      disabled={!canEditEvaluation}
                      className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "cumple" && "bg-success text-success-foreground hover:bg-success/90")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Cumple
                    </Button>
                    {currentParametro.permiteIntermedio && (
                      <Button
                        size="sm"
                        variant={currentRespuesta.valor === "intermedio" ? "default" : "outline"}
                        onClick={() => handleSetRespuesta(currentParametro.id, "intermedio")}
                        disabled={!canEditEvaluation}
                        className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "intermedio" && "bg-warning text-warning-foreground hover:bg-warning/90")}
                      >
                        <MinusCircle className="h-3.5 w-3.5" />
                        Intermedio
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={currentRespuesta.valor === "no_cumple" ? "default" : "outline"}
                      onClick={() => handleSetRespuesta(currentParametro.id, "no_cumple")}
                      disabled={!canEditEvaluation}
                      className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "no_cumple" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      No cumple
                    </Button>
                    <Button
                      size="sm"
                      variant={currentRespuesta.valor === "na" ? "default" : "outline"}
                      onClick={() => handleSetRespuesta(currentParametro.id, "na")}
                      disabled={!canEditEvaluation}
                      className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "na" && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      N/A
                    </Button>
                  </div>
                  <p className="whitespace-nowrap pt-1 text-[11px] leading-4 text-muted-foreground">
                    Respondido: {formatFechaRespuesta(currentRespuesta.fechaRespuesta)}
                  </p>
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>

      {canEditEvaluation && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium">Progreso de Evaluación</p>
                <p className="text-sm text-muted-foreground">
                  Parámetro {currentParametroIndex + 1} de {totalParametros} | {respondidos} parámetros respondidos
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
                <Button
                  variant="outline"
                  className="h-9 flex-none px-3"
                  onClick={goToPreviousParametro}
                  disabled={!canGoToPreviousParametro || isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  className="h-9 flex-none px-3"
                  onClick={goToNextParametro}
                  disabled={!canGoToNextParametro || isSubmitting}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  className="h-9 flex-none px-3"
                  onClick={handleSaveOrFinalize}
                  disabled={isSubmitting}
                >
                  {isComplete && currentControl.estado !== "en_replica" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {currentControl.estado === "en_replica" ? "Guardar cambios" : isComplete ? "Finalizar" : "Guardar"}
                </Button>
                {isComplete && currentControl.estado !== "terminado" && currentControl.estado !== "en_replica" && (
                  <Button
                    className="h-9 flex-none bg-warning px-3 text-warning-foreground hover:bg-warning/90"
                    onClick={handleSendToReplica}
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar a Réplica
                  </Button>
                )}
                {isComplete && currentControl.estado === "en_replica" && (
                  <Button
                    variant="outline"
                    className="h-9 flex-none px-3"
                    onClick={handleFinalizeEvaluation}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar
                  </Button>
                )}
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
