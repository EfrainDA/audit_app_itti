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
  User,
  Lock,
  Unlock,
  Download,
  MoreHorizontal,
  Eye,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getEstadoBadgeColor,
  formatEstado,
  type Lote,
} from "@/lib/data"
import { LoteForm } from "./lote-form"
import { LoteDetail } from "./lote-detail"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { downloadCsv, downloadXlsx } from "@/lib/export"
import { updateLotStatus } from "@/lib/supabase-data"

export function PlanificacionContent() {
  const { data, error: dataError, refresh } = useAppData()
  const { appUser } = useAuth()
  const isAuditor = appUser?.role === "auditor"
  const canManageLots = appUser?.role === "admin" || appUser?.role === "supervisor"
  const lotes = data.lotes
  const loteVerticalesData = data.loteVerticales
  const auditorias = data.auditorias
  const users = data.users
  const modelos = data.modelos
  const [searchTerm, setSearchTerm] = useState("")
  const [unidadFilter, setUnidadFilter] = useState("all")
  const [cicloFilter, setCicloFilter] = useState("all")
  const [anioFilter, setAnioFilter] = useState("all")
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("lotes")
  const unidades = data.unidades

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
      modeloNombre: modelo?.nombre || "N/A",
      controlesTotal: loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0),
      controlesTerminados: loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((control) => control.estado === "terminado").length, 0),
      totalAuditorias: loteAuditorias.length,
      auditoriasTerminadas: loteAuditorias.filter((a) => a.estado === "terminada").length,
      auditoresNombres: auditores.map((a) => a?.name).join(", "),
      calificacionFinal,
    }
  })

  const ciclosDisponibles = Array.from(new Set(lotesConDatos.map((lote) => lote.ciclo))).sort((a, b) => a - b)
  const aniosDisponibles = Array.from(new Set(lotesConDatos.map((lote) => lote.año))).sort((a, b) => b - a)

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredLotes = lotesConDatos.filter((lote) => {
    const matchesSearch = !normalizedSearch || lote.unidadNombre.toLowerCase().includes(normalizedSearch)
    const matchesUnidad = unidadFilter === "all" || lote.unidadNegocioId === unidadFilter
    const matchesCiclo = cicloFilter === "all" || String(lote.ciclo) === cicloFilter
    const matchesAnio = anioFilter === "all" || String(lote.año) === anioFilter
    const matchesAuditor = !isAuditor || lote.auditores.includes(appUser?.id ?? "")

    return matchesSearch && matchesUnidad && matchesCiclo && matchesAnio && matchesAuditor
  })

  const exportLotes = () => {
    downloadCsv(
      "planificacion-lotes.csv",
      lotesConDatos.map((lote) => ({
        unidad: lote.unidadNombre,
        ciclo: lote.ciclo,
        año: lote.año,
        estado: lote.estado,
        auditores: lote.auditoresNombres,
        auditorias: lote.totalAuditorias,
        terminadas: lote.auditoriasTerminadas,
        calificacion: lote.calificacionFinal ?? "",
      })),
    )
  }

  const exportSingleLote = (lote: (typeof lotesConDatos)[number]) => {
    const unidad = unidades.find((item) => item.id === lote.unidadNegocioId)
    const loteVerticales = loteVerticalesData.filter((loteVertical) => loteVertical.loteId === lote.id)
    const controls = loteVerticales.flatMap((loteVertical) => loteVertical.controles)
    const getProducts = (control: (typeof controls)[number]) => {
      const products = [
        control.producto,
        ...(control.productosVinculados ?? []),
      ]
        .map((product) => product?.trim())
        .filter((product): product is string => Boolean(product))

      return Array.from(new Set(products))
    }
    const alcanceProductos = Array.from(new Set(controls.flatMap(getProducts))).sort((a, b) => a.localeCompare(b))
    const procesosRows = controls.flatMap((control) => {
      const products = getProducts(control)
      const linkedProducts = products.length > 1
        ? products.map((product, index) => `${index + 1}. ${product}`).join("\n")
        : products[0] ?? ""
      const subprocesos = control.subprocesos?.length
        ? control.subprocesos
        : control.subproceso?.split(",").map((subproceso) => subproceso.trim()).filter(Boolean) ?? []
      const subprocessRows = subprocesos.length ? subprocesos : [control.subproceso ?? ""]
      const proceso = control.proceso || control.identificador

      return subprocessRows.map((subproceso) => ({
        producto: linkedProducts,
        proceso,
        subproceso,
      }))
    })
    const rows = [
      [{ value: unidad?.nombre || lote.unidadNombre, styleId: "TitleCenter", mergeAcross: 2 }],
      [{ value: "PRODUCTOS DEL ALCANCE", styleId: "GreenHeader", mergeAcross: 2 }],
      ...(alcanceProductos.length
        ? alcanceProductos.map((product, index) => [{ value: `${index + 1}. ${product}`, styleId: "Bordered", mergeAcross: 2 }])
        : [[{ value: "Sin productos definidos", styleId: "Bordered", mergeAcross: 2 }]]),
      ["", "", ""],
      [{ value: "PROCESOS VINCULADOS A PRODUCTO", styleId: "SectionTitle", mergeAcross: 2 }],
      [
        { value: "PRODUCTO VINCULADO", styleId: "GreenHeaderCenter" },
        { value: "PROCESO", styleId: "GreenHeaderCenter" },
        { value: "SUBPROCESO", styleId: "GreenHeaderCenter" },
      ],
      ...(procesosRows.length
        ? procesosRows.map((row) => [
            { value: row.producto, styleId: "Bordered" },
            { value: row.proceso, styleId: "Bordered" },
            { value: row.subproceso, styleId: "Bordered" },
          ])
        : [[
            { value: "Sin productos", styleId: "Bordered" },
            { value: "Sin procesos vinculados", styleId: "Bordered" },
            { value: "", styleId: "Bordered" },
          ]]),
    ]
    const safeName = (unidad?.nombre || lote.unidadNombre || "lote")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "lote"

    downloadXlsx(`planificacion-${safeName}-ciclo-${lote.ciclo}.xlsx`, [
      {
        name: unidad?.nombre || lote.unidadNombre,
        rows,
        columns: [280, 360, 420],
      },
    ])
  }

  const handleCloseLote = async (loteId: string) => {
    await updateLotStatus(loteId, "cerrado")
    await refresh()
  }

  const selectedLoteConDatos = selectedLote ? lotesConDatos.find((lote) => lote.id === selectedLote.id) : null

  return (
    <div className="space-y-6">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      <Tabs value={isAuditor ? "lotes" : activeTab} onValueChange={setActiveTab} className="w-full">
        {false && (
        <div className="hidden">
          {!isAuditor && (
            <TabsList className="w-full bg-secondary sm:w-fit">
              <TabsTrigger value="lotes">Lotes</TabsTrigger>
              <TabsTrigger value="calendario">Calendario</TabsTrigger>
            </TabsList>
          )}
          <div className={isAuditor ? "hidden" : "flex flex-col gap-2 sm:flex-row"}>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className={canManageLots ? "w-full bg-primary hover:bg-primary/90 sm:w-auto" : "hidden"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[90vw] lg:w-[70vw]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Lote</DialogTitle>
                  <DialogDescription>
                    Define el ciclo de auditoría para una unidad de negocio
                  </DialogDescription>
                </DialogHeader>
                <LoteForm onClose={() => setIsCreateOpen(false)} onSaved={refresh} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        )}

        <TabsContent value="lotes" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
          </div>

          {/* Search */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.4fr)_minmax(150px,0.9fr)_minmax(130px,0.7fr)_minmax(120px,0.6fr)] xl:max-w-5xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidad de negocio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>
              <Select value={unidadFilter} onValueChange={setCicloFilter}>
                <SelectTrigger className="w-full bg-secondary border-border">
                  <SelectValue placeholder="Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ciclo</SelectItem>
                  {ciclosDisponibles.map((ciclo) => (
                    <SelectItem key={ciclo} value={String(ciclo)}>
                      Ciclo {ciclo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anioFilter} onValueChange={setAnioFilter}>
                <SelectTrigger className="w-full bg-secondary border-border">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Año</SelectItem>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={String(anio)}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManageLots && (
              <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto xl:ml-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Lote
              </Button>
            )}
            {canManageLots && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[90vw] lg:w-[70vw]">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Lote</DialogTitle>
                    <DialogDescription>
                      Define el ciclo de auditoria para una unidad de negocio
                    </DialogDescription>
                  </DialogHeader>
                  <LoteForm onClose={() => setIsCreateOpen(false)} onSaved={refresh} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Lotes */}
          <div className="space-y-4">
            {filteredLotes.map((lote) => (
              <Card
                key={lote.id}
                className="min-w-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-none transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => setSelectedLote(lote)}
              >
                <CardContent className="px-3 py-2 sm:px-5">
                  <div className="flex min-w-0 w-full flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between lg:pr-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg overflow-hidden">
                        {lote.unidadLogo ? (
                          <img src={lote.unidadLogo} alt={lote.unidadNombre} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full rounded-lg border border-primary/20 bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{lote.unidadNombre}</p>
                        <p className="truncate text-sm text-muted-foreground">Ciclo {lote.ciclo} - {lote.año} | {lote.modeloNombre}</p>
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{lote.auditoresNombres || "Sin auditores asignados"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                      <div className="flex items-center gap-4">
                        <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLote(lote); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportSingleLote(lote); }}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar Excel
                            </DropdownMenuItem>
                            {canManageLots && lote.estado === "abierto" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCloseLote(lote.id); }} className="text-warning">
                                  <Lock className="h-4 w-4 mr-2" />
                                  Cerrar Lote
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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
              <div className="responsive-scroll overflow-x-auto">
                <table className="w-full min-w-[760px]">
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
                            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[90vw] lg:w-[70vw]">
            <DialogHeader>
              <div className="flex flex-col gap-3 pr-9 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {selectedLoteConDatos?.unidadNombre} - Ciclo {selectedLote.ciclo}
                <Badge className={getEstadoBadgeColor(selectedLote.estado)}>
                  {formatEstado(selectedLote.estado)}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Año {selectedLote.año}
              </DialogDescription>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:mr-2 sm:mt-2 sm:flex-row sm:items-center">
                  <Button variant="outline" size="sm" className="h-8" disabled={!selectedLoteConDatos} onClick={() => selectedLoteConDatos && exportSingleLote(selectedLoteConDatos)}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <LoteDetail lote={selectedLote} onChanged={refresh} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
