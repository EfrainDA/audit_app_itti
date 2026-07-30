"use client"

// Preferencias personales: perfil, avatar, contraseña y tema visual.
// Las mutaciones de cuenta se ejecutan mediante repositorios dedicados.
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SafeImage } from "@/components/ui/safe-image"
import { getErrorMessage } from "@/lib/error-message"
import { changeOwnPassword } from "@/lib/repositories/supabase/account"
import { updateOwnProfile } from "@/lib/repositories/supabase/users"
import { Camera, KeyRound, Moon, Palette, Save, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState, type ChangeEvent } from "react"

export function ProfilePreferences() {
  const { appUser, refreshProfile } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [profileName, setProfileName] = useState(appUser?.name ?? "")
  const [profileCompany, setProfileCompany] = useState(appUser?.company ?? "")
  const [profileCargo, setProfileCargo] = useState(appUser?.cargo ?? "")
  const [profileArea, setProfileArea] = useState(appUser?.area ?? "")
  const [profileAvatar, setProfileAvatar] = useState(appUser?.avatar ?? "")
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("")
  const [profilePassword, setProfilePassword] = useState("")
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    setProfileName(appUser?.name ?? "")
    setProfileCompany(appUser?.company ?? "")
    setProfileCargo(appUser?.cargo ?? "")
    setProfileArea(appUser?.area ?? "")
    setProfileAvatar(appUser?.avatar ?? "")
  }, [appUser?.area, appUser?.avatar, appUser?.cargo, appUser?.company, appUser?.name])

  const handleProfileAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 2 * 1024 * 1024) {
      setProfileError("La foto debe ser JPG, PNG o WebP y no superar 2 MB.")
      event.target.value = ""
      return
    }

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

    setIsSavingProfile(true)
    try {
      await updateOwnProfile({
        name: profileName,
        company: profileCompany,
        cargo: profileCargo,
        area: profileArea,
        avatar: profileAvatar || null,
      })

      await refreshProfile()
      setProfileSuccess("Datos actualizados correctamente.")
    } catch (submitError) {
      setProfileError(getErrorMessage(submitError, "No se pudieron guardar tus datos."))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)
    if (!profileCurrentPassword) return setPasswordError("Ingresa tu contraseña actual.")
    if (profilePassword !== profilePasswordConfirm) return setPasswordError("Las contraseñas no coinciden.")
    if (profilePassword.length < 12 || !/[A-Z]/.test(profilePassword) || !/[a-z]/.test(profilePassword) || !/\d/.test(profilePassword)) {
      return setPasswordError("La contraseña debe tener al menos 12 caracteres, mayúsculas, minúsculas y números.")
    }

    const email = appUser?.email
    if (!email) return setPasswordError("No se pudo validar el correo de tu sesión.")
    setIsSavingPassword(true)
    try {
      await changeOwnPassword({
        email,
        currentPassword: profileCurrentPassword,
        newPassword: profilePassword,
      })
      setProfileCurrentPassword("")
      setProfilePassword("")
      setProfilePasswordConfirm("")
      setPasswordSuccess("Contraseña actualizada correctamente.")
    } catch (cause) {
      setPasswordError(getErrorMessage(cause, "No se pudo actualizar la contraseña."))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const isDark = resolvedTheme === "dark"
  const initials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Card className="border-border/70 bg-card py-0">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-base">Perfil personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-secondary">
              {profileAvatar ? (
                <SafeImage src={profileAvatar} alt={profileName || "Perfil"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-primary">{initials}</span>
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
              <input id="profile-avatar" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleProfileAvatarChange} />
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
            <div className="space-y-2">
              <Label htmlFor="profile-cargo">Cargo</Label>
              <Input id="profile-cargo" value={profileCargo} onChange={(event) => setProfileCargo(event.target.value)} className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-area">Área</Label>
              <Input id="profile-area" value={profileArea} onChange={(event) => setProfileArea(event.target.value)} className="bg-secondary" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-company">Empresa</Label>
              <Input id="profile-company" value={profileCompany} onChange={(event) => setProfileCompany(event.target.value)} className="bg-secondary" />
            </div>
          </div>

          <div className="rounded-lg border border-border/65 bg-muted/20 p-3">
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

          {profileError && <p className="text-sm text-status-danger-text">{profileError}</p>}
          {profileSuccess && <p className="text-sm text-status-success-text">{profileSuccess}</p>}
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={handleSaveProfile} disabled={isSavingProfile}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingProfile ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/70 bg-card py-0">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" />Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="profile-current-password">Contraseña actual</Label><Input id="profile-current-password" type="password" value={profileCurrentPassword} onChange={(event) => setProfileCurrentPassword(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="profile-password">Nueva contraseña</Label><Input id="profile-password" type="password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="profile-password-confirm">Confirmar contraseña</Label><Input id="profile-password-confirm" type="password" value={profilePasswordConfirm} onChange={(event) => setProfilePasswordConfirm(event.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Mínimo 12 caracteres, con mayúsculas, minúsculas y números.</p>
          {passwordError && <p role="alert" className="text-sm text-status-danger-text">{passwordError}</p>}
          {passwordSuccess && <p role="status" className="text-sm text-status-success-text">{passwordSuccess}</p>}
          <div className="flex justify-end border-t border-border/60 pt-4"><Button onClick={handleSavePassword} disabled={isSavingPassword}>{isSavingPassword ? "Actualizando..." : "Actualizar contraseña"}</Button></div>
        </CardContent>
      </Card>
    </div>
  )
}
