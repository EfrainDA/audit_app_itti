"use client"

// Caché independiente de notificaciones para actualizar contadores y estados de
// lectura sin recargar todos los dominios de la aplicación.
import useSWR from "swr"
import { useAuth } from "@/components/auth/auth-provider"
import {
  fetchNotifications,
  setAllNotificationsRead,
  setNotificationRead,
} from "@/lib/repositories/supabase/notifications"

export function useNotifications() {
  const { appUser } = useAuth()
  const userId = appUser?.id
  const query = useSWR(
    userId ? ["notifications", userId] : null,
    async ([, requestedUserId]: [string, string]) => {
      const controller = new AbortController()
      return fetchNotifications(requestedUserId, controller.signal)
    },
    {
      keepPreviousData: false,
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    },
  )

  const markRead = async (id: string) => {
    const current = query.data ?? []
    await query.mutate(
      async () => {
        await setNotificationRead(id)
        return current.map((notification) =>
          notification.id === id ? { ...notification, leida: true } : notification,
        )
      },
      {
        optimisticData: current.map((notification) =>
          notification.id === id ? { ...notification, leida: true } : notification,
        ),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  const markAllRead = async () => {
    if (!userId) return
    const current = query.data ?? []
    const unreadIds = current.filter((notification) => !notification.leida).map((notification) => notification.id)
    await query.mutate(
      async () => {
        await setAllNotificationsRead(userId, unreadIds)
        return current.map((notification) => ({ ...notification, leida: true }))
      },
      {
        optimisticData: current.map((notification) => ({ ...notification, leida: true })),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    markRead,
    markAllRead,
  }
}
