"use client"

// Selector compartido para conservar formato, posición y comportamiento de
// ciclo en todos los dashboards.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Ciclo } from "@/lib/data"

const YEAR_KEY = "a\u00f1o"

export function DashboardCycleFilter({
  cycles,
  activeCycle,
  value,
  onValueChange,
}: {
  cycles: Ciclo[]
  activeCycle: Ciclo
  value: string
  onValueChange: (value: string) => void
}) {
  const cycleOptions = [...cycles].sort((first, second) => {
    const yearDiff = second[YEAR_KEY] - first[YEAR_KEY]
    return yearDiff || second.bimestre - first.bimestre
  })

  return (
    <div className="flex w-full justify-end sm:w-auto">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-full border-border/70 bg-background px-2.5 text-xs shadow-none sm:w-[12rem]">
          <SelectValue placeholder="Ciclo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">
            Ciclo vigente ({activeCycle.bimestre} - {activeCycle[YEAR_KEY]})
          </SelectItem>
          {cycleOptions.map((cycle) => (
            <SelectItem key={cycle.id} value={cycle.id}>
              Ciclo {cycle.bimestre} - {cycle[YEAR_KEY]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
