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
import { CheckCircle, XCircle, HelpCircle, FileText, Camera } from "lucide-react"

interface ModeloDetailProps {
  modelo: ModeloControl
}

export function ModeloDetail({ modelo }: ModeloDetailProps) {
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{modelo.verticales.length}</p>
            <p className="text-sm text-muted-foreground">Verticales</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalParametros}</p>
            <p className="text-sm text-muted-foreground">Parámetros</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground">Peso Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Creado por</p>
              <p className="font-medium">{modelo.creadoPor}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha de creación</p>
              <p className="font-medium">{new Date(modelo.fechaCreacion).toLocaleDateString('es-ES')}</p>
            </div>
            {modelo.fechaVigenciaDesde && (
              <div>
                <p className="text-muted-foreground">Vigencia desde</p>
                <p className="font-medium">{new Date(modelo.fechaVigenciaDesde).toLocaleDateString('es-ES')}</p>
              </div>
            )}
            {modelo.fechaVigenciaHasta && (
              <div>
                <p className="text-muted-foreground">Vigencia hasta</p>
                <p className="font-medium">{new Date(modelo.fechaVigenciaHasta).toLocaleDateString('es-ES')}</p>
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
              className="border border-border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{vertical.peso}%</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{vertical.nombre}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {vertical.tipoEvaluacion === 'cascada' ? 'Cascada' : 'Distribuida'}
                      </Badge>
                      <span>{vertical.parametros.length} parámetros</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {vertical.parametros.map((parametro) => (
                    <Card key={parametro.id} className="bg-secondary border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium">{parametro.nombre}</h5>
                            {parametro.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {parametro.descripcion}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-primary/20 text-primary">
                            {parametro.puntosBase} pts
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            {parametro.permiteIntermedio ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-success" />
                                Permite intermedio
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                                Solo Cumple/No Cumple
                              </>
                            )}
                          </span>
                        </div>

                        {parametro.preguntas.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              Preguntas ({parametro.preguntas.length})
                            </p>
                            <div className="space-y-2">
                              {parametro.preguntas.map((pregunta, index) => (
                                <div
                                  key={pregunta.id}
                                  className="flex items-start gap-2 text-sm bg-background p-2 rounded"
                                >
                                  <span className="text-muted-foreground shrink-0">
                                    {index + 1}.
                                  </span>
                                  <div className="flex-1">
                                    <p>{pregunta.texto}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      {pregunta.evidenciaObligatoria && (
                                        <span className="flex items-center gap-1">
                                          <Camera className="h-3 w-3" />
                                          Evidencia requerida
                                        </span>
                                      )}
                                      {pregunta.comentarioObligatorio && (
                                        <span className="flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          Comentario requerido
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
