"use client"

// Formulario de evaluación: administra respuestas, evidencias, borradores y cierre.
import { SaveStatus } from "@/components/ui/async-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { SafeImage } from "@/components/ui/safe-image"
import { Textarea } from "@/components/ui/textarea"
import {
  EVIDENCE_FILE_ACCEPT,
  formatFechaRespuesta,
  getRespuestaValorLabel,
  MAX_EVIDENCE_FILES
} from "@/features/evaluations/domain/evaluation-answer"
import {
  formatEstado,
  getEstadoBadgeColor,
  getScoreBgColor,
  getScoreColor
} from "@/lib/data"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  MinusCircle,
  Paperclip,
  Save,
  X,
  XCircle
} from "lucide-react"
import Link from "next/link"

interface EvaluacionDetailProps {
  controlId: string
}


// Coordina carga, edición por vertical y acciones de guardado.
import { useEvaluacionDetailController } from "./use-evaluacion-detail-controller"
export function EvaluacionDetail({ controlId }: EvaluacionDetailProps) {
  const controller = useEvaluacionDetailController({ controlId })
  if (!("data" in controller)) return controller
  const { appUser, control, unidad, vertical, auditor, respuestas, evidencePreview, setActiveParametroIndex, autoSaveStatus, formError, isSubmitting, evaluationBlockedReason, canEditEvaluation, displayEstado, handleSetRespuesta, handleSetComentario, handleSetRespuestaListItem, handleEvidenceFilesChange, handleRemoveEvidenceFile, handlePreviewEvidence, closeEvidencePreview, handleDownloadEvidence, handleSaveDraft, totalParametros, respondidos, progreso, isComplete, currentParametroIndex, currentParametro, currentRespuesta, currentParametroEvidenceFiles, currentMissingRequiredComment, canGoToPreviousParametro, canGoToNextParametro, goToPreviousParametro, goToNextParametro, handleSaveOrFinalize, scoreActual } = controller
  const previewExtension = evidencePreview?.evidence.name.split(".").pop()?.toLowerCase() ?? ""
  const previewIsImage = evidencePreview?.evidence.type?.startsWith("image/")
    || ["jpg", "jpeg", "png", "webp", "gif"].includes(previewExtension)
  const previewCanEmbed = evidencePreview?.evidence.type === "application/pdf"
    || evidencePreview?.evidence.type?.startsWith("text/")
    || ["pdf", "txt", "csv"].includes(previewExtension)
return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Card className="overflow-hidden border-border/60 bg-card py-0 shadow-sm">
          <CardContent className="px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{control.identificador}</h2>
                  <Badge className={cn("h-5 shrink-0 rounded-full px-2 text-xs", getEstadoBadgeColor(displayEstado ?? control.estado))}>
                    {formatEstado(displayEstado ?? control.estado)}
                  </Badge>
                  {appUser?.role === "auditor" && control.auditorId !== appUser.id && (
                    <Badge variant="outline" className="h-5 shrink-0 rounded-full px-2 text-xs">
                      Solo lectura
                    </Badge>
                  )}
                </div>
                <div className="grid max-w-xl gap-1 text-xs text-muted-foreground">
                  <p className="min-w-0 truncate">
                    <span className="text-foreground">Unidad de Negocio:</span> {unidad?.nombre}
                  </p>
                  <p className="min-w-0 truncate">
                    <span className="text-foreground">Vertical:</span> {vertical.nombre}
                  </p>
                  <p className="min-w-0 truncate">
                    <span className="text-foreground">Asignado a:</span> {auditor?.name ?? "Sin analista"}
                  </p>
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
        <Card className="border-status-danger-border bg-status-danger-surface">
          <CardContent className="p-3 text-sm text-status-danger-text">{formError}</CardContent>
        </Card>
      )}

      {evaluationBlockedReason && appUser?.role === "auditor" && control?.auditorId === appUser.id && (
        <Card className="border-status-warning-border bg-status-warning-surface">
          <CardContent className="p-3 text-sm text-status-warning-text">{evaluationBlockedReason}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parámetros</p>
              <SaveStatus status={autoSaveStatus} onRetry={() => void handleSaveDraft()} className="min-h-0" />
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
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      valor === "cumple" && "bg-status-success-surface text-status-success-text",
                      valor === "intermedio" && "bg-status-warning-surface text-status-warning-text",
                      valor === "no_cumple" && "bg-status-danger-surface text-status-danger-text",
                      valor === "na" && "bg-primary/15 text-primary",
                      !valor && "bg-muted text-muted-foreground"
                    )}
                  >
                    {valor ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{parametro.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{getRespuestaValorLabel(valor)}</span>
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
                    <Label className="text-xs font-semibold text-muted-foreground">Datos de la persona evaluada</Label>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] md:items-center">
                      <Input
                        placeholder="Persona evaluada"
                        className="h-8 border-border bg-background text-xs"
                        value={currentRespuesta.personasAuditadas[0] ?? ""}
                        onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "personasAuditadas", 0, e.target.value)}
                        disabled={!canEditEvaluation}
                      />
                      <Input
                        placeholder="Cargo"
                        className="h-8 border-border bg-background text-xs"
                        value={currentRespuesta.cargos[0] ?? ""}
                        onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "cargos", 0, e.target.value)}
                        disabled={!canEditEvaluation}
                      />
                      <Input
                        placeholder="Área"
                        className="h-8 border-border bg-background text-xs"
                        value={currentRespuesta.areas[0] ?? ""}
                        onChange={(e) => handleSetRespuestaListItem(currentParametro.id, "areas", 0, e.target.value)}
                        disabled={!canEditEvaluation}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Comentario / Hallazgo <span className="text-status-danger-text">*</span>
                    </Label>
                    <Textarea
                      placeholder="Describe el hallazgo, evidencia observada o justificación de la respuesta."
                      className={cn(
                        "min-h-[132px] border-border bg-background",
                        currentMissingRequiredComment && "border-status-danger-border focus-visible:ring-destructive/30"
                      )}
                      value={currentRespuesta.comentario}
                      onChange={(e) => handleSetComentario(currentParametro.id, e.target.value)}
                      disabled={!canEditEvaluation}
                    />
                    {currentMissingRequiredComment && (
                      <div className="flex items-start gap-2 rounded-md border border-status-danger-border bg-status-danger-surface px-3 py-2 text-xs text-status-danger-text">
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
                      <span className="truncate text-xs text-muted-foreground">
                        {currentParametroEvidenceFiles.length > 0
                          ? currentParametroEvidenceFiles.map((file) => file.name).join(", ")
                          : "Sin archivos adjuntos"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      disabled={!canEditEvaluation || currentParametroEvidenceFiles.length >= MAX_EVIDENCE_FILES}
                      asChild
                    >
                      <label>
                        <Paperclip className="mr-1 h-3.5 w-3.5" />
                        Adjuntar
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept={EVIDENCE_FILE_ACCEPT}
                          disabled={!canEditEvaluation || currentParametroEvidenceFiles.length >= MAX_EVIDENCE_FILES}
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
                        <div key={evidence.path} className="flex min-h-8 items-center justify-between gap-2 rounded-md border border-border/40 bg-secondary/10 px-2.5 py-1 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-foreground" title={evidence.name}>{evidence.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" title="Vista previa" aria-label={`Vista previa de ${evidence.name}`} onClick={() => void handlePreviewEvidence(evidence)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" title="Descargar" aria-label={`Descargar ${evidence.name}`} onClick={() => void handleDownloadEvidence(evidence)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-status-danger-text"
                            onClick={() => handleRemoveEvidenceFile(currentParametro.id, fileIndex)}
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
                      className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "cumple" && "bg-status-success-solid text-success-foreground hover:brightness-95")}
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
                        className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "intermedio" && "bg-status-warning-solid text-warning-foreground hover:brightness-95")}
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
                      className={cn("h-8 w-full justify-start px-3 text-xs shadow-none", currentRespuesta.valor === "no_cumple" && "bg-status-danger-solid text-destructive-foreground hover:brightness-95")}
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
                  <p className="whitespace-nowrap pt-1 text-xs leading-4 text-muted-foreground">
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

      <Dialog open={Boolean(evidencePreview)} onOpenChange={(open) => { if (!open) closeEvidencePreview() }}>
        <DialogContent
          className="flex h-[85vh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-3 p-4 sm:p-5"
          closeButtonClassName="flex size-8 items-center justify-center rounded-sm bg-transparent shadow-none"
        >
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle className="truncate" title={evidencePreview?.evidence.name}>Vista previa: {evidencePreview?.evidence.name}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/20">
            {evidencePreview?.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando evidencia...
              </div>
            )}
            {evidencePreview?.error && <p className="max-w-md px-4 text-center text-sm text-status-danger-text">{evidencePreview.error}</p>}
            {evidencePreview?.url && previewIsImage && (
              <SafeImage src={evidencePreview.url} alt={evidencePreview.evidence.name} className="h-full w-full object-contain p-3" />
            )}
            {evidencePreview?.url && !previewIsImage && previewCanEmbed && (
              <iframe src={evidencePreview.url} title={`Vista previa de ${evidencePreview.evidence.name}`} className="h-full w-full border-0 bg-background" />
            )}
            {evidencePreview?.url && !previewIsImage && !previewCanEmbed && (
              <div className="flex max-w-md flex-col items-center gap-3 px-5 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Este formato no admite vista previa en el navegador.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Puedes descargarlo para abrirlo con la aplicación correspondiente.</p>
                </div>
              </div>
            )}
          </div>

          {evidencePreview && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => void handleDownloadEvidence(evidencePreview.evidence)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
