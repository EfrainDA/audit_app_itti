import type { ModeloControl } from "@/lib/data"

export type ControlModelInput = {
  name: string
  description?: string
  status: ModeloControl["estado"]
  verticals: Array<{
    name: string
    weight: number
    evaluationMode: "distribuida" | "cascada"
    containsProcess?: boolean
    parameters: Array<{
      name: string
      description?: string
      basePoints: number
      allowsIntermediate: boolean
    }>
  }>
}
