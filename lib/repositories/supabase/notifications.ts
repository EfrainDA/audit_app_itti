// Lectura y marcado de notificaciones del usuario autenticado.
import type { Notificacion } from "@/lib/data"
import type { AppRole } from "@/lib/domain/permissions"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 500

type NotificationRow = {
  id: string
  user_id: string
  title: string
  message: string
  type: Notificacion["tipo"]
  read: boolean
  created_at: string
}

const TITLES_BY_ROLE: Partial<Record<AppRole, string[]>> = {
  auditor: ["Lote asignado"],
  supervisor: ["Auditor terminó su asignación", "Lote completado al 100%"],
}

export async function fetchNotifications(userId: string, role: AppRole, signal: AbortSignal): Promise<Notificacion[]> {
  const allowedTitles = TITLES_BY_ROLE[role] ?? []
  if (!allowedTitles.length) return []
  const rows: NotificationRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,message,type,read,created_at")
      .eq("user_id", userId)
      .in("title", allowedTitles)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .abortSignal(signal)

    if (error) throw error
    const page = (data ?? []) as NotificationRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows.map((notification) => ({
    id: notification.id,
    usuarioId: notification.user_id,
    titulo: notification.title,
    mensaje: notification.message,
    tipo: notification.type,
    leida: notification.read,
    fecha: notification.created_at,
  }))
}

export async function setNotificationRead(id: string) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("No se pudo marcar la notificación como leída.")
}

export async function setAllNotificationsRead(userId: string, ids: string[]) {
  if (!ids.length) return

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .in("id", ids)

  if (error) throw error
}
