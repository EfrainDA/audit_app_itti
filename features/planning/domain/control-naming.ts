// Reglas puras para nombrar y validar controles según su origen de catálogo.
import type { Control } from "@/lib/data"

export const CONTROL_TAGS: NonNullable<Control["etiqueta"]>[] = [
  "Producto",
  "Proceso",
  "Otro",
  "Área transversal",
]

export function isProcessTag(tag: Control["etiqueta"]) {
  return tag === "Proceso" || tag === "Proceso de apoyo"
}

export function isBusinessUnitTag(tag: Control["etiqueta"]) {
  return tag === "Unidad de Negocio"
}

function isCatalogTag(tag: Control["etiqueta"]) {
  return tag === "Producto" || tag === "Proceso" || tag === "Otro" || tag === "Área transversal"
}

export function buildBusinessUnitControlName(recibe: string, presta: string) {
  if (!recibe || !presta) return ""
  return `${recibe} - ${presta}`
}

export function splitBusinessUnitControlName(name: string) {
  const [recibe = "", presta = ""] = name.split(" - ")
  return { recibe, presta }
}

export type ControlDraft = {
  identificador: string
  etiqueta: NonNullable<Control["etiqueta"]>
  catalogItemId: string
  auditorId: string
  correspondeProceso: boolean
  proceso: string
  subprocesos: string[]
  subprocesoTemp: string
  productosVinculados: string[]
  unidadPrestaServicio: string
  unidadRecibeServicio: string
}

export function createEmptyControlDraft(): ControlDraft {
  return {
    identificador: "",
    etiqueta: "Producto",
    catalogItemId: "",
    auditorId: "",
    correspondeProceso: false,
    proceso: "",
    subprocesos: [],
    subprocesoTemp: "",
    productosVinculados: [],
    unidadPrestaServicio: "",
    unidadRecibeServicio: "",
  }
}

export function toggleListValue(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
}

export function getControlDraftError(control: ControlDraft) {
  if (!control.etiqueta) return "Selecciona un tipo de control."
  if (!control.auditorId) return "Selecciona un analista o especialista de Control de Calidad."

  if (isBusinessUnitTag(control.etiqueta)) {
    if (!control.unidadRecibeServicio) return "Selecciona la unidad de negocio que recibe el servicio."
    if (!control.unidadPrestaServicio) return "Selecciona la unidad de negocio que presta el servicio."
    return null
  }

  if (isCatalogTag(control.etiqueta) && !control.catalogItemId) {
    return "Selecciona un registro del catálogo."
  }

  if (isProcessTag(control.etiqueta)) {
    if (!control.proceso.trim()) return "Completa el nombre del proceso."
    if (control.subprocesos.length === 0) return "Agrega al menos un subproceso."
    return null
  }

  if (!control.identificador.trim()) return "Completa el nombre del control."
  return null
}
