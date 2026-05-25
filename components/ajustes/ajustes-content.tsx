"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { useTheme } from "next-themes"
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
  Camera,
  KeyRound,
  Moon,
  Palette,
  Save,
  Sun,
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
  deleteBusinessUnit,
  updateBusinessUnit,
  updateThresholds,
  updateOwnProfile,
  updateUserProfile,
} from "@/lib/supabase-data"
import { downloadCsv } from "@/lib/export"
import { getErrorMessage } from "@/lib/error-message"
import { supabase } from "@/lib/supabase"

export function AjustesContent() {
  const { data, error: dataError, refresh } = useAppData()
  const { appUser, refreshProfile } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const isAuditor = appUser?.role === "auditor"
  const isAdmin = appUser?.role === "admin"
  const canManageSettings = appUser?.role === "admin" || appUser?.role === "supervisor"
  const canManageUsers = isAdmin
  const canCreateUnits = canManageSettings
  const canModifyUnits = isAdmin
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
  const [profileName, setProfileName] = useState(appUser?.name ?? "")
  const [profileCompany, setProfileCompany] = useState(appUser?.company ?? "")
  const [profileAvatar, setProfileAvatar] = useState(appUser?.avatar ?? "")
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("")
  const [profilePassword, setProfilePassword] = useState("")
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const currentTab = activeTab

  useEffect(() => {
    setProfileName(appUser?.name ?? "")
    setProfileCompany(appUser?.company ?? "")
    setProfileAvatar(appUser?.avatar ?? "")
  }, [appUser?.avatar, appUser?.company, appUser?.name])

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

  const handleProfileAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileAvatar(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    setProfileError(null)
    setProfileSuccess(null)

    if (!profileName.trim()) {
      setProfileError("El nombre no puede quedar vacio.")
      return
    }

    if ((profilePassword || profilePasswordConfirm || profileCurrentPassword) && !profileCurrentPassword) {
      setProfileError("Ingresa tu contrasena actual para cambiarla.")
      return
    }

    if ((profilePassword || profilePasswordConfirm || profileCurrentPassword) && !profilePassword) {
      setProfileError("Ingresa la nueva contrasena.")
      return
    }

    if ((profilePassword || profilePasswordConfirm) && profilePassword !== profilePasswordConfirm) {
      setProfileError("Las contrasenas no coinciden.")
      return
    }

    if (profilePassword && profilePassword.length < 6) {
      setProfileError("La contrasena debe tener al menos 6 caracteres.")
      return
    }

    setIsSavingProfile(true)
    try {
      await updateOwnProfile({
        name: profileName,
        company: profileCompany,
        avatar: profileAvatar || null,
      })

      if (profilePassword) {
        const email = appUser?.email
        if (!email) throw new Error("No se pudo validar el correo de tu sesion.")

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: profileCurrentPassword,
        })

        if (signInError) {
          throw new Error("La contrasena actual no es correcta.")
        }

        const { error } = await supabase.auth.updateUser({ password: profilePassword })
        if (error) throw error
        setProfileCurrentPassword("")
        setProfilePassword("")
        setProfilePasswordConfirm("")
      }

      await refreshProfile()
      await refresh()
      setProfileSuccess("Datos actualizados correctamente.")
    } catch (submitError) {
      setProfileError(getErrorMessage(submitError, "No se pudieron guardar tus datos."))
    } finally {
      setIsSavingProfile(false)
    }
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

  if (isAuditor) {
    const isDark = resolvedTheme === "dark"
    const initials = profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"

    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Perfil personal</CardTitle>
            <CardDescription>Actualiza tus datos, foto de perfil, contrasena y preferencia visual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary/10">
                {profileAvatar ? (
                  <img src={profileAvatar} alt={profileName || "Perfil"} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="profile-avatar">Foto de perfil</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" asChild>
                    <label htmlFor="profile-avatar" className="cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Cambiar foto
                    </label>
                  </Button>
                  {profileAvatar && (
                    <Button variant="ghost" onClick={() => setProfileAvatar("")}>
                      Quitar foto
                    </Button>
                  )}
                </div>
                <input id="profile-avatar" type="file" accept="image/*" className="hidden" onChange={handleProfileAvatarChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre y apellido</Label>
                <Input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Correo electronico</Label>
                <Input id="profile-email" value={appUser?.email ?? ""} disabled className="bg-secondary" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-company">Empresa</Label>
                <Input id="profile-company" value={profileCompany} onChange={(event) => setProfileCompany(event.target.value)} className="bg-secondary" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/70 bg-secondary/35 p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Cambiar contrasena
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-current-password">Contrasena actual</Label>
                <Input id="profile-current-password" type="password" value={profileCurrentPassword} onChange={(event) => setProfileCurrentPassword(event.target.value)} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-password">Nueva contrasena</Label>
                <Input id="profile-password" type="password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-password-confirm">Confirmar contrasena</Label>
                <Input id="profile-password-confirm" type="password" value={profilePasswordConfirm} onChange={(event) => setProfilePasswordConfirm(event.target.value)} className="bg-background" />
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-primary" />
                Tema
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant={!isDark ? "default" : "outline"} onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4 mr-2" />
                  Claro
                </Button>
                <Button variant={isDark ? "default" : "outline"} onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4 mr-2" />
                  Oscuro
                </Button>
              </div>
            </div>

            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileSuccess && <p className="text-sm text-success">{profileSuccess}</p>}
            <div className="flex justify-end border-t border-border pt-4">
              <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={handleSaveProfile} disabled={isSavingProfile}>
                <Save className="h-4 w-4 mr-2" />
                {isSavingProfile ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dataError && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{dataError}</p>}
      <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:grid-cols-5 sm:overflow-visible">
          <TabsTrigger value="usuarios" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
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
          <TabsTrigger value="auditlog" className="min-w-[5.5rem] flex-none flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* Usuarios Tab */}
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
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={resetUnidadForm} disabled={!canCreateUnits}>
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
                      <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Input className="h-9 w-full bg-secondary sm:w-24" value={newCycleYear} disabled={!canManageSettings} onChange={(event) => setNewCycleYear(event.target.value)} />
                <Select value={newCycleBimester} onValueChange={setNewCycleBimester} disabled={!canManageSettings}>
                  <SelectTrigger className="h-9 w-full bg-secondary sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((bimester) => (
                      <SelectItem key={bimester} value={String(bimester)}>Bim. {bimester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={handleCreateCycle} disabled={!canManageSettings || isSavingCycle}>
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
                            disabled={!canManageSettings}
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

        {/* Audit Log Tab */}
        <TabsContent value="auditlog" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
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
