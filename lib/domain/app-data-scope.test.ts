import { describe, expect, it } from "vitest"
import { getAppDataScopeKey } from "./app-data-scope"

describe("alcance de cache de datos", () => {
  it("separa cache global, por lote y por control", () => {
    expect(getAppDataScopeKey()).toBe("all")
    expect(getAppDataScopeKey({ lotId: "lot-1" })).toBe("lot:lot-1")
    expect(getAppDataScopeKey({ controlId: "control-1" })).toBe("control:control-1")
  })

  it("prioriza el control cuando recibe ambos identificadores", () => {
    expect(getAppDataScopeKey({ lotId: "lot-1", controlId: "control-1" })).toBe("control:control-1")
  })
})
