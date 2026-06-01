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
  Plus,
  ImagePlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Shield,
  KeyRound,
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
import { useAuth } from "@/components/auth/auth-provider"
import {
  createBusinessUnit,
  createCycle,
  createUserProfile,
  assignUserPassword,
  deleteBusinessUnit,
  updateBusinessUnit,
  updateThresholds,
  updateUserProfile,
  updateCycle,
} from "@/lib/supabase-data"
import { downloadCsv } from "@/lib/export"
import { getErrorMessage } from "@/lib/error-message"
import { supabase } from "@/lib/supabase"

export function AjustesContent() {
  const { data, error: dataError, refresh } = useAppData()
  const { appUser } = useAuth()
  const isAuditor = appUser?.role === "auditor"
  const isAdmin = appUser?.role === "admin"
  const canManageSettings = appUser?.role === "admin" || appUser?.role === "supervisor"
  const canManageUsers = isAdmin
  const canCreateUnits = canManageSettings
  const canModifyUnits = canManageSettings
  const canDeleteUnits = isAdmin
  const users = data.users
  const unidades = data.unidades
  const ciclos = data.ciclos
  const umbrales = data.umbrales
  const [activeTab, setActiveTab] = useState(isAdmin ? "usuarios" : "unidades")
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
  const [passwordUser, setPasswordUser] = useState<typeof users[number] | null>(null)
  const [assignedPassword, setAssignedPassword] = useState("")
  const [assignedPasswordConfirm, setAssignedPasswordConfirm] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [newCycleYear, setNewCycleYear] = useState("2026")
  const [newCycleBimester, setNewCycleBimester] = useState("1")
  const [isCycleOpen, setIsCycleOpen] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [cycleError, setCycleError] = useState<string | null>(null)
  const [isSavingCycle, setIsSavingCycle] = useState(false)
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, { min: number; max: number }>>({})
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [isSavingThresholds, setIsSavingThresholds] = useState(false)
  const currentTab = activeTab

  useEffect(() => {
    if (!isAdmin && activeTab === "usuarios") {
      setActiveTab("unidades")
    }
  }, [activeTab, isAdmin])

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

  const resetPasswordForm = () => {
    setPasswordUser(null)
    setAssignedPassword("")
    setAssignedPasswordConfirm("")
    setPasswordError(null)
  }

  const handleAssignPassword = async () => {
    if (!passwordUser) return

    setPasswordError(null)
    if (assignedPassword.length < 6) {
      setPasswordError("La contrasena debe tener al menos 6 caracteres.")
      return
    }
    if (assignedPassword !== assignedPasswordConfirm) {
      setPasswordError("Las contrasenas no coinciden.")
      return
    }

    setIsSavingPassword(true)
    try {
      await assignUserPassword(passwordUser.id, assignedPassword)
      resetPasswordForm()
    } catch (submitError) {
      setPasswordError(getErrorMessage(submitError, "No se pudo asignar la contrasena."))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const resetCycleForm = () => {
    setEditingCycleId(null)
    setNewCycleYear("2026")
    setNewCycleBimester("1")
    setCycleError(null)
  }

  const openCreateCycle = () => {
    resetCycleForm()
    setIsCycleOpen(true)
  }

  const openEditCycle = (cycle: typeof ciclos[number]) => {
    setEditingCycleId(cycle.id)
    setNewCycleYear(String(cycle.año))
    setNewCycleBimester(String(cycle.bimestre))
    setCycleError(null)
    setIsCycleOpen(true)
  }

  const handleSaveCycle = async () => {
    setCycleError(null)
    setIsSavingCycle(true)

    try {
      const input = { year: Number(newCycleYear), bimester: Number(newCycleBimester) }
      if (editingCycleId) {
        await updateCycle(editingCycleId, input)
      } else {
        await createCycle(input)
      }
      await refresh()
      setEditingCycleId(null)
      setIsCycleOpen(false)
    } catch (submitError) {
      setCycleError(getErrorMessage(submitError, "No se pudo guardar el ciclo."))
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
      setThresholdError(getErrorMessage(submitError, "No se pudieron guardar los cambios."))
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

  if (isAuditor) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Ajustes no disponibles</CardTitle>
          <CardDescription>Usa Preferencias para administrar tu perfil personal.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"} sm:overflow-visible`}>
          {isAdmin && (
            <TabsTrigger value="usuarios" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="unidades" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Unidades</span>
          </TabsTrigger>
          <TabsTrigger value="ciclos" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Ciclos</span>
          </TabsTrigger>
          <TabsTrigger value="umbrales" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Umbrales</span>
          </TabsTrigger>
        </TabsList>

        {/* Usuarios Tab */}
        {isAdmin && (
          <TabsContent value="usuarios" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <CardTitle className="text-base">Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios y sus roles en el sistema</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportUsers}>
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
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90 sm:w-auto" disabled={!canManageUsers}>
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
                        <Input value={userName} disabled={!canManageUsers} onChange={(event) => setUserName(event.target.value)} placeholder="Nombre del usuario" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input value={userEmail} disabled={!canManageUsers} onChange={(event) => setUserEmail(event.target.value)} type="email" placeholder="usuario@empresa.com" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select value={userRole} onValueChange={(value) => setUserRole(value as typeof userRole)} disabled={!canManageUsers}>
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
                      <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => setIsUserOpen(false)}>Cancelar</Button>
                        <Button className="bg-primary" onClick={handleCreateUser} disabled={!canManageUsers || isSavingUser || !userName.trim() || !userEmail.trim()}>
                          {isSavingUser ? "Creando..." : "Crear Usuario"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 w-full max-w-md">
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
                              <Button variant="ghost" size="icon" disabled={!canManageUsers}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={!canManageUsers} onClick={() => handleUpdateUserRole(user.id, user.role === "admin" ? "auditor" : "admin")}>
                                <Edit className="h-4 w-4 mr-2" />
                                {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!canManageUsers} onClick={() => handleUpdateUserRole(user.id, user.role === "auditor" ? "supervisor" : "auditor")}>
                                {user.role === "auditor" ? "Pasar a supervisor" : "Pasar a auditor"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!canManageUsers} onClick={() => setPasswordUser(user)}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Asignar contrasena
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled={!canManageUsers} className="text-destructive" onClick={() => handleUpdateUserStatus(user.id, user.status === "activo" ? "inactivo" : "activo")}>
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
          <Dialog
            open={Boolean(passwordUser)}
            onOpenChange={(open) => {
              if (!open) resetPasswordForm()
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar contrasena</DialogTitle>
                <DialogDescription>
                  Define una nueva contrasena para {passwordUser?.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="assigned-password">Nueva contrasena</Label>
                  <Input
                    id="assigned-password"
                    type="password"
                    autoComplete="new-password"
                    value={assignedPassword}
                    onChange={(event) => setAssignedPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned-password-confirm">Confirmar contrasena</Label>
                  <Input
                    id="assigned-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={assignedPasswordConfirm}
                    onChange={(event) => setAssignedPasswordConfirm(event.target.value)}
                  />
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={resetPasswordForm}>Cancelar</Button>
                  <Button
                    className="bg-primary"
                    onClick={handleAssignPassword}
                    disabled={isSavingPassword || !assignedPassword || !assignedPasswordConfirm}
                  >
                    {isSavingPassword ? "Guardando..." : "Asignar contrasena"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </TabsContent>
        )}

        {/* Unidades Tab */}
        <TabsContent value="unidades" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Unidades de Negocio</CardTitle>
                <CardDescription>Administra las unidades de negocioy el ecosistema al que pertenecen</CardDescription>
              </div>
              <Dialog
                open={isUnidadOpen}
                onOpenChange={(open) => {
                  setIsUnidadOpen(open)
                  if (!open) resetUnidadForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={resetUnidadForm} disabled={!canCreateUnits}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Unidad
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{editingUnidad ? "Editar Unidad de Negocio" : "Nueva Unidad de Negocio"}</DialogTitle>
                    <DialogDescription>
                      Carga los datos de la unidad y su logo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <div className="flex items-center gap-4 rounded-lg border border-border/70 bg-secondary/35 p-4">
                      <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
                        {unidadLogo ? (
                          <img src={unidadLogo} alt="Logo de la unidad" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="unidad-logo" className="text-sm font-medium">
                          Logo de la unidad
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Se usará como identificador visual en planificación y lotes.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild disabled={!canCreateUnits}>
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
                        disabled={!canCreateUnits}
                        onChange={handleUnidadLogoChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre de la Unidad de Negocio *</Label>
                      <Input
                        value={unidadNombre}
                        disabled={!canCreateUnits}
                        onChange={(event) => setUnidadNombre(event.target.value)}
                        placeholder="Ej. ueno bank"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ecosistema al que pertenece *</Label>
                      <Input
                        value={unidadEcosistema}
                        disabled={!canCreateUnits}
                        onChange={(event) => setUnidadEcosistema(event.target.value)}
                        placeholder="Ej. Financiero, Tecnológico, etc."
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
                        disabled={!canCreateUnits || isSavingUnidad || !unidadNombre.trim() || !unidadEcosistema.trim()}
                      >
                        {isSavingUnidad ? "Guardando..." : editingUnidad ? "Guardar Cambios" : "Crear Unidad"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-[38%]">Nombre</TableHead>
                    <TableHead className="w-[42%]">Ecosistema</TableHead>
                    <TableHead className="w-[20%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades.map((unidad) => (
                    <TableRow key={unidad.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-14 items-center justify-center overflow-hidden rounded-md border border-primary/20 bg-primary/10">
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
                        {canModifyUnits ? (
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
                              {canDeleteUnits && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteUnidad(unidad.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
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
            <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <CardTitle className="text-base">Configuración de Ciclos</CardTitle>
                <CardDescription>Define los períodos bimestrales para auditorías</CardDescription>
              </div>
              <Dialog
                open={isCycleOpen}
                onOpenChange={(open) => {
                  setIsCycleOpen(open)
                  if (!open) resetCycleForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
                    onClick={openCreateCycle}
                    disabled={!canManageSettings}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Ciclo
                  </Button>
                </DialogTrigger>
                <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[22rem] gap-4 p-5 sm:!w-[22rem] sm:!max-w-[22rem] md:!max-w-[22rem] lg:!max-w-[22rem]">
                  <DialogHeader>
                    <DialogTitle>{editingCycleId ? "Editar ciclo" : "Nuevo ciclo"}</DialogTitle>
                    <DialogDescription>
                      Selecciona el año y bimestre. Las fechas se calculan automáticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cycle-year">Año</Label>
                      <Input
                        id="cycle-year"
                        className="h-9 w-full bg-secondary"
                        value={newCycleYear}
                        disabled={!canManageSettings}
                        onChange={(event) => setNewCycleYear(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cycle-bimester">Bimestre</Label>
                      <Select value={newCycleBimester} onValueChange={setNewCycleBimester} disabled={!canManageSettings}>
                        <SelectTrigger id="cycle-bimester" className="h-9 w-full bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: "1", label: "Bim. 1 (Ene - Feb)" },
                            { value: "2", label: "Bim. 2 (Mar - Abr)" },
                            { value: "3", label: "Bim. 3 (May - Jun)" },
                            { value: "4", label: "Bim. 4 (Jul - Ago)" },
                            { value: "5", label: "Bim. 5 (Sep - Oct)" },
                            { value: "6", label: "Bim. 6 (Nov - Dic)" },
                          ].map((bimester) => (
                            <SelectItem key={bimester.value} value={bimester.value}>{bimester.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {cycleError && <p className="text-sm text-destructive">{cycleError}</p>}
                  <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => setIsCycleOpen(false)} disabled={isSavingCycle}>
                      Cancelar
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleSaveCycle}
                      disabled={!canManageSettings || isSavingCycle}
                    >
                      {isSavingCycle ? "Guardando..." : editingCycleId ? "Guardar ciclo" : "Crear ciclo"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {cycleError && !isCycleOpen && <p className="mb-4 text-sm text-destructive">{cycleError}</p>}
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
                            disabled={!canManageSettings}
                            onClick={() => openEditCycle(ciclo)}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                            disabled={!canManageSettings}
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
                            disabled={!canManageSettings}
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
                <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={handleSaveThresholds} disabled={!canManageSettings || isSavingThresholds}>
                  {isSavingThresholds ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
