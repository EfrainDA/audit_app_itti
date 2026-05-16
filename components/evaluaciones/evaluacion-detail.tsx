"use client"

import { useState } from "react"
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
  comentario: string
}

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
        ...prev[parametroId],
        parametroId,
        valor,
        comentario: prev[parametroId]?.comentario || "",
      },
    }))
  }

  const handleSetComentario = (parametroId: string, comentario: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [parametroId]: {
        ...prev[parametroId],
        parametroId,
        valor: prev[parametroId]?.valor || null,
        comentario,
      },
    }))
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
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/evaluaciones">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Evaluaciones
        </Link>
      </Button>

      {/* Header Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold font-mono">{control.identificador}</h2>
                  <Badge className={getEstadoBadgeColor(control.estado)}>
                    {formatEstado(control.estado)}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground">Unidad:</span> {unidad?.nombre}
                  </p>
                  <p>
                    <span className="text-foreground">Proceso:</span> {control.proceso}
                    {control.subproceso && ` / ${control.subproceso}`}
                  </p>
                  {auditor && (
                    <p>
                      <span className="text-foreground">Auditor:</span> {auditor.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                {control.estado !== "terminado" && (
                  <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground">
                    <Send className="h-4 w-4 mr-2" />
                    Enviar a Réplica
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("bg-card border-border", scoreActual !== null && getScoreBgColor(scoreActual))}>
          <CardContent className="p-6 text-center">
            <p className={cn("text-4xl font-bold", scoreActual !== null && getScoreColor(scoreActual))}>
              {scoreActual !== null ? scoreActual : "-"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Puntuación Control</p>
            <div className="mt-3 space-y-1">
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
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">{vertical.peso}%</span>
            </div>
            <div>
              <CardTitle className="text-lg">{vertical.nombre}</CardTitle>
              <p className="text-sm text-muted-foreground">
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
            const respuesta = respuestas[parametro.id]
            const tieneRespuesta = respuesta?.valor !== null && respuesta?.valor !== undefined

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
                          <p className="text-sm text-muted-foreground mt-1">
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
                      <CheckCircle2 className="h-4 w-4 mr-1" />
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
                        <MinusCircle className="h-4 w-4 mr-1" />
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
                      <XCircle className="h-4 w-4 mr-1" />
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
                    <div>
                      <Label className="text-xs text-muted-foreground">Comentario / Hallazgo</Label>
                      <Textarea
                        placeholder="Describe el hallazgo o justificación..."
                        className="mt-1 bg-background border-border min-h-[60px]"
                        value={respuesta?.comentario || ""}
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
              <Button variant="outline">
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
