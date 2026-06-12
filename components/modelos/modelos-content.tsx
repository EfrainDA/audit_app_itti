"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  ArrowUpRight,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Archive,
  FileCheck,
  Calendar,
  User,
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
import { getEstadoBadgeColor, formatEstado, type ModeloControl } from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { cloneControlModel, deleteControlModel, updateControlModelStatus } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"
import { ModeloDetail } from "./modelo-detail"
import { ModeloForm } from "./modelo-form"

export function ModelosContent() {
  const router = useRouter()
  const { data, error: dataError, refresh } = useAppData()
  const { appUser } = useAuth()
  const canManageModels = appUser?.role === "admin" || appUser?.role === "supervisor"
  const canDeleteModels = appUser?.role === "admin"
  const modelos = data.modelos
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<"vigentes" | "all" | ModeloControl["estado"]>("vigentes")
  const [selectedModelo, setSelectedModelo] = useState<ModeloControl | null>(null)
  const [editingModelo, setEditingModelo] = useState<ModeloControl | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredModelos = modelos.filter((modelo) => {
    const matchesEstado =
      estadoFilter === "all" ||
      (estadoFilter === "vigentes" ? modelo.estado === "publicado" || modelo.estado === "borrador" : modelo.estado === estadoFilter)
    const matchesSearch =
      modelo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(modelo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesEstado && matchesSearch
  })

  const handleModelAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
      await refresh()
    } catch (error) {
      setActionError(getErrorMessage(error, "No se pudo completar la accion."))
    }
  }

  return (
    <div className="space-y-4">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      {actionError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="h-20 gap-0 border-border/70 bg-card py-0">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={FileCheck} tone="success" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'publicado').length}</p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-20 gap-0 border-border/70 bg-card py-0">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={FileCheck} tone="primary" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'borrador').length}</p>
              <p className="text-xs text-muted-foreground">En Borrador</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-20 gap-0 border-border/70 bg-card py-0">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={Archive} tone="neutral" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'deprecado').length}</p>
              <p className="text-xs text-muted-foreground">Dados de baja</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-fit lg:grid-cols-[280px_220px]">
          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border/70"
            />
          </div>
          <Select value={estadoFilter} onValueChange={(value) => setEstadoFilter(value as typeof estadoFilter)}>
            <SelectTrigger className="w-full border-border/70 bg-card lg:w-[220px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vigentes">Publicados y borrador</SelectItem>
              <SelectItem value="publicado">Publicados</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
              <SelectItem value="deprecado">Dados de baja</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="group h-10 w-full border-primary/25 bg-primary px-4 hover:bg-primary/90 sm:w-auto"
          disabled={!canManageModels}
          onClick={() => router.push("/modelos/nuevo")}
        >
          <Plus className="h-4 w-4" />
          Nuevo Modelo
          <ArrowUpRight className="h-3.5 w-3.5 opacity-80 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Modelos Grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filteredModelos.map((modelo) => (
          <Card
            key={modelo.id}
            className="min-w-0 bg-card border-border cursor-pointer transition-colors hover:border-primary/35"
            onClick={() => setSelectedModelo(modelo)}
          >
            <CardContent className="p-4">
              <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-semibold leading-tight">{modelo.nombre}</h3>
                    <Badge className={getEstadoBadgeColor(modelo.estado)}>
                      {formatEstado(modelo.estado)}
                    </Badge>
                  </div>
                  <p className="line-clamp-1 text-sm leading-5 text-muted-foreground">
                    {modelo.descripcion || "Sin descripcion"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedModelo(modelo); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalle
                    </DropdownMenuItem>
                    {modelo.estado === "borrador" && (
                      <DropdownMenuItem disabled={!canManageModels} onClick={(e) => { e.stopPropagation(); setEditingModelo(modelo); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar borrador
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled={!canManageModels} onClick={(e) => { e.stopPropagation(); handleModelAction(() => cloneControlModel(modelo)); }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Clonar modelo
                    </DropdownMenuItem>
                    {modelo.estado === 'borrador' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!canManageModels} onClick={(e) => { e.stopPropagation(); handleModelAction(() => updateControlModelStatus(modelo.id, "publicado")); }} className="text-success">
                          Publicar
                        </DropdownMenuItem>
                      </>
                    )}
                    {modelo.estado === 'publicado' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!canManageModels} onClick={(e) => { e.stopPropagation(); handleModelAction(() => updateControlModelStatus(modelo.id, "deprecado")); }} className="text-destructive">
                          <Archive className="h-4 w-4 mr-2" />
                          Dar de baja
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canDeleteModels}
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!window.confirm(`Eliminar el modelo "${modelo.nombre}"? Esta accion no se puede deshacer.`)) return
                        handleModelAction(() => deleteControlModel(modelo.id))
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Eliminar modelo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{modelo.creadoPor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{new Date(modelo.fechaCreacion).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                {modelo.verticales.length > 0 && (
                  <div className="border-t border-border/70 pt-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Verticales</p>
                      <span className="text-xs font-semibold text-muted-foreground">{modelo.verticales.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {modelo.verticales.map((vertical) => (
                        <Badge key={vertical.id} variant="outline" className="max-w-full truncate px-2 py-0.5 text-[11px]">
                          {vertical.nombre} ({vertical.peso}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modelo Detail Dialog */}
      {selectedModelo && (
        <Dialog open={!!selectedModelo} onOpenChange={(open) => !open && setSelectedModelo(null)}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[88vw] lg:max-w-5xl">
            <DialogHeader className="border-b border-border/60 pb-3 pr-8">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-xl">{selectedModelo.nombre}</DialogTitle>
                <Badge className={getEstadoBadgeColor(selectedModelo.estado)}>
                  {formatEstado(selectedModelo.estado)}
                </Badge>
              </div>
              {selectedModelo.descripcion && (
                <DialogDescription className="line-clamp-2 max-w-3xl">
                  {selectedModelo.descripcion}
                </DialogDescription>
              )}
            </DialogHeader>
            <ModeloDetail modelo={selectedModelo} />
          </DialogContent>
        </Dialog>
      )}

      {editingModelo && (
        <Dialog open={!!editingModelo} onOpenChange={(open) => !open && setEditingModelo(null)}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[90vw] lg:w-[70vw]">
            <DialogHeader>
              <DialogTitle>Editar Modelo de Control</DialogTitle>
              <DialogDescription>
                Ajusta el borrador antes de publicarlo.
              </DialogDescription>
            </DialogHeader>
            <ModeloForm
              modelo={editingModelo}
              onClose={() => setEditingModelo(null)}
              onSaved={async () => {
                await refresh()
                setSelectedModelo(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
