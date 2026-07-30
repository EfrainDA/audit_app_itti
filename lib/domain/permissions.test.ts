import { describe, expect, it } from "vitest"
import {
  canAccessModels,
  canEditAssignedControl,
  canManageControls,
  isAdmin,
  isExecutive,
  isManager,
} from "./permissions"

describe("permisos por rol", () => {
  it.each([
    ["admin", true],
    ["supervisor", true],
    ["auditor", false],
    ["ceo", false],
    ["auditado", false],
  ] as const)("identifica managers para %s", (role, expected) => {
    expect(isManager(role)).toBe(expected)
  })

  it("separa privilegios administrativos y ejecutivos", () => {
    expect(isAdmin("admin")).toBe(true)
    expect(isAdmin("supervisor")).toBe(false)
    expect(isExecutive("ceo")).toBe(true)
    expect(isExecutive("admin")).toBe(false)
  })

  it("limita modelos y permite controles según el rol", () => {
    expect(canAccessModels("supervisor")).toBe(true)
    expect(canAccessModels("auditor")).toBe(false)
    expect(canAccessModels("ceo")).toBe(false)
    expect(canManageControls("auditor")).toBe(true)
    expect(canManageControls("ceo")).toBe(false)
  })

  it("permite al auditor editar solo sus controles asignados", () => {
    expect(canEditAssignedControl("auditor", "auditor-1", "auditor-1")).toBe(true)
    expect(canEditAssignedControl("auditor", "auditor-1", "auditor-2")).toBe(false)
    expect(canEditAssignedControl("auditor", "auditor-1", undefined)).toBe(false)
    expect(canEditAssignedControl("supervisor", "supervisor-1", "auditor-2")).toBe(true)
    expect(canEditAssignedControl("ceo", "ceo-1", "auditor-2")).toBe(false)
  })
})
