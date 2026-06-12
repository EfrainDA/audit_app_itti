"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
  Lock,
  Unlock,
  Download,
  MoreHorizontal,
  Eye,
  RotateCcw,
  Trash2,
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
  isCountableLote,
} from "@/lib/data"
import { LoteForm } from "./lote-form"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { downloadCsv, downloadXlsx } from "@/lib/export"
import { updateLotStatus } from "@/lib/supabase-data"

export function PlanificacionContent() {
  const router = useRouter()
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
  const [cicloFilter, setCicloFilter] = useState("all")
  const [anioFilter, setAnioFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("abierto")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("lotes")
  const [statusError, setStatusError] = useState<string | null>(null)
  const unidades = data.unidades
  const lotesComputables = lotes.filter(isCountableLote)
  const lotesDadosDeBaja = lotes.filter((lote) => lote.estado === "deprecado")

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
    const matchesCiclo = cicloFilter === "all" || String(lote.ciclo) === cicloFilter
    const matchesAnio = anioFilter === "all" || String(lote.año) === anioFilter
    const matchesEstado = estadoFilter === "all" || lote.estado === estadoFilter
    const matchesAuditor = !isAuditor || lote.auditores.includes(appUser?.id ?? "")

    return matchesSearch && matchesCiclo && matchesAnio && matchesEstado && matchesAuditor
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
    setStatusError(null)
    try {
      await updateLotStatus(loteId, "cerrado")
      await refresh()
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "No se pudo cerrar el lote.")
    }
  }

  const handleDeprecateLote = async (loteId: string) => {
    if (!window.confirm("Dar de baja este lote? Quedara fuera de metricas y evaluaciones.")) return
    setStatusError(null)
    try {
      await updateLotStatus(loteId, "deprecado")
      await refresh()
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "No se pudo dar de baja el lote.")
    }
  }

  const handleReactivateLote = async (loteId: string) => {
    setStatusError(null)
    try {
      await updateLotStatus(loteId, "abierto")
      await refresh()
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "No se pudo reactivar el lote.")
    }
  }

  return (
    <div className="space-y-4">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      {statusError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{statusError}</p>}
      <Tabs value={isAuditor ? "lotes" : activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="lotes" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="h-20 gap-0 border-border/70 bg-card py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Calendar} tone="primary" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.length}</p>
                  <p className="text-xs text-muted-foreground">Total de Lotes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-20 gap-0 border-border/70 bg-card py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Unlock} tone="success" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "abierto").length}</p>
                  <p className="text-xs text-muted-foreground">Abiertos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-20 gap-0 border-border/70 bg-card py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Lock} tone="neutral" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "cerrado").length}</p>
                  <p className="text-xs text-muted-foreground">Cerrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="h-20 gap-0 border-border/70 bg-card py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Lock} tone="danger" size="md" />
                <div>
                  <p className="text-2xl font-semibold leading-none tracking-tight">{lotesDadosDeBaja.length}</p>
                  <p className="text-xs text-muted-foreground">Dados de baja</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-fit lg:grid-cols-[280px_150px_120px_110px]">
              <div className="relative w-full lg:w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidad de negocio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card border-border/70"
                />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full bg-card border-border/70 lg:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abierto">Abiertos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cerrado">Cerrados</SelectItem>
                  <SelectItem value="deprecado">Dados de baja</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cicloFilter} onValueChange={setCicloFilter}>
                <SelectTrigger className="w-full bg-card border-border/70">
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
                <SelectTrigger className="w-full bg-card border-border/70">
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
          <div className="space-y-3">
            {filteredLotes.map((lote) => (
              <Card
                key={lote.id}
                className="min-w-0 cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-card shadow-none transition-colors hover:border-primary/50"
                onClick={() => router.push(`/planificacion/${lote.id}`)}
              >
                <CardContent className="px-3 py-3 sm:px-4">
                  <div className="grid min-w-0 w-full grid-cols-1 gap-3 text-left md:grid-cols-[1.35fr_0.8fr_1fr_auto] md:items-center">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded">
                        {lote.unidadLogo ? (
                          <img src={lote.unidadLogo} alt={lote.unidadNombre} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded border border-primary/20 bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lote.unidadNombre}</p>
                        <p className="truncate text-xs text-muted-foreground">{lote.modeloNombre}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Ciclo {lote.ciclo} - {lote.año}</p>
                    <p className="truncate text-sm text-muted-foreground">{lote.auditoresNombres || "Sin auditores"}</p>
                    <div className="flex items-center gap-2 md:justify-end">
                      <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/planificacion/${lote.id}`); }}>
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
                          {canManageLots && lote.estado !== "deprecado" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeprecateLote(lote.id); }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Dar de baja
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManageLots && lote.estado === "deprecado" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReactivateLote(lote.id); }} className="text-success">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reactivar lote
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  const lotesBimestre = lotes.filter((l) => l.ciclo === bimestre && l.año === 2026 && isCountableLote(l))
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
                        <Badge className={isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-muted text-muted-foreground" : "bg-card"}>
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

    </div>
  )
}
