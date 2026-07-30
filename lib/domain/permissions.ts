import type { User } from "@/lib/data"

export type AppRole = User["role"]

export function isExecutive(role?: AppRole) {
  return role === "ceo"
}

export function isAdmin(role?: AppRole) {
  return role === "admin"
}

export function isManager(role?: AppRole) {
  return role === "admin" || role === "supervisor"
}

export function canManageControls(role?: AppRole) {
  return isManager(role) || role === "auditor"
}

export function canEditAssignedControl(
  role: AppRole | undefined,
  currentUserId: string | undefined,
  assignedAuditorId: string | undefined,
) {
  if (isManager(role)) return true
  return role === "auditor"
    && Boolean(currentUserId)
    && assignedAuditorId === currentUserId
}

export function canAccessModels(role?: AppRole) {
  return role !== "auditor" && role !== "auditado" && role !== "ceo"
}
