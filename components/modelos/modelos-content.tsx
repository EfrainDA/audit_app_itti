"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Archive,
  FileCheck,
  Calendar,
  User,
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
import { getEstadoBadgeColor, formatEstado, type ModeloControl } from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { cloneControlModel, updateControlModelStatus } from "@/lib/supabase-data"
import { ModeloDetail } from "./modelo-detail"
import { ModeloForm } from "./modelo-form"

export function ModelosContent() {
  const { data, error: dataError, refresh } = useAppData()
  const modelos = data.modelos
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedModelo, setSelectedModelo] = useState<ModeloControl | null>(null)
  const [editingModelo, setEditingModelo] = useState<ModeloControl | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredModelos = modelos.filter(
    (modelo) =>
      modelo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleModelAction = async (action: () => Promise<void>) => {
    await action()
    await refresh()
  }

  return (
    <div className="space-y-6">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nuevo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Modelo de Control</DialogTitle>
              <DialogDescription>
                Establece la metodología de evaluación configurando las verticales, los parámetros de calidad y la asignación de puntajes.
              </DialogDescription>
            </DialogHeader>
            <ModeloForm onClose={() => setIsCreateOpen(false)} onSaved={refresh} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="h-24 gap-0 border-success/15 bg-card/88 py-0 backdrop-blur-xl dark:border-success/25 dark:bg-card/86">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={FileCheck} tone="success" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'publicado').length}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-24 gap-0 border-primary/15 bg-card/88 py-0 backdrop-blur-xl dark:border-primary/25 dark:bg-card/86">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={FileCheck} tone="primary" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'borrador').length}</p>
              <p className="text-sm text-muted-foreground">En Borrador</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-24 gap-0 border-border/70 bg-card/88 py-0 backdrop-blur-xl dark:border-primary/18 dark:bg-card/86">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={Archive} tone="neutral" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{modelos.filter(m => m.estado === 'deprecado').length}</p>
              <p className="text-sm text-muted-foreground">Deprecados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modelos Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredModelos.map((modelo) => (
          <Card
            key={modelo.id}
            className="bg-card border-border cursor-pointer"
            onClick={() => setSelectedModelo(modelo)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{modelo.nombre}</h3>
                    <Badge className={getEstadoBadgeColor(modelo.estado)}>
                      {formatEstado(modelo.estado)}
                    </Badge> {/* Ensure consistent badge styling */}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {modelo.descripcion || "Sin descripción"}
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingModelo(modelo); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar borrador
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleModelAction(() => cloneControlModel(modelo)); }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Clonar modelo
                    </DropdownMenuItem>
                    {modelo.estado === 'borrador' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleModelAction(() => updateControlModelStatus(modelo.id, "publicado")); }} className="text-success">
                          Publicar
                        </DropdownMenuItem>
                      </>
                    )}
                    {modelo.estado === 'publicado' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleModelAction(() => updateControlModelStatus(modelo.id, "deprecado")); }} className="text-destructive">
                          <Archive className="h-4 w-4 mr-2" />
                          Deprecar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{modelo.creadoPor}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(modelo.fechaCreacion).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                {modelo.verticales.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Verticales ({modelo.verticales.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {modelo.verticales.map((vertical) => (
                        <Badge key={vertical.id} variant="outline" className="text-xs">
                          {vertical.nombre} ({vertical.peso}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end mt-4 text-primary text-sm">
                <span>Ver detalle</span>
                <ChevronRight className="h-4 w-4 ml-1" /> {/* Consistent icon sizing */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modelo Detail Dialog */}
      {selectedModelo && (
        <Dialog open={!!selectedModelo} onOpenChange={(open) => !open && setSelectedModelo(null)}>
          <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedModelo.nombre}
                <Badge className={getEstadoBadgeColor(selectedModelo.estado)}>
                  {formatEstado(selectedModelo.estado)}
                </Badge>
              </DialogTitle>
              <DialogDescription>{selectedModelo.descripcion}</DialogDescription>
            </DialogHeader>
            <ModeloDetail modelo={selectedModelo} />
          </DialogContent>
        </Dialog>
      )}

      {editingModelo && (
        <Dialog open={!!editingModelo} onOpenChange={(open) => !open && setEditingModelo(null)}>
          <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
