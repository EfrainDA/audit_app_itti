"use client"

import { useState, type ChangeEvent } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users,
  Building2,
  Calendar,
  Gauge,
  History,
  Plus,
  ImagePlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Shield,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { getEstadoBadgeColor, formatEstado, type UnidadNegocio } from "@/lib/data"
import { useUnidades } from "@/hooks/use-unidades"
import { useAppData } from "@/hooks/use-app-data"

export function AjustesContent() {
  const { data } = useAppData()
  const users = data.users
  const ciclos = data.ciclos
  const umbrales = data.umbrales
  const [activeTab, setActiveTab] = useState("usuarios")
  const [searchTerm, setSearchTerm] = useState("")
  const { unidades, setUnidades } = useUnidades()
  const [isUnidadOpen, setIsUnidadOpen] = useState(false)
  const [editingUnidad, setEditingUnidad] = useState<UnidadNegocio | null>(null)
  const [unidadNombre, setUnidadNombre] = useState("")
  const [unidadEcosistema, setUnidadEcosistema] = useState("")
  const [unidadLogo, setUnidadLogo] = useState("")

  const resetUnidadForm = () => {
    setEditingUnidad(null)
    setUnidadNombre("")
    setUnidadEcosistema("")
    setUnidadLogo("")
  }

  const handleUnidadLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUnidadLogo(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const openEditUnidad = (unidad: UnidadNegocio) => {
    setEditingUnidad(unidad)
    setUnidadNombre(unidad.nombre)
    setUnidadEcosistema(unidad.ecosistema)
    setUnidadLogo(unidad.logo || "")
    setIsUnidadOpen(true)
  }

  const handleSubmitUnidad = () => {
    if (editingUnidad) {
      setUnidades((current) =>
        current.map((unidad) =>
          unidad.id === editingUnidad.id
            ? {
                ...unidad,
                nombre: unidadNombre.trim(),
                ecosistema: unidadEcosistema.trim(),
                logo: unidadLogo || unidad.logo,
              }
            : unidad
        )
      )
    } else {
      const nextUnidad: UnidadNegocio = {
        id: `unidad-${Date.now()}`,
        nombre: unidadNombre.trim(),
        ecosistema: unidadEcosistema.trim(),
        codigo: "",
        zona: "",
        responsable: "",
        logo: unidadLogo || "/placeholder-logo.png",
      }

      setUnidades((current) => [nextUnidad, ...current])
    }

    resetUnidadForm()
    setIsUnidadOpen(false)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary grid w-full grid-cols-5">
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="unidades" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Unidades</span>
          </TabsTrigger>
          <TabsTrigger value="ciclos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Ciclos</span>
          </TabsTrigger>
          <TabsTrigger value="umbrales" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Umbrales</span>
          </TabsTrigger>
          <TabsTrigger value="auditlog" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* Usuarios Tab */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios y sus roles en el sistema</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Usuario</DialogTitle>
                      <DialogDescription>
                        Agrega un nuevo usuario al sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input placeholder="Nombre del usuario" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input type="email" placeholder="usuario@empresa.com" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="auditado">Auditado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline">Cancelar</Button>
                        <Button className="bg-primary">Crear Usuario</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter((u) =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary text-xs font-medium">
                                {user.name.split(" ").map((n) => n[0]).join("")}
                              </span>
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getEstadoBadgeColor(user.status)}>
                            {formatEstado(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Cambiar Rol
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unidades Tab */}
        <TabsContent value="unidades" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Unidades de Negocio</CardTitle>
                <CardDescription>Administra las unidades y el ecosistema al que pertenecen</CardDescription>
              </div>
              <Dialog
                open={isUnidadOpen}
                onOpenChange={(open) => {
                  setIsUnidadOpen(open)
                  if (!open) resetUnidadForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={resetUnidadForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Unidad
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{editingUnidad ? "Editar Unidad de Negocio" : "Nueva Unidad de Negocio"}</DialogTitle>
                    <DialogDescription>
                      Carga los datos de la unidad y su imagen para verla luego en planificación y lotes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <div className="flex items-center gap-4 rounded-lg border border-border/70 bg-secondary/35 p-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
                        {unidadLogo ? (
                          <img src={unidadLogo} alt="Logo de la unidad" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="unidad-logo" className="text-sm font-medium">
                          Foto o logo de la unidad
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Se usará como identificador visual en planificación y lotes.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor="unidad-logo" className="cursor-pointer">
                          <ImagePlus className="h-4 w-4 mr-2" />
                          Cargar
                        </label>
                      </Button>
                      <input
                        id="unidad-logo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUnidadLogoChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre de la Unidad de Negocio *</Label>
                      <Input
                        value={unidadNombre}
                        onChange={(event) => setUnidadNombre(event.target.value)}
                        placeholder="Ej. ueno bank"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ecosistema al que pertenece *</Label>
                      <Input
                        value={unidadEcosistema}
                        onChange={(event) => setUnidadEcosistema(event.target.value)}
                        placeholder="Ej. Financiero, Pagos, Seguros"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUnidadNombre("")
                          setUnidadEcosistema("")
                          setIsUnidadOpen(false)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleSubmitUnidad}
                        disabled={!unidadNombre.trim() || !unidadEcosistema.trim()}
                      >
                        {editingUnidad ? "Guardar Cambios" : "Crear Unidad"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ecosistema</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades.map((unidad) => (
                    <TableRow key={unidad.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-primary/20 bg-primary/10">
                            {unidad.logo ? (
                              <img src={unidad.logo} alt={unidad.nombre} className="h-full w-full object-contain" />
                            ) : (
                              <Building2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="font-medium">{unidad.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary">
                          {unidad.ecosistema}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditUnidad(unidad)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setUnidades((current) => current.filter((item) => item.id !== unidad.id))}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ciclos Tab */}
        <TabsContent value="ciclos" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Configuración de Ciclos</CardTitle>
                <CardDescription>Define los períodos bimestrales para auditorías</CardDescription>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Ciclo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Año</TableHead>
                    <TableHead>Bimestre</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ciclos.map((ciclo) => {
                    const isActive = ciclo.bimestre === 3 && ciclo.año === 2026
                    return (
                      <TableRow key={ciclo.id} className="border-border">
                        <TableCell className="font-medium">{ciclo.año}</TableCell>
                        <TableCell>Bimestre {ciclo.bimestre}</TableCell>
                        <TableCell>{new Date(ciclo.fechaInicio).toLocaleDateString("es-ES")}</TableCell>
                        <TableCell>{new Date(ciclo.fechaFin).toLocaleDateString("es-ES")}</TableCell>
                        <TableCell>
                          <Badge className={isActive ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
                            {isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Umbrales Tab */}
        <TabsContent value="umbrales" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Umbrales de Calidad (Semáforo)</CardTitle>
              <CardDescription>
                Configura los rangos de calificación para la visualización en dashboards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {umbrales.map((umbral) => (
                  <Card
                    key={umbral.id}
                    className={`border-2 ${
                      umbral.color === "rojo"
                        ? "border-destructive bg-destructive/5"
                        : umbral.color === "amarillo"
                        ? "border-warning bg-warning/5"
                        : "border-success bg-success/5"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{umbral.nombre}</h3>
                        <div
                          className={`w-4 h-4 rounded-full ${
                            umbral.color === "rojo"
                              ? "bg-destructive"
                              : umbral.color === "amarillo"
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Mínimo</Label>
                          <Input
                            type="number"
                            defaultValue={umbral.min}
                            className="mt-1 bg-background"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Máximo</Label>
                          <Input
                            type="number"
                            defaultValue={umbral.max}
                            className="mt-1 bg-background"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end">
                <Button className="bg-primary hover:bg-primary/90">Guardar Cambios</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="auditlog" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Registro de Actividad</CardTitle>
                <CardDescription>Historial de acciones realizadas en el sistema</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Logs
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { timestamp: "2026-05-13 10:45:23", user: "Efraín González", action: "MODEL_PUBLISHED", entity: "Modelo Operativo 2026", details: "Estado: Borrador → Publicado" },
                    { timestamp: "2026-05-13 09:30:15", user: "Carlos López", action: "SCORE_UPDATED", entity: "AUD-0001", details: "Score: 75% → 78%" },
                    { timestamp: "2026-05-12 16:20:00", user: "María García", action: "LOT_CREATED", entity: "Lote Ciclo 3 - Sede Central", details: "Auditores: 2 asignados" },
                    { timestamp: "2026-05-12 14:15:30", user: "Ana Martínez", action: "EVIDENCE_UPLOADED", entity: "Control C-0005", details: "Archivo: evidencia_001.pdf" },
                    { timestamp: "2026-05-11 11:00:00", user: "Sistema", action: "LOGIN", entity: "Efraín González", details: "IP: 192.168.1.100" },
                  ].map((log, idx) => (
                    <TableRow key={idx} className="border-border">
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.timestamp}
                      </TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.entity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
