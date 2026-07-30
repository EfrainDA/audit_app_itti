"use client"

// Pantalla maestra que filtra lotes y abre sus flujos de creación y detalle.
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import { SafeImage } from "@/components/ui/safe-image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAppData } from "@/hooks/use-app-data"
import {
  formatEstado,
  getEstadoBadgeColor,
} from "@/lib/data"
import { downloadXlsx } from "@/lib/export"
import { updateLotStatus } from "@/lib/repositories/supabase/planning"
import {
  Building2,
  Calendar,
  Download,
  Eye,
  Lock,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LoteForm } from "./lote-form"

// Centraliza filtros y acciones permitidas para el rol autenticado.
export function PlanificacionContent() {
  const router = useRouter()
  const { data, error: dataError, refresh } = useAppData({ domains: ["users", "settings", "models", "planning", "evaluations"] })
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
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)
  const [lotToDeprecate, setLotToDeprecate] = useState<{ id: string; name: string } | null>(null)
  const unidades = data.unidades
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

  const exportSingleLote = (lote: (typeof lotesConDatos)[number]) => {
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
      [{ value: "PLANIFICACIÓN DEL LOTE", styleId: "TitleCenter", mergeAcross: 2 }],
      ["", "", ""],
      [{ value: "DATOS GENERALES", styleId: "DarkHeader", mergeAcross: 2 }],
      [{ value: "Nombre del lote", styleId: "DetailLabel" }, { value: `${lote.unidadNombre} · ${lote.modeloNombre}`, styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Unidad de negocio", styleId: "DetailLabel" }, { value: lote.unidadNombre, styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Modelo de control", styleId: "DetailLabel" }, { value: lote.modeloNombre, styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Ciclo", styleId: "DetailLabel" }, { value: `Ciclo ${lote.ciclo} - ${lote.año}`, styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Estado", styleId: "DetailLabel" }, { value: formatEstado(lote.estado), styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Auditores", styleId: "DetailLabel" }, { value: lote.auditoresNombres || "Sin auditores asignados", styleId: "DetailValue", mergeAcross: 1 }],
      [{ value: "Fecha de exportación", styleId: "DetailLabel" }, { value: new Date().toLocaleDateString("es-PY"), styleId: "DetailValue", mergeAcross: 1 }],
      ["", "", ""],
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
    const safeName = `${lote.unidadNombre}-${lote.modeloNombre}`
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "lote"

    downloadXlsx(`planificacion-${safeName}-ciclo-${lote.ciclo}-${lote.año}.xlsx`, [
      {
        name: "Planificación",
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
      {dataError && <p className="rounded-lg border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">{dataError}</p>}
      {statusError && <p className="rounded-lg border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">{statusError}</p>}
      <Tabs value={isAuditor ? "lotes" : activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="lotes" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card variant="surface" className="h-20 gap-0 py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Calendar} tone="primary" size="md" />
                <div>
                  <p className="text-3xl font-semibold leading-none tracking-tight">{lotes.length}</p>
                  <p className="text-xs text-muted-foreground">Total de Lotes</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="surface" className="h-20 gap-0 py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Unlock} tone="success" size="md" />
                <div>
                  <p className="text-3xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "abierto").length}</p>
                  <p className="text-xs text-muted-foreground">Abiertos</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="surface" className="h-20 gap-0 py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Lock} tone="neutral" size="md" />
                <div>
                  <p className="text-3xl font-semibold leading-none tracking-tight">{lotes.filter((l) => l.estado === "cerrado").length}</p>
                  <p className="text-xs text-muted-foreground">Cerrados</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="surface" className="h-20 gap-0 py-0">
              <CardContent className="flex h-full items-center gap-3 px-4 py-0">
                <RealisticIcon icon={Lock} tone="danger" size="md" />
                <div>
                  <p className="text-3xl font-semibold leading-none tracking-tight">{lotesDadosDeBaja.length}</p>
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
                      Define el ciclo de auditoría para una unidad de negocio
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
                role="link"
                tabIndex={0}
                className="min-w-0 cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-card shadow-none transition-colors hover:border-primary/50"
                onClick={() => router.push(`/planificacion/${lote.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    router.push(`/planificacion/${lote.id}`)
                  }
                }}
              >
                <CardContent className="px-3 py-3 sm:px-4">
                  <div className="grid min-w-0 w-full grid-cols-1 gap-3 text-left md:grid-cols-[1.35fr_0.8fr_1fr_auto] md:items-center">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded">
                        {lote.unidadLogo ? (
                          <SafeImage src={lote.unidadLogo} alt={lote.unidadNombre} className="h-full w-full object-contain" />
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
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCloseLote(lote.id); }} className="text-status-warning-text">
                                <Lock className="h-4 w-4 mr-2" />
                                Cerrar Lote
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManageLots && lote.estado !== "deprecado" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStatusSuccess(null); setLotToDeprecate({ id: lote.id, name: lote.unidadNombre || `Ciclo ${lote.ciclo}` }); }} className="text-status-danger-text">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Dar de baja
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManageLots && lote.estado === "deprecado" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReactivateLote(lote.id); }} className="text-status-success-text">
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

      </Tabs>

      {statusSuccess && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-surface px-3 py-2 text-sm text-status-success-text">{statusSuccess}</p>}
      <ConfirmDestructiveDialog
        open={Boolean(lotToDeprecate)}
        onOpenChange={(next) => {
          if (!next) setLotToDeprecate(null)
        }}
        title="Dar de baja el lote"
        description={`El lote “${lotToDeprecate?.name ?? ""}” quedará fuera de métricas y evaluaciones.`}
        confirmLabel="Dar de baja"
        pendingLabel="Dando de baja..."
        errorMessage="No se pudo dar de baja el lote."
        onConfirm={async () => {
          if (!lotToDeprecate) return
          await updateLotStatus(lotToDeprecate.id, "deprecado")
          await refresh()
          setStatusSuccess("El lote fue dado de baja correctamente.")
        }}
      />

    </div>
  )
}
