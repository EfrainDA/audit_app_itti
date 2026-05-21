"use client"

import { useEffect, useState, type ChangeEvent } from "react"
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
import { useAppData } from "@/hooks/use-app-data"
import {
  createBusinessUnit,
  createCycle,
  createUserProfile,
  deleteBusinessUnit,
  updateBusinessUnit,
  updateThresholds,
  updateUserProfile,
} from "@/lib/supabase-data"
import { downloadCsv } from "@/lib/export"
import { getErrorMessage } from "@/lib/error-message"
import { supabase } from "@/lib/supabase"

export function AjustesContent() {
  const { data, error: dataError, refresh } = useAppData()
  const users = data.users
  const unidades = data.unidades
  const ciclos = data.ciclos
  const umbrales = data.umbrales
  const [activeTab, setActiveTab] = useState("usuarios")
  const [searchTerm, setSearchTerm] = useState("")
  const [isUnidadOpen, setIsUnidadOpen] = useState(false)
  const [editingUnidad, setEditingUnidad] = useState<UnidadNegocio | null>(null)
  const [unidadNombre, setUnidadNombre] = useState("")
  const [unidadEcosistema, setUnidadEcosistema] = useState("")
  const [unidadLogo, setUnidadLogo] = useState("")
  const [unidadError, setUnidadError] = useState<string | null>(null)
  const [isSavingUnidad, setIsSavingUnidad] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "auditor" | "auditado">("auditor")
  const [userError, setUserError] = useState<string | null>(null)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [newCycleYear, setNewCycleYear] = useState("2026")
  const [newCycleBimester, setNewCycleBimester] = useState("1")
  const [cycleError, setCycleError] = useState<string | null>(null)
  const [isSavingCycle, setIsSavingCycle] = useState(false)
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, { min: number; max: number }>>({})
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [isSavingThresholds, setIsSavingThresholds] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel("ajustes-users-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const resetUnidadForm = () => {
    setEditingUnidad(null)
    setUnidadNombre("")
    setUnidadEcosistema("")
    setUnidadLogo("")
    setUnidadError(null)
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

  const handleSubmitUnidad = async () => {
    setUnidadError(null)
    setIsSavingUnidad(true)

    try {
      if (editingUnidad) {
        await updateBusinessUnit(editingUnidad.id, {
          name: unidadNombre,
          ecosystem: unidadEcosistema,
          logoUrl: unidadLogo || editingUnidad.logo,
        })
      } else {
        await createBusinessUnit({
          name: unidadNombre,
          ecosystem: unidadEcosistema,
          logoUrl: unidadLogo || null,
        })
      }

      await refresh()
      resetUnidadForm()
      setIsUnidadOpen(false)
    } catch (submitError) {
      setUnidadError(getErrorMessage(submitError, "No se pudo guardar la unidad."))
    } finally {
      setIsSavingUnidad(false)
    }
  }

  const handleDeleteUnidad = async (id: string) => {
    await deleteBusinessUnit(id)
    await refresh()
  }

  const resetUserForm = () => {
    setUserName("")
    setUserEmail("")
    setUserRole("auditor")
    setUserError(null)
  }

  const handleCreateUser = async () => {
    setUserError(null)
    setIsSavingUser(true)

    try {
      await createUserProfile({ name: userName, email: userEmail, role: userRole })
      await refresh()
      resetUserForm()
      setIsUserOpen(false)
    } catch (submitError) {
      setUserError(getErrorMessage(submitError, "No se pudo crear el usuario."))
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleUpdateUserStatus = async (id: string, status: "activo" | "inactivo") => {
    await updateUserProfile(id, { status })
    await refresh()
  }

  const handleUpdateUserRole = async (id: string, role: "admin" | "supervisor" | "auditor" | "auditado") => {
    await updateUserProfile(id, { role })
    await refresh()
  }

  const handleCreateCycle = async () => {
    setCycleError(null)
    setIsSavingCycle(true)

    try {
      await createCycle({ year: Number(newCycleYear), bimester: Number(newCycleBimester) })
      await refresh()
    } catch (submitError) {
      setCycleError(getErrorMessage(submitError, "No se pudo crear el ciclo."))
    } finally {
      setIsSavingCycle(false)
    }
  }

  const handleSaveThresholds = async () => {
    setThresholdError(null)
    setIsSavingThresholds(true)

    try {
      await updateThresholds(
        umbrales.map((umbral) => ({
          id: umbral.id,
          min: thresholdDrafts[umbral.id]?.min ?? umbral.min,
          max: thresholdDrafts[umbral.id]?.max ?? umbral.max,
        })),
      )
      await refresh()
    } catch (submitError) {
      setThresholdError(getErrorMessage(submitError, "No se pudieron guardar los umbrales."))
    } finally {
      setIsSavingThresholds(false)
    }
  }

  const exportUsers = () => {
    downloadCsv(
      "usuarios.csv",
      users.map((user) => ({
        nombre: user.name,
        email: user.email,
        empresa: user.company ?? "",
        rol: user.role,
        estado: user.status,
      })),
    )
  }

  return (
    <div className="space-y-6">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
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
                <Button variant="outline" size="sm" onClick={exportUsers}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Dialog
                  open={isUserOpen}
                  onOpenChange={(open) => {
                    setIsUserOpen(open)
                    if (!open) resetUserForm()
                  }}
                >
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
                        <Input value={userName} onChange={(event) => setUserName(event.target.value)} placeholder="Nombre del usuario" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input value={userEmail} onChange={(event) => setUserEmail(event.target.value)} type="email" placeholder="usuario@empresa.com" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select value={userRole} onValueChange={(value) => setUserRole(value as typeof userRole)}>
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
                      {userError && <p className="text-sm text-destructive">{userError}</p>}
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsUserOpen(false)}>Cancelar</Button>
                        <Button className="bg-primary" onClick={handleCreateUser} disabled={isSavingUser || !userName.trim() || !userEmail.trim()}>
                          {isSavingUser ? "Creando..." : "Crear Usuario"}
                        </Button>
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
                              <DropdownMenuItem onClick={() => handleUpdateUserRole(user.id, user.role === "admin" ? "auditor" : "admin")}>
                                <Edit className="h-4 w-4 mr-2" />
                                {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateUserRole(user.id, user.role === "auditor" ? "supervisor" : "auditor")}>
                                {user.role === "auditor" ? "Pasar a supervisor" : "Pasar a auditor"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateUserStatus(user.id, user.status === "activo" ? "inactivo" : "activo")}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {user.status === "activo" ? "Desactivar" : "Reactivar"}
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
                    {unidadError && <p className="text-sm text-destructive">{unidadError}</p>}
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
                        disabled={isSavingUnidad || !unidadNombre.trim() || !unidadEcosistema.trim()}
                      >
                        {isSavingUnidad ? "Guardando..." : editingUnidad ? "Guardar Cambios" : "Crear Unidad"}
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
                              onClick={() => handleDeleteUnidad(unidad.id)}
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
              <div className="flex items-center gap-2">
                <Input className="h-9 w-24 bg-secondary" value={newCycleYear} onChange={(event) => setNewCycleYear(event.target.value)} />
                <Select value={newCycleBimester} onValueChange={setNewCycleBimester}>
                  <SelectTrigger className="h-9 w-32 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((bimester) => (
                      <SelectItem key={bimester} value={String(bimester)}>Bim. {bimester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleCreateCycle} disabled={isSavingCycle}>
                <Plus className="h-4 w-4 mr-2" />
                {isSavingCycle ? "Guardando..." : "Nuevo Ciclo"}
              </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cycleError && <p className="mb-4 text-sm text-destructive">{cycleError}</p>}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNewCycleYear(String(ciclo.año))
                              setNewCycleBimester(String(ciclo.bimestre))
                            }}
                          >
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
                            value={thresholdDrafts[umbral.id]?.min ?? umbral.min}
                            onChange={(event) =>
                              setThresholdDrafts((current) => ({
                                ...current,
                                [umbral.id]: {
                                  min: Number(event.target.value),
                                  max: current[umbral.id]?.max ?? umbral.max,
                                },
                              }))
                            }
                            className="mt-1 bg-background"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Máximo</Label>
                          <Input
                            type="number"
                            value={thresholdDrafts[umbral.id]?.max ?? umbral.max}
                            onChange={(event) =>
                              setThresholdDrafts((current) => ({
                                ...current,
                                [umbral.id]: {
                                  min: current[umbral.id]?.min ?? umbral.min,
                                  max: Number(event.target.value),
                                },
                              }))
                            }
                            className="mt-1 bg-background"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {thresholdError && <p className="text-sm text-destructive">{thresholdError}</p>}
              <div className="flex justify-end">
                <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveThresholds} disabled={isSavingThresholds}>
                  {isSavingThresholds ? "Guardando..." : "Guardar Cambios"}
                </Button>
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
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No hay una tabla de auditoria configurada todavia.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
