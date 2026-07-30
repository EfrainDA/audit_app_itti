export type CycleInput = {
  year: number
  startMonth: number
  endMonth: number
}

export function validateCycleInput(input: CycleInput) {
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) {
    throw new Error("Selecciona un año valido.")
  }
  if (
    !Number.isInteger(input.startMonth)
    || !Number.isInteger(input.endMonth)
    || input.startMonth < 1
    || input.endMonth > 12
    || input.endMonth < input.startMonth
  ) {
    throw new Error("Selecciona un rango de meses valido.")
  }
}

export function getCycleDates(input: CycleInput) {
  validateCycleInput(input)
  const startDate = `${input.year}-${String(input.startMonth).padStart(2, "0")}-01`
  const endDate = new Date(Date.UTC(input.year, input.endMonth, 0)).toISOString().slice(0, 10)
  return { startDate, endDate }
}
