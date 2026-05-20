"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Users,
  FileCheck,
  Lock,
  Unlock,
  Download,
  MoreHorizontal,
  Eye,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  getEstadoBadgeColor,
  formatEstado,
  type Lote,
} from "@/lib/data"
import { LoteForm } from "./lote-form"
import { LoteDetail } from "./lote-detail"
import { useUnidades } from "@/hooks/use-unidades"
import { useAppData } from "@/hooks/use-app-data"

export function PlanificacionContent() {
  const { data } = useAppData()
  const lotes = data.lotes
  const loteVerticalesData = data.loteVerticales
  const auditorias = data.auditorias
  const users = data.users
  const modelos = data.modelos
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("lotes")
  const { unidades } = useUnidades()

  const lotesConDatos = lotes.map((lote) => {
    const unidad = unidades.find((u) => u.id === lote.unidadNegocioId)
    const loteAuditorias = auditorias.filter((a) => a.loteId === lote.id)
    const auditores = lote.auditores.map((id) => users.find((u) => u.id === id)).filter(Boolean)

    const loteVerticales = loteVerticalesData.filter((lv) => lv.loteId === lote.id)
    const modelo = modelos.find((m) => m.id === lote.modeloControlId)

    const calificacionFinal = (() => {
      if (!modelo) return null

      const total = loteVerticales.reduce((acc, lv) => {
        const vertical = modelo.verticales.find((v) => v.id === lv.verticalId)
        if (!vertical) return acc

        const scores = lv.controles
          .filter((control) => control.scoreControl !== undefined)
          .map((control) => control.scoreControl ?? 0)

        if (scores.length === 0) return acc

        const promedio = scores.reduce((sum, value) => sum + value, 0) / scores.length
        return acc + (promedio * vertical.peso) / 100
      }, 0)

      const hasScores = loteVerticales.some((lv) =>
        lv.controles.some((control) => control.scoreControl !== undefined)
      )

      return hasScores ? Number(total.toFixed(1)) : null
    })()

    return {
      ...lote,
      unidadNombre: unidad?.nombre || "N/A",
      unidadLogo: unidad?.logo,
      totalAuditorias: loteAuditorias.length,
      auditoriasTerminadas: loteAuditorias.filter((a) => a.estado === "terminada").length,
      auditoresNombres: auditores.map((a) => a?.name).join(", "),
      calificacionFinal,
    }
  })

  const filteredLotes = lotesConDatos.filter(
    (lote) =>
      lote.unidadNombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[70vw] max-w-[90vw]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Lote</DialogTitle>
                  <DialogDescription>
                    Define el ciclo de auditoría para una unidad de negocio
                  </DialogDescription>
                </DialogHeader>
                <LoteForm onClose={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="lotes" className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por unidad de negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="h-24 gap-0 border-primary/15 bg-card py-0 dark:border-primary/25">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Calendar} tone="primary" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.length}</p>
                  <p className="text-sm text-muted-foreground">Lotes Totales</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-24 gap-0 border-success/15 bg-card py-0 dark:border-success/25">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Unlock} tone="success" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "abierto").length}</p>
                  <p className="text-sm text-muted-foreground">Abiertos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-24 gap-0 border-border/70 bg-card py-0 dark:border-primary/18">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Lock} tone="neutral" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "cerrado").length}</p>
                  <p className="text-sm text-muted-foreground">Cerrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-24 gap-0 border-chart-2/15 bg-card py-0 dark:border-chart-2/25">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={FileCheck} tone="success" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{auditorias.length}</p>
                  <p className="text-sm text-muted-foreground">Auditorías</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lotes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {filteredLotes.map((lote) => (
              <Card
                key={lote.id}
                className="bg-card border-border shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedLote(lote)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-md">
                        {lote.unidadLogo ? (
                          <img src={lote.unidadLogo} alt={lote.unidadNombre} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full rounded-md border border-primary/20 bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{lote.unidadNombre}</h3>
                        <p className="text-xs text-muted-foreground">Ciclo {lote.ciclo} - {lote.año}</p>
                      </div>
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getEstadoBadgeColor(lote.estado)}>
                        {lote.estado === "abierto" ? (
                          <><Unlock className="h-3 w-3 mr-1" /> Abierto</>
                        ) : (
                          <><Lock className="h-3 w-3 mr-1" /> Cerrado</>
                        )}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLote(lote); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar Excel
                          </DropdownMenuItem>
                          {lote.estado === "abierto" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-warning">
                                <Lock className="h-4 w-4 mr-2" />
                                Cerrar Lote
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-2 bg-secondary/60 rounded-lg border border-border/70">
                      <p className="text-lg font-bold text-foreground">{lote.totalAuditorias}</p>
                      <p className="text-xs text-muted-foreground">Auditorías</p>
                    </div>
                    <div className="text-center p-2 bg-secondary/60 rounded-lg border border-border/70">
                      <p className="text-lg font-bold text-foreground">{lote.auditoriasTerminadas}</p>
                      <p className="text-xs text-muted-foreground">Terminadas</p>
                    </div>
                    <div className="text-center p-2 bg-secondary/60 rounded-lg border border-border/70">
                      <p className="text-lg font-bold">{lote.auditores.length}</p>
                      <p className="text-xs text-muted-foreground">Auditores</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="truncate">{lote.auditoresNombres || "Sin asignar"}</span>
                  </div>

                  <div className="flex items-center justify-end mt-4 text-primary text-sm">
                    <span className="font-medium">Ver evaluaciones
                    </span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="auditorias" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Calificación por Unidad de Negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                La calificación final es calculada a partir de la suma de los porcentajes obtenidos en cada vertical, ponderados por el peso asignado a cada una en el modelo de control.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Unidad de Negocio</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ciclo de Control</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Auditores Asignados</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Calificación General</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesConDatos.map((lote) => (
                      <tr key={lote.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded">
                              {lote.unidadLogo ? (
                                <img src={lote.unidadLogo} alt={lote.unidadNombre} className="h-full w-full object-contain" />
                              ) : (
                                <Building2 className="h-4 w-4 text-accent" />
                              )}
                            </div>
                            <span>{lote.unidadNombre}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">Ciclo {lote.ciclo} - {lote.año}</td>
                        <td className="py-3 px-4">
                          <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">{lote.auditoresNombres || "Sin asignar"}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Ciclos del Año 2026</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((bimestre) => {
                  const lotesBimestre = lotes.filter((l) => l.ciclo === bimestre && l.año === 2026)
                  const isActive = bimestre === 3
                  const isPast = bimestre < 3

                  return (
                    <Card
                      key={bimestre}
                      className={`border ${isActive ? "border-primary bg-primary/5" : isPast ? "border-border bg-muted/50" : "border-border"}`}
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Bimestre</p>
                        <p className="text-2xl font-bold mb-2">{bimestre}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {bimestre === 1 && "Enero - Febrero"}
                          {bimestre === 2 && "Marzo - Abril"}
                          {bimestre === 3 && "Mayo - Junio"}
                          {bimestre === 4 && "Julio - Agosto"}
                          {bimestre === 5 && "Septiembre - Octubre"}
                          {bimestre === 6 && "Noviembre - Diciembre"}
                        </p>
                        <Badge className={isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-muted text-muted-foreground" : "bg-secondary"}>
                          {lotesBimestre.length} lotes
                        </Badge>
                        {isActive && <p className="text-xs text-primary mt-2 font-medium">Activo</p>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lote Detail Dialog */}
      {selectedLote && (
        <Dialog open={!!selectedLote} onOpenChange={(open) => !open && setSelectedLote(null)}>
          <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {lotesConDatos.find((l) => l.id === selectedLote.id)?.unidadNombre} - Ciclo {selectedLote.ciclo}
                <Badge className={getEstadoBadgeColor(selectedLote.estado)}>
                  {formatEstado(selectedLote.estado)}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Año {selectedLote.año}
              </DialogDescription>
            </DialogHeader>
            <LoteDetail lote={selectedLote} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
