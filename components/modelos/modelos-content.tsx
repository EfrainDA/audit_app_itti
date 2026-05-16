"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
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
import { mockModelos, getEstadoBadgeColor, formatEstado, type ModeloControl } from "@/lib/data"
import { ModeloDetail } from "./modelo-detail"
import { ModeloForm } from "./modelo-form"

export function ModelosContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedModelo, setSelectedModelo] = useState<ModeloControl | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredModelos = mockModelos.filter(
    (modelo) =>
      modelo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header Actions */}
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
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Modelo de Control</DialogTitle>
              <DialogDescription>
                Define la metodología de evaluación con verticales, parámetros y ponderaciones.
              </DialogDescription>
            </DialogHeader>
            <ModeloForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10">
              <FileCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockModelos.filter(m => m.estado === 'publicado').length}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockModelos.filter(m => m.estado === 'borrador').length}</p>
              <p className="text-sm text-muted-foreground">En Borrador</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Archive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockModelos.filter(m => m.estado === 'deprecado').length}</p>
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
            className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setSelectedModelo(modelo)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{modelo.nombre}</h3>
                    <Badge className={getEstadoBadgeColor(modelo.estado)}>
                      {formatEstado(modelo.estado)}
                    </Badge>
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
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Copy className="h-4 w-4 mr-2" />
                      Clonar modelo
                    </DropdownMenuItem>
                    {modelo.estado === 'borrador' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-success">
                          Publicar
                        </DropdownMenuItem>
                      </>
                    )}
                    {modelo.estado === 'publicado' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-destructive">
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
                <ChevronRight className="h-4 w-4 ml-1" />
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
    </div>
  )
}
