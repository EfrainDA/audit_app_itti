"use client"

// Administración de perfiles, roles, estado y asignación segura de contraseñas.
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { User } from "@/lib/data"
import { getErrorMessage } from "@/lib/error-message"
import { assignUserPassword, createUserProfile, updateUserProfile } from "@/lib/repositories/supabase/users"
import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Pencil, Plus, Power } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { SettingsSectionHeader } from "./settings-section-header"

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "ceo", "supervisor", "auditor"]),
  cargo: z.string().optional(),
  area: z.string().optional(),
})
type Values = z.infer<typeof schema>
const passwordSchema = z.object({
  password: z.string().min(12, "Debe tener al menos 12 caracteres.").regex(/[A-Z]/, "Incluye una mayúscula.").regex(/[a-z]/, "Incluye una minúscula.").regex(/\d/, "Incluye un número."),
  confirmation: z.string(),
}).refine((values) => values.password === values.confirmation, { path: ["confirmation"], message: "Las contraseñas no coinciden." })
type PasswordValues = z.infer<typeof passwordSchema>

export function UsersSettings({ users, canManage, onChanged }: { users: User[]; canManage: boolean; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", role: "auditor", cargo: "", area: "" } })
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { password: "", confirmation: "" } })
  const show = (user?: User) => { setEditing(user ?? null); setError(null); form.reset({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role === "admin" || user?.role === "ceo" || user?.role === "supervisor" ? user.role : "auditor", cargo: user?.cargo ?? "", area: user?.area ?? "" }); setOpen(true) }
  const submit = form.handleSubmit(async (values) => {
    try {
      if (editing) await updateUserProfile(editing.id, { name: values.name, role: values.role, cargo: values.cargo, area: values.area })
      else await createUserProfile(values)
      await onChanged(); setOpen(false)
    } catch (cause) { setError(getErrorMessage(cause, "No se pudo guardar el usuario.")) }
  })
  const submitPassword = passwordForm.handleSubmit(async (values) => {
    if (!passwordUser) return
    try {
      await assignUserPassword(passwordUser.id, values.password)
      setPasswordUser(null)
      passwordForm.reset()
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo asignar la contraseña."))
    }
  })
  return <>
    <div className="space-y-3">
      <SettingsSectionHeader
        title="Usuarios"
        description="Perfiles habilitados para Administrador, CEO, Supervisor y Auditor."
        action={<Button size="sm" onClick={() => show()} disabled={!canManage}><Plus className="mr-2 h-4 w-4" />Nuevo usuario</Button>}
      />
      <Card className="overflow-hidden border-border/70 py-0 shadow-none">
        <CardContent className="p-0"><Table containerClassName="rounded-none border-0"><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Cargo / área</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{[user.cargo, user.area].filter(Boolean).join(" · ") || "—"}</TableCell><TableCell className="capitalize">{user.role === "admin" ? "Administrador" : user.role === "ceo" ? "CEO" : user.role}</TableCell><TableCell className="capitalize">{user.status}</TableCell><TableCell><div className="flex justify-end"><Button title="Editar" size="icon" variant="ghost" onClick={() => show(user)} disabled={!canManage}><Pencil className="h-4 w-4" /></Button><Button title="Asignar contraseña" size="icon" variant="ghost" onClick={() => { setPasswordUser(user); setError(null); passwordForm.reset() }} disabled={!canManage}><KeyRound className="h-4 w-4" /></Button><Button title="Cambiar estado" size="icon" variant="ghost" onClick={async () => { await updateUserProfile(user.id, { status: user.status === "activo" ? "inactivo" : "activo" }); await onChanged() }} disabled={!canManage}><Power className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table></CardContent>
      </Card>
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-3"><div><Label>Nombre</Label><Input {...form.register("name")} /></div><div><Label>Correo</Label><Input type="email" disabled={Boolean(editing)} {...form.register("email")} /></div><div><Label>Rol</Label><Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as Values["role"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="ceo">CEO</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="auditor">Auditor</SelectItem></SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div><Label>Cargo</Label><Input {...form.register("cargo")} /></div><div><Label>Área</Label><Input {...form.register("area")} /></div></div>{error && <p className="text-sm text-status-danger-text">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(passwordUser)} onOpenChange={(next) => { if (!next) setPasswordUser(null) }}><DialogContent><DialogHeader><DialogTitle>Asignar contraseña a {passwordUser?.name}</DialogTitle></DialogHeader><form onSubmit={submitPassword} className="space-y-3"><div><Label>Nueva contraseña</Label><Input type="password" {...passwordForm.register("password")} />{passwordForm.formState.errors.password && <p className="text-xs text-status-danger-text">{passwordForm.formState.errors.password.message}</p>}</div><div><Label>Confirmar contraseña</Label><Input type="password" {...passwordForm.register("confirmation")} />{passwordForm.formState.errors.confirmation && <p className="text-xs text-status-danger-text">{passwordForm.formState.errors.confirmation.message}</p>}</div>{error && <p className="text-sm text-status-danger-text">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPasswordUser(null)}>Cancelar</Button><Button type="submit">Asignar</Button></div></form></DialogContent></Dialog>
  </>
}
