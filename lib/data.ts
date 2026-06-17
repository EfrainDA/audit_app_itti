export interface User {
  id: string
  name: string
  email: string
  company?: string
  cargo?: string
  area?: string
  role: "admin" | "supervisor" | "auditor" | "auditado"
  status: "activo" | "inactivo"
  avatar?: string
}

export interface UnidadNegocio {
  id: string
  nombre: string
  ecosistema: string
  codigo: string
  zona: string
  responsable: string
  logo?: string
}

export interface Ciclo {
  id: string
  año: number
  bimestre: number
  fechaInicio: string
  fechaFin: string
  estado?: "habilitado" | "deshabilitado"
}

export interface Umbral {
  id: string
  nombre: string
  min: number
  max: number
  color: "rojo" | "amarillo" | "verde"
}

export interface Vertical {
  id: string
  nombre: string
  descripcion?: string
  peso: number
  tipoEvaluacion: "distribuida" | "cascada"
  contieneProceso?: boolean
  parametros: Parametro[]
}

export interface Parametro {
  id: string
  nombre: string
  descripcion?: string
  puntosBase: number
  permiteIntermedio: boolean
}

export interface ModeloControl {
  id: string
  nombre: string
  descripcion?: string
  estado: "borrador" | "publicado" | "deprecado"
  fechaVigenciaDesde?: string
  fechaVigenciaHasta?: string
  verticales: Vertical[]
  creadoPor: string
  fechaCreacion: string
  unidadesAplicables?: string[]
}

export interface Lote {
  id: string
  unidadNegocioId: string
  modeloControlId: string
  año: number
  ciclo: number
  estado: "abierto" | "cerrado" | "deprecado"
  auditores: string[]
}

export function isCountableLote(lote: Pick<Lote, "estado">): boolean {
  return lote.estado === "abierto" || lote.estado === "cerrado"
}

export interface LoteVertical {
  id: string
  loteId: string
  verticalId: string
  controles: Control[]
}

export interface Control {
  id: string
  loteVerticalId: string
  identificador: string
  descripcion?: string
  estado: "pendiente" | "en_curso" | "en_replica" | "terminado"
  scoreControl?: number
  etiqueta?: "Unidad de Negocio" | "Producto" | "Proceso" | "Proceso de apoyo"
  proceso?: string
  subproceso?: string
  subprocesos?: string[]
  correspondeProceso?: boolean
  producto?: string
  productosVinculados?: string[]
  fechaCreacion: string
  auditorId?: string
}

export interface Auditoria {
  id: string
  loteId: string
  controlId: string
  fecha: string
  estado: "pendiente" | "en_curso" | "en_replica" | "terminada"
  scoreTotal?: number
  auditorId: string
}

export interface Respuesta {
  id: string
  controlId: string
  parametroId: string
  valor: "cumple" | "no_cumple" | "intermedio" | "na" | null
  comentario?: string
  evidencias: string[]
  personasAuditadas?: string[]
  cargosAuditados?: string[]
  areasAuditadas?: string[]
  descargosAuditado?: DescargoAuditado[]
  fechaRespuesta: string
  auditorId: string
}

export interface DescargoAuditado {
  id: string
  respuestaId: string
  usuarioId: string
  comentario?: string
  evidencia?: string
  evidenciaUrl?: string
  fecha: string
}

export interface Notificacion {
  id: string
  usuarioId: string
  titulo: string
  mensaje: string
  tipo: "replica" | "cierre" | "ajuste" | "asignacion"
  leida: boolean
  fecha: string
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-success"
  if (score >= 71) return "text-warning"
  return "text-destructive"
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return "border-success/25 bg-success/10"
  if (score >= 71) return "border-warning/25 bg-warning/10"
  return "border-destructive/25 bg-destructive/10"
}

export function getEstadoBadgeColor(estado: string): string {
  switch (estado) {
    case "terminada":
    case "terminado":
    case "publicado":
    case "activo":
      return "border-success/25 bg-success/10 text-success"
    case "abierto":
      return "border-success/25 bg-success/10 text-success"
    case "cerrado":
      return "border-border bg-muted text-muted-foreground"
    case "en_curso":
      return "border-primary/25 bg-primary/10 text-primary"
    case "pendiente":
    case "borrador":
      return "border-border bg-muted text-muted-foreground"
    case "en_replica":
      return "border-warning/25 bg-warning/10 text-warning"
    case "deprecado":
    case "inactivo":
      return "border-destructive/25 bg-destructive/10 text-destructive"
    default:
      return "border-border bg-muted text-muted-foreground"
  }
}

export function formatEstado(estado: string): string {
  if (estado === "deprecado") return "Dado de Baja"
  return estado.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getControlDisplayEstado(
  control: Pick<Control, "id" | "estado" | "scoreControl">,
  answeredControlIds: Set<string> | string[] = new Set(),
): Control["estado"] {
  const answeredIds = Array.isArray(answeredControlIds) ? new Set(answeredControlIds) : answeredControlIds

  if (control.estado === "pendiente" && (control.scoreControl !== undefined || answeredIds.has(control.id))) {
    return "en_curso"
  }

  return control.estado
}
