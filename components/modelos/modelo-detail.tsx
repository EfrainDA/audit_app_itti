"use client"

// Vista de solo lectura de un modelo, sus verticales y parámetros.
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { ModeloControl } from "@/lib/data"
import { CheckCircle, XCircle } from "lucide-react"

interface ModeloDetailProps {
  modelo: ModeloControl
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha"
  return new Date(value).toLocaleDateString("es-ES")
}

export function ModeloDetail({ modelo }: ModeloDetailProps) {
  const isDadoDeBaja = modelo.estado === "deprecado"
  const totalParametros = modelo.verticales.reduce((acc, vertical) => acc + vertical.parametros.length, 0)

  const stats = [
    { label: "Verticales", value: modelo.verticales.length },
    { label: "Parámetros", value: totalParametros },
    { label: "Peso total", value: "100%" },
  ]

  return (
    <div className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/65 bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border/65 bg-muted/20 px-4 py-3">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Creado por</p>
            <p className="mt-1 truncate font-medium text-foreground">{modelo.creadoPor}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Creación</p>
            <p className="mt-1 font-medium text-foreground">{formatDate(modelo.fechaCreacion)}</p>
          </div>
          {isDadoDeBaja ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Baja</p>
              <p className="mt-1 font-medium text-foreground">{formatDate(modelo.fechaVigenciaHasta)}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Estado</p>
              <p className="mt-1 font-medium text-foreground">Vigente</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">Estructura del modelo</h3>
          <p className="text-xs text-muted-foreground">{modelo.verticales.length} verticales</p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {modelo.verticales.map((vertical) => (
            <AccordionItem
              key={vertical.id}
              value={vertical.id}
              className="overflow-hidden rounded-lg border border-border/65 bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/25 hover:no-underline">
                <div className="grid min-w-0 flex-1 grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-3 pr-3 text-left">
                  <div className="rounded-md border border-primary/15 bg-primary/8 px-2.5 py-2 text-center">
                    <p className="text-base font-semibold leading-none text-primary">{vertical.peso}%</p>
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-foreground">{vertical.nombre}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="h-5 rounded-md px-2 text-xs">
                        {vertical.tipoEvaluacion === "cascada" ? "Cascada" : "Distribuida"}
                      </Badge>
                      <span>{vertical.parametros.length} parámetros</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="divide-y divide-border/55 rounded-lg border border-border/60">
                  {vertical.parametros.map((parametro) => (
                    <div key={parametro.id} className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_8.5rem] md:items-center">
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold leading-tight text-foreground">{parametro.nombre}</h5>
                        {parametro.descripcion && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {parametro.descripcion}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {parametro.permiteIntermedio ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-status-success-text" />
                              Permite intermedio
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              Solo cumple / no cumple
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-3 py-2 md:justify-end">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground md:hidden">Puntos</span>
                        <span className="text-sm font-semibold text-primary">{parametro.puntosBase} pts.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
