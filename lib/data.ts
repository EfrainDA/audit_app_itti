export interface User {
  id: string
  name: string
  email: string
  company?: string
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
  preguntas: Pregunta[]
}

export interface Pregunta {
  id: string
  texto: string
  tipoRespuesta: "cumple_no_cumple" | "cumple_intermedio_no_cumple"
  evidenciaObligatoria: boolean
  comentarioObligatorio: boolean
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
  estado: "abierto" | "cerrado"
  auditores: string[]
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
  estado: "pendiente" | "en_curso" | "terminado"
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
  valor: "cumple" | "no_cumple" | "intermedio" | "na"
  comentario?: string
  evidencias: string[]
  fechaRespuesta: string
  auditorId: string
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
  if (score >= 90) return "bg-success/20"
  if (score >= 71) return "bg-warning/20"
  return "bg-destructive/20"
}

export function getEstadoBadgeColor(estado: string): string {
  switch (estado) {
    case "terminada":
    case "terminado":
    case "publicado":
    case "activo":
      return "bg-success/20 text-success"
    case "abierto":
      return "bg-emerald-50 text-emerald-700"
    case "cerrado":
      return "bg-stone-100 text-stone-600"
    case "en_curso":
      return "bg-primary/20 text-primary"
    case "pendiente":
    case "borrador":
      return "bg-muted text-muted-foreground"
    case "en_replica":
      return "bg-warning/20 text-warning"
    case "deprecado":
    case "inactivo":
      return "bg-destructive/20 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function formatEstado(estado: string): string {
  return estado.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}
