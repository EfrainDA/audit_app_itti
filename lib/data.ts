// Mock data for Qualittyx prototype

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'supervisor' | 'auditor' | 'auditado'
  status: 'activo' | 'inactivo'
  avatar?: string
}

export interface UnidadNegocio {
  id: string
  nombre: string
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
  color: 'rojo' | 'amarillo' | 'verde'
}

export interface Vertical {
  id: string
  nombre: string
  descripcion?: string
  peso: number
  tipoEvaluacion: 'distribuida' | 'cascada'
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
  tipoRespuesta: 'cumple_no_cumple' | 'cumple_intermedio_no_cumple'
  evidenciaObligatoria: boolean
  comentarioObligatorio: boolean
}

export interface ModeloControl {
  id: string
  nombre: string
  descripcion?: string
  estado: 'borrador' | 'publicado' | 'deprecado'
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
  estado: 'abierto' | 'cerrado'
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
  estado: 'pendiente' | 'en_curso' | 'terminado'
  scoreControl?: number
  proceso?: string
  subproceso?: string
  producto?: string
  fechaCreacion: string
  auditorId?: string
}

export interface Auditoria {
  id: string
  loteId: string
  controlId: string
  fecha: string
  estado: 'pendiente' | 'en_curso' | 'en_replica' | 'terminada'
  scoreTotal?: number
  auditorId: string
}

export interface Respuesta {
  id: string
  controlId: string
  parametroId: string
  valor: 'cumple' | 'no_cumple' | 'intermedio' | 'na'
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
  tipo: 'replica' | 'cierre' | 'ajuste' | 'asignacion'
  leida: boolean
  fecha: string
}

// Mock Users
export const mockUsers: User[] = [
  { id: '1', name: 'Efraín González', email: 'efrain@qualittyx.com', role: 'admin', status: 'activo' },
  { id: '2', name: 'Federico Figueredo', email: 'federico@qualittyx.com', role: 'supervisor', status: 'activo' },
  { id: '3', name: 'Jose Benitez', email: 'jose@qualittyx.com', role: 'auditor', status: 'activo' },
  { id: '4', name: 'Ana Fariña', email: 'ana@qualittyx.com', role: 'auditor', status: 'activo' },
  { id: '5', name: 'Vanessa Coronel', email: 'vanessa@qualittyx.com', role: 'auditado', status: 'activo' },
  { id: '6', name: 'Wilfrido Benitez', email: 'wilfrido@qualittyx.com', role: 'auditado', status: 'inactivo' },
]

export const currentUser: User = mockUsers[0]

// Mock Unidades de Negocio
export const mockUnidades: UnidadNegocio[] = [
  { id: '1', nombre: 'ueno bank', codigo: 'SC-001', zona: 'Norte', responsable: 'Pedro Sánchez', logo: '/logo1.png' },
  { id: '2', nombre: 'upay', codigo: 'SM-002', zona: 'Norte', responsable: 'Laura Fernández', logo: '/placeholder-logo.png' },
  { id: '3', nombre: 'itti', codigo: 'SG-003', zona: 'Occidente', responsable: 'Roberto Díaz', logo: '/placeholder-logo.png' },
  { id: '4', nombre: 'wepa', codigo: 'SC-004', zona: 'Centro', responsable: 'Isabel Torres', logo: '/placeholder-logo.png' },
  { id: '5', nombre: 'uenoseguros', codigo: 'SC-005', zona: 'Sureste', responsable: 'Miguel Ángel Ruiz', logo: '/placeholder-logo.png' },
]

// Mock Ciclos
export const mockCiclos: Ciclo[] = [
  { id: '1', año: 2026, bimestre: 1, fechaInicio: '2026-01-01', fechaFin: '2026-02-28' },
  { id: '2', año: 2026, bimestre: 2, fechaInicio: '2026-03-01', fechaFin: '2026-04-30' },
  { id: '3', año: 2026, bimestre: 3, fechaInicio: '2026-05-01', fechaFin: '2026-06-30' },
]

// Mock Umbrales
export const mockUmbrales: Umbral[] = [
  { id: '1', nombre: 'Crítico', min: 0, max: 70, color: 'rojo' },
  { id: '2', nombre: 'Aceptable', min: 71, max: 89, color: 'amarillo' },
  { id: '3', nombre: 'Excelente', min: 90, max: 100, color: 'verde' },
]

// Mock Modelos de Control
export const mockModelos: ModeloControl[] = [
  {
    id: '1',
    nombre: 'Ecosistema Financiero 2026',
    descripcion: 'Modelo de control para evaluación de procesos operativos',
    estado: 'publicado',
    fechaVigenciaDesde: '2026-01-01',
    fechaVigenciaHasta: '2026-12-31',
    creadoPor: 'Efraín González',
    fechaCreacion: '2025-12-15',
    verticales: [
      {
        id: 'v1',
        nombre: 'Unidad de Negocio',
        descripcion: 'Evaluación del cumplimiento de normativas internas y externas',
        peso: 30,
        tipoEvaluacion: 'cascada',
        parametros: [
          {
            id: 'p1',
            nombre: 'Documentación Legal',
            descripcion: 'Verificar que toda la documentación legal esté actualizada',
            puntosBase: 40,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q1', texto: '¿Los contratos están vigentes y firmados?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
              { id: 'q2', texto: '¿Las licencias operativas están al día?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p2',
            nombre: 'Políticas Internas',
            descripcion: 'Verificar cumplimiento de políticas de la empresa',
            puntosBase: 30,
            permiteIntermedio: false,
            preguntas: [
              { id: 'q3', texto: '¿Se cumplen las políticas de seguridad?', tipoRespuesta: 'cumple_no_cumple', evidenciaObligatoria: false, comentarioObligatorio: true },
            ]
          },
          {
            id: 'p3',
            nombre: 'Procedimientos Estándar',
            puntosBase: 30,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q4', texto: '¿Los procedimientos están documentados?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
        ]
      },
      {
        id: 'v2',
        nombre: 'Producto / Servicio',
        descripcion: 'Evaluación de la calidad del servicio al cliente',
        peso: 35,
        tipoEvaluacion: 'distribuida',
        parametros: [
          {
            id: 'p4',
            nombre: 'Tiempos de Respuesta',
            puntosBase: 50,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q5', texto: '¿Se cumplen los SLAs establecidos?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p5',
            nombre: 'Satisfacción del Cliente',
            puntosBase: 50,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q6', texto: '¿El NPS es mayor a 70?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
        ]
      },
      {
        id: 'v3',
        nombre: 'Proceso',
        descripcion: 'Medición de la eficiencia en procesos operativos',
        peso: 35,
        tipoEvaluacion: 'distribuida',
        parametros: [
          {
            id: 'p6',
            nombre: 'Productividad',
            puntosBase: 34,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q7', texto: '¿Se cumplen las metas de producción?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: false, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p7',
            nombre: 'Uso de Recursos',
            puntosBase: 34,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q8', texto: '¿Se optimizan los recursos disponibles?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: false, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p8',
            nombre: 'Reducción de Desperdicios',
            puntosBase: 32,
            permiteIntermedio: false,
            preguntas: [
              { id: 'q9', texto: '¿Se ha reducido el desperdicio en un 10%?', tipoRespuesta: 'cumple_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: true },
            ]
          },
        ]
      },
    ]
  },
  {
    id: '2',
    nombre: 'Modelo Administrativo 2026',
    descripcion: 'Modelo de control para procesos administrativos',
    estado: 'borrador',
    creadoPor: 'María García',
    fechaCreacion: '2026-04-01',
    verticales: [
      {
        id: 'v4',
        nombre: 'Gestión Financiera',
        peso: 50,
        tipoEvaluacion: 'cascada',
        parametros: [
          {
            id: 'p9',
            nombre: 'Control de Gastos',
            puntosBase: 50,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q10', texto: '¿Los gastos están dentro del presupuesto?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p10',
            nombre: 'Facturación',
            puntosBase: 50,
            permiteIntermedio: false,
            preguntas: [
              { id: 'q11', texto: '¿La facturación está al día?', tipoRespuesta: 'cumple_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
        ]
      },
      {
        id: 'v5',
        nombre: 'Recursos Humanos',
        peso: 50,
        tipoEvaluacion: 'distribuida',
        parametros: [
          {
            id: 'p11',
            nombre: 'Capacitación',
            puntosBase: 50,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q12', texto: '¿El personal ha completado las capacitaciones requeridas?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: true, comentarioObligatorio: false },
            ]
          },
          {
            id: 'p12',
            nombre: 'Evaluación de Desempeño',
            puntosBase: 50,
            permiteIntermedio: true,
            preguntas: [
              { id: 'q13', texto: '¿Se han realizado las evaluaciones de desempeño?', tipoRespuesta: 'cumple_intermedio_no_cumple', evidenciaObligatoria: false, comentarioObligatorio: false },
            ]
          },
        ]
      },
    ]
  },
  {
    id: '3',
    nombre: 'Modelo Operativo 2025',
    descripcion: 'Modelo anterior deprecado',
    estado: 'deprecado',
    fechaVigenciaDesde: '2025-01-01',
    fechaVigenciaHasta: '2025-12-31',
    creadoPor: 'Efraín González',
    fechaCreacion: '2024-12-01',
    verticales: []
  },
]

// Mock Lotes
export const mockLotes: Lote[] = [
  { id: '1', unidadNegocioId: '1', modeloControlId: '1', año: 2026, ciclo: 3, estado: 'abierto', auditores: ['3', '4'] },
  { id: '2', unidadNegocioId: '2', modeloControlId: '1', año: 2026, ciclo: 3, estado: 'abierto', auditores: ['3'] },
  { id: '3', unidadNegocioId: '3', modeloControlId: '1', año: 2026, ciclo: 2, estado: 'cerrado', auditores: ['4'] },
  { id: '4', unidadNegocioId: '4', modeloControlId: '1', año: 2026, ciclo: 3, estado: 'abierto', auditores: ['3', '4'] },
]

// Mock Lote Verticales (cada lote tiene verticales del modelo, y cada vertical tiene controles)
export const mockLoteVerticales: LoteVertical[] = [
  {
    id: 'lv1',
    loteId: '1',
    verticalId: 'v1',
    controles: [
      { id: 'c1', loteVerticalId: 'lv1', identificador: 'CTRL-001', estado: 'terminado', scoreControl: 85, proceso: 'Ventas', subproceso: 'Cotizaciones', fechaCreacion: '2026-05-01', auditorId: '3' },
      { id: 'c2', loteVerticalId: 'lv1', identificador: 'CTRL-002', estado: 'en_curso', scoreControl: 70, proceso: 'Ventas', subproceso: 'Facturación', fechaCreacion: '2026-05-02', auditorId: '3' },
      { id: 'c3', loteVerticalId: 'lv1', identificador: 'CTRL-003', estado: 'pendiente', proceso: 'Compras', fechaCreacion: '2026-05-03' },
    ]
  },
  {
    id: 'lv2',
    loteId: '1',
    verticalId: 'v2',
    controles: [
      { id: 'c4', loteVerticalId: 'lv2', identificador: 'CTRL-004', estado: 'terminado', scoreControl: 92, proceso: 'Soporte', subproceso: 'Tickets', fechaCreacion: '2026-05-01', auditorId: '4' },
      { id: 'c5', loteVerticalId: 'lv2', identificador: 'CTRL-005', estado: 'pendiente', proceso: 'Soporte', fechaCreacion: '2026-05-04' },
    ]
  },
  {
    id: 'lv3',
    loteId: '1',
    verticalId: 'v3',
    controles: [
      { id: 'c6', loteVerticalId: 'lv3', identificador: 'CTRL-006', estado: 'en_curso', scoreControl: 78, proceso: 'Operaciones', fechaCreacion: '2026-05-02', auditorId: '3' },
    ]
  },
  {
    id: 'lv4',
    loteId: '2',
    verticalId: 'v1',
    controles: []
  },
  {
    id: 'lv5',
    loteId: '2',
    verticalId: 'v2',
    controles: []
  },
]

// Mock Auditorias (ahora vinculadas a controles individuales)
export const mockAuditorias: Auditoria[] = [
  { id: '1', loteId: '1', controlId: 'c1', fecha: '2026-05-10', estado: 'terminada', scoreTotal: 85, auditorId: '3' },
  { id: '2', loteId: '1', controlId: 'c2', fecha: '2026-05-10', estado: 'en_curso', scoreTotal: 70, auditorId: '3' },
  { id: '3', loteId: '1', controlId: 'c4', fecha: '2026-05-08', estado: 'terminada', scoreTotal: 92, auditorId: '4' },
  { id: '4', loteId: '1', controlId: 'c6', fecha: '2026-05-09', estado: 'en_curso', scoreTotal: 78, auditorId: '3' },
]

// Mock Notificaciones
export const mockNotificaciones: Notificacion[] = [
  { id: '1', usuarioId: '3', titulo: 'Nueva réplica disponible', mensaje: 'El auditado ha respondido a Control Normativo 1', tipo: 'replica', leida: false, fecha: '2026-05-13T10:30:00' },
  { id: '2', usuarioId: '3', titulo: 'Auditoría asignada', mensaje: 'Se te ha asignado una nueva auditoría en Sucursal Monterrey', tipo: 'asignacion', leida: false, fecha: '2026-05-12T14:00:00' },
  { id: '3', usuarioId: '2', titulo: 'Auditoría finalizada', mensaje: 'Carlos López ha terminado la auditoría de Sede Central', tipo: 'cierre', leida: true, fecha: '2026-05-11T16:45:00' },
]

// Dashboard Statistics
export const dashboardStats = {
  totalAuditorias: 5,
  auditoriasEnCurso: 2,
  auditoriasPendientes: 1,
  auditoriasTerminadas: 2,
  scorePromedio: 100,
  controlesTotal: 24,
  controlesCompletados: 15,
  unidadesActivas: 5,
}

// Helper functions
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success'
  if (score >= 71) return 'text-warning'
  return 'text-destructive'
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-success/20'
  if (score >= 71) return 'bg-warning/20'
  return 'bg-destructive/20'
}

export function getEstadoBadgeColor(estado: string): string {
  switch (estado) {
    case 'terminada':
    case 'terminado':
    case 'publicado':
    case 'activo':
      return 'bg-success/20 text-success'
    case 'abierto':
      return 'bg-emerald-50 text-emerald-700'
    case 'cerrado':
      return 'bg-stone-100 text-stone-600'
    case 'en_curso':
      return 'bg-primary/20 text-primary'
    case 'pendiente':
    case 'borrador':
      return 'bg-muted text-muted-foreground'
    case 'en_replica':
      return 'bg-warning/20 text-warning'
    case 'deprecado':
    case 'inactivo':
      return 'bg-destructive/20 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function formatEstado(estado: string): string {
  return estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
