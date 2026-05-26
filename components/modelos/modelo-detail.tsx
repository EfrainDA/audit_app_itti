"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { type ModeloControl } from "@/lib/data"
import { CheckCircle, XCircle, HelpCircle, FileText, Camera, Layers3, ListChecks, CirclePercent } from "lucide-react"

interface ModeloDetailProps {
  modelo: ModeloControl
}

export function ModeloDetail({ modelo }: ModeloDetailProps) {
  const isDadoDeBaja = modelo.estado === "deprecado"
  const totalParametros = modelo.verticales.reduce(
    (acc, v) => acc + v.parametros.length,
    0
  )
  const totalPreguntas = modelo.verticales.reduce(
    (acc, v) => acc + v.parametros.reduce((pacc, p) => pacc + p.preguntas.length, 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 md:gap-4">
        <Card className="border-border/60 bg-card">
          <CardContent className="flex items-center justify-center gap-3 px-4 py-4 text-center sm:gap-4 sm:px-5">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 shadow-none">
              <Layers3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight">{modelo.verticales.length}</p>
              <p className="text-sm text-muted-foreground">Verticales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardContent className="flex items-center justify-center gap-3 px-4 py-4 text-center sm:gap-4 sm:px-5">
            <div className="rounded-lg border border-chart-2/20 bg-chart-2/10 p-3 shadow-none">
              <ListChecks className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight">{totalParametros}</p>
              <p className="text-sm text-muted-foreground">Parámetros</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardContent className="flex items-center justify-center gap-3 px-4 py-4 text-center sm:gap-4 sm:px-5">
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 shadow-none">
              <CirclePercent className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight">100%</p>
              <p className="text-sm text-muted-foreground">Peso Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className={`grid grid-cols-1 divide-y divide-border/70 sm:divide-y-0 sm:divide-x ${isDadoDeBaja ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Creado por</p>
              <p className="font-medium text-foreground mt-1">{modelo.creadoPor}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Fecha de creación</p>
              <p className="font-medium text-foreground mt-1">{new Date(modelo.fechaCreacion).toLocaleDateString('es-ES')}</p>
            </div>
            {isDadoDeBaja && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Fecha de baja</p>
                <p className="font-medium text-foreground mt-1">
                  {modelo.fechaVigenciaHasta ? new Date(modelo.fechaVigenciaHasta).toLocaleDateString('es-ES') : "Sin fecha registrada"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verticales */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Estructura del Modelo</h3>
        <Accordion type="multiple" className="space-y-2">
          {modelo.verticales.map((vertical) => (
            <AccordionItem
              key={vertical.id}
              value={vertical.id}
              className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-none"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex min-w-0 items-center gap-3 text-left">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shadow-none">
                    <span className="text-primary font-bold">{vertical.peso}%</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground">{vertical.nombre}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {vertical.tipoEvaluacion === 'cascada' ? 'Cascada' : 'Distribuida'}
                      </Badge>
                      <span>{vertical.parametros.length} parámetros</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-1">
                  {vertical.parametros.map((parametro) => (
                    <Card key={parametro.id} className="bg-secondary border-border shadow-none rounded-lg">
                      <CardContent className="flex min-h-[76px] flex-col items-start justify-between gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="min-w-0 space-y-2">
                          <div>
                            <h5 className="text-sm font-semibold leading-tight">{parametro.nombre}</h5>
                            {parametro.descripcion && (
                              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                                {parametro.descripcion}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                            <span className="flex items-center gap-1 leading-none">
                            {parametro.permiteIntermedio ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-success" />
                                Permite intermedio
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                                Solo Cumple / No Cumple
                              </>
                            )}
                            </span>
                          </div>
                        </div>
                        <Badge className="shrink-0 self-center bg-primary/20 text-primary">
                          {parametro.puntosBase} pts.
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}
