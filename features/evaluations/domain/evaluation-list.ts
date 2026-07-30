import {
  getControlDisplayEstado,
  type Control,
  type Lote,
  type LoteVertical,
  type ModeloControl,
} from "../../../lib/data"

export function getCompleteLotVerticals(
  lot: Lote,
  lotVerticals: LoteVertical[],
  models: ModeloControl[],
): LoteVertical[] {
  const existing = lotVerticals.filter((lotVertical) => lotVertical.loteId === lot.id)
  const model = models.find((item) => item.id === lot.modeloControlId)

  return model?.verticales.map((vertical, index) => {
    const current = existing.find((lotVertical) => lotVertical.verticalId === vertical.id)
    return current ?? {
      id: `lv-${lot.id}-${vertical.id}-${index}`,
      loteId: lot.id,
      verticalId: vertical.id,
      controles: [],
    }
  }) ?? existing
}

export function matchesControlStatus(status: string, filter: string) {
  if (filter === "all") return true
  if (filter === "terminado") return status === "terminado" || status === "terminada"
  if (filter === "en_curso") return status === "en_curso"
  return status === filter
}

export function controlMatchesFilters(
  control: Control,
  normalizedSearch: string,
  statusFilter: string,
  answeredControlIds: Set<string>,
) {
  const searchableFields = [
    control.identificador,
    control.descripcion,
    control.etiqueta,
    control.proceso,
    control.subproceso,
    control.producto,
    ...(control.productosVinculados ?? []),
  ]
  const matchesSearch = normalizedSearch.length === 0
    || searchableFields.some((value) => value?.toLowerCase().includes(normalizedSearch))

  return matchesSearch
    && matchesControlStatus(getControlDisplayEstado(control, answeredControlIds), statusFilter)
}
