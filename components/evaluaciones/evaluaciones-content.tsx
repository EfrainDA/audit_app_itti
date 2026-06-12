"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Filter,
  Search,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  type Control,
  type Lote,
  type LoteVertical,
  getScoreColor,
  getEstadoBadgeColor,
  formatEstado,
  isCountableLote,
  getControlDisplayEstado,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { fetchAnswersForControl } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"
import { cn } from "@/lib/utils"

const YEAR_KEY = "a\u00f1o"

interface LoteConDatos extends Lote {
  unidadNombre: string
  unidadLogo?: string
  modeloNombre: string
  auditoresNombres: string
  loteVerticales: LoteVertical[]
  calificacionFinal: number | null
  verticalResultados: VerticalResultado[]
}

interface VerticalResultado {
  id: string
  nombre: string
  peso: number
  controlesTotal: number
  controlesConScore: number
  scorePromedio: number | null
  aporte: number | null
}

function getLoteVerticalesCompletas(lote: Lote, loteVerticalesData: LoteVertical[], modelos: ReturnType<typeof useAppData>["data"]["modelos"]): LoteVertical[] {
  const existentes = loteVerticalesData.filter((lv) => lv.loteId === lote.id)
  const modelo = modelos.find((m) => m.id === lote.modeloControlId)

  return modelo?.verticales.map((vertical, index) => {
    const existente = existentes.find((lv) => lv.verticalId === vertical.id)
    return existente ?? {
      id: `lv-${lote.id}-${vertical.id}-${index}`,
      loteId: lote.id,
      verticalId: vertical.id,
      controles: [],
    }
  }) ?? existentes
}

function matchesControlEstado(estado: string, filterEstado: string) {
  if (filterEstado === "all") return true
  if (filterEstado === "terminado") return estado === "terminado" || estado === "terminada"
  if (filterEstado === "en_curso") return estado === "en_curso" || estado === "en_replica"

  return estado === filterEstado
}

function controlMatches(control: Control, normalizedSearch: string, filterEstado: string, answeredControlIds: Set<string>) {
  const searchableFields = [
    control.identificador,
    control.descripcion,
    control.etiqueta,
    control.proceso,
    control.subproceso,
    control.producto,
    ...(control.productosVinculados ?? []),
  ]
  const matchesSearch = normalizedSearch.length === 0 ||
    searchableFields.some((value) => value?.toLowerCase().includes(normalizedSearch))

  return matchesSearch && matchesControlEstado(getControlDisplayEstado(control, answeredControlIds), filterEstado)
}

interface EvaluacionesContentProps {
  view?: "evaluaciones" | "calificaciones"
}

export function EvaluacionesContent({ view = "evaluaciones" }: EvaluacionesContentProps) {
  const { data } = useAppData()
  const { appUser } = useAuth()
  const lotes = data.lotes
  const unidades = data.unidades
  const users = data.users
  const modelos = data.modelos
  const loteVerticalesData = data.loteVerticales
  const answeredControlIds = useMemo(() => new Set(data.respuestas.map((answer) => answer.controlId)), [data.respuestas])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [loteEstadoFilter, setLoteEstadoFilter] = useState<string>("abierto")
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportLoteId, setExportLoteId] = useState("")
  const [exportFormat, setExportFormat] = useState<"excel" | "presentation">("excel")
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [calificacionesCycleFilter, setCalificacionesCycleFilter] = useState("current")

  const lotesConDatos = useMemo<LoteConDatos[]>(() => {
    return lotes.filter(isCountableLote).map((lote) => {
      const unidad = unidades.find((u) => u.id === lote.unidadNegocioId)
      const modelo = modelos.find((m) => m.id === lote.modeloControlId)
      const auditores = lote.auditores.map((id) => users.find((u) => u.id === id)).filter(Boolean)
      const loteVerticales = getLoteVerticalesCompletas(lote, loteVerticalesData, modelos).map((loteVertical) => ({
        ...loteVertical,
        controles: loteVertical.controles,
      }))
      const verticalResultados = loteVerticales.map((loteVertical) => {
        const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
        const controlesConScore = loteVertical.controles.filter((control) => control.scoreControl !== undefined)
        const scorePromedio = controlesConScore.length
          ? controlesConScore.reduce((acc, control) => acc + (control.scoreControl ?? 0), 0) / controlesConScore.length
          : null

        return {
          id: loteVertical.id,
          nombre: vertical?.nombre || "Vertical sin configurar",
          peso: vertical?.peso || 0,
          controlesTotal: loteVertical.controles.length,
          controlesConScore: controlesConScore.length,
          scorePromedio,
          aporte: scorePromedio !== null && vertical ? Number(((scorePromedio * vertical.peso) / 100).toFixed(1)) : null,
        }
      })
      const aportes = verticalResultados
        .map((vertical) => vertical.aporte)
        .filter((aporte): aporte is number => aporte !== null)

      return {
        ...lote,
        unidadNombre: unidad?.nombre || "N/A",
        unidadLogo: unidad?.logo,
        modeloNombre: modelo?.nombre || "N/A",
        auditoresNombres: auditores.map((auditor) => auditor?.name).join(", "),
        loteVerticales,
        calificacionFinal: aportes.length ? Number(aportes.reduce((acc, aporte) => acc + aporte, 0).toFixed(1)) : null,
        verticalResultados,
      }
    })
  }, [loteVerticalesData, lotes, modelos, unidades, users])

  const calificacionesCycleOptions = useMemo(() => {
    const options = new Map<string, { key: string; year: number; cycle: number }>()

    lotesConDatos.forEach((lote) => {
      const key = `${lote[YEAR_KEY]}-${lote.ciclo}`
      if (!options.has(key)) {
        options.set(key, { key, year: Number(lote[YEAR_KEY]), cycle: lote.ciclo })
      }
    })

    return Array.from(options.values()).sort((first, second) => {
        if (first[YEAR_KEY] !== second[YEAR_KEY]) return Number(second[YEAR_KEY]) - Number(first[YEAR_KEY])
      return second.cycle - first.cycle
    })
  }, [lotesConDatos])

  const defaultCalificacionesCycleKey = useMemo(() => {
    const today = new Date()
    const activeCycle = data.ciclos.find((cycle) => {
      const start = new Date(`${cycle.fechaInicio}T00:00:00`)
      const end = new Date(`${cycle.fechaFin}T23:59:59`)

      return today >= start && today <= end
    })
    const activeKey = activeCycle ? `${activeCycle[YEAR_KEY]}-${activeCycle.bimestre}` : null

    if (activeKey && calificacionesCycleOptions.some((option) => option.key === activeKey)) {
      return activeKey
    }

    return calificacionesCycleOptions[0]?.key ?? "all"
  }, [calificacionesCycleOptions, data.ciclos])

  const selectedCalificacionesCycleKey =
    calificacionesCycleFilter === "current" ? defaultCalificacionesCycleKey : calificacionesCycleFilter
  const lotesCalificacionesFiltrados = useMemo(() => {
    return lotesConDatos
      .filter((lote) => {
        if (selectedCalificacionesCycleKey === "all") return true

        return `${lote[YEAR_KEY]}-${lote.ciclo}` === selectedCalificacionesCycleKey
      })
      .sort((first, second) => {
        if (first[YEAR_KEY] !== second[YEAR_KEY]) return Number(second[YEAR_KEY]) - Number(first[YEAR_KEY])
        return second.ciclo - first.ciclo
      })
  }, [lotesConDatos, selectedCalificacionesCycleKey])

  const controles = lotesConDatos.flatMap((lote) => lote.loteVerticales.flatMap((lv) => lv.controles))
  const controlesLotesAbiertos = lotesConDatos
    .filter((lote) => lote.estado === "abierto")
    .flatMap((lote) => lote.loteVerticales.flatMap((lv) => lv.controles))

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const hasActiveControlFilters = normalizedSearchTerm.length > 0 || filterEstado !== "all"
  const lotesFiltrados = lotesConDatos
    .filter((lote) => loteEstadoFilter === "all" || lote.estado === loteEstadoFilter)
    .map((lote) => {
      const loteCoincide =
        normalizedSearchTerm.length === 0 ||
        lote.unidadNombre.toLowerCase().includes(normalizedSearchTerm) ||
        lote.modeloNombre.toLowerCase().includes(normalizedSearchTerm) ||
        `ciclo ${lote.ciclo}`.includes(normalizedSearchTerm)
      const loteVerticalesFiltradas = lote.loteVerticales
        .map((lv) => ({
          ...lv,
          controles: loteCoincide
            ? lv.controles.filter((control) => matchesControlEstado(getControlDisplayEstado(control, answeredControlIds), filterEstado))
            : lv.controles.filter((control) => controlMatches(control, normalizedSearchTerm, filterEstado, answeredControlIds)),
        }))
        .filter((lv) => !hasActiveControlFilters || lv.controles.length > 0)

      return {
        ...lote,
        loteVerticales: loteVerticalesFiltradas,
        loteCoincide,
      }
    })
    .filter((lote) => (!hasActiveControlFilters && lote.loteCoincide) || lote.loteVerticales.some((lv) => lv.controles.length > 0))

  const stats = {
    total: controles.length,
    pendientes: controlesLotesAbiertos.filter((c) => getControlDisplayEstado(c, answeredControlIds) === "pendiente").length,
    enCurso: controlesLotesAbiertos.filter((c) => getControlDisplayEstado(c, answeredControlIds) === "en_curso").length,
    terminados: controlesLotesAbiertos.filter((c) => c.estado === "terminado").length,
  }

  const exportSelectedLote = async () => {
    const lote = lotesConDatos.find((item) => item.id === exportLoteId)
    if (!lote) return

    setExportError(null)
    setIsExporting(true)

    try {
      const modelo = modelos.find((item) => item.id === lote.modeloControlId)
      const controls = lote.loteVerticales.flatMap((loteVertical) => loteVertical.controles)
      const answersByControl = exportFormat === "excel"
        ? new Map(
            await Promise.all(
              controls.map(async (control) => [
                control.id,
                await fetchAnswersForControl(control.id),
              ] as const),
            ),
          )
        : new Map<string, Awaited<ReturnType<typeof fetchAnswersForControl>>>()
      const today = new Date().toLocaleDateString("es-PY")
      const safeName = lote.unidadNombre
        .replace(/[^\w-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "lote"

      const respuestasRows = [
        [
          { value: "Vertical", styleId: "GreenHeaderCenter" },
          { value: "Control", styleId: "GreenHeaderCenter" },
          { value: "Parametro", styleId: "GreenHeaderCenter" },
          { value: "Puntos base", styleId: "GreenHeaderCenter" },
          { value: "Respuesta", styleId: "GreenHeaderCenter" },
          { value: "Personas auditadas", styleId: "GreenHeaderCenter" },
          { value: "Cargo", styleId: "GreenHeaderCenter" },
          { value: "Area", styleId: "GreenHeaderCenter" },
          { value: "Comentario / hallazgo", styleId: "GreenHeaderCenter" },
        ],
        ...lote.loteVerticales.flatMap((loteVertical) => {
          const vertical = modelo?.verticales.find((item) => item.id === loteVertical.verticalId)
          return loteVertical.controles.flatMap((control) => {
            const answers = answersByControl.get(control.id) ?? []
            return (vertical?.parametros ?? []).map((parametro) => {
              const answer = answers.find((item) => item.parametroId === parametro.id)
              return [
                { value: vertical?.nombre ?? "Vertical sin configurar", styleId: "Bordered" },
                { value: control.identificador, styleId: "Bordered" },
                { value: parametro.nombre, styleId: "Bordered" },
                { value: parametro.puntosBase, styleId: "Bordered" },
                { value: answer?.valor ? formatEstado(answer.valor) : "Sin responder", styleId: "Bordered" },
                { value: answer?.personasAuditadas.filter(Boolean).join("\n") ?? "", styleId: "Bordered" },
                { value: answer?.cargos.filter(Boolean).join("\n") ?? "", styleId: "Bordered" },
                { value: answer?.areas.filter(Boolean).join("\n") ?? "", styleId: "Bordered" },
                { value: answer?.comentario ?? "", styleId: "Bordered" },
              ]
            })
          })
        }),
      ]
      const answerLabel = (value?: string) => value ? formatEstado(value) : "Sin responder"
      const getAuditorName = (control: Control) =>
        control.auditorId ? users.find((user) => user.id === control.auditorId)?.name ?? "Sin asignar" : "Sin asignar"
      const getVerticalForControl = (control: Control) => {
        const loteVertical = lote.loteVerticales.find((item) => item.id === control.loteVerticalId)
        return modelo?.verticales.find((vertical) => vertical.id === loteVertical?.verticalId)
      }
      const getAnswerComment = (control: Control) => {
        const vertical = getVerticalForControl(control)
        const answers = answersByControl.get(control.id) ?? []
        return (vertical?.parametros ?? [])
          .map((parametro, index) => {
            const answer = answers.find((item) => item.parametroId === parametro.id)
            return answer?.comentario?.trim() ? `- Parametro ${index + 1}: ${answer.comentario.trim()}` : ""
          })
          .filter(Boolean)
          .join("\n")
      }
      const getAnswerPeople = (control: Control) => {
        const answers = answersByControl.get(control.id) ?? []
        return Array.from(new Set(answers.flatMap((answer) => answer.personasAuditadas).filter(Boolean))).join("\n")
      }
      const getAnswerRoles = (control: Control) => {
        const answers = answersByControl.get(control.id) ?? []
        return Array.from(new Set(answers.flatMap((answer) => answer.cargos).filter(Boolean))).join("\n")
      }
      const getAnswerAreas = (control: Control) => {
        const answers = answersByControl.get(control.id) ?? []
        return Array.from(new Set(answers.flatMap((answer) => answer.areas).filter(Boolean))).join("\n")
      }
      const buildEvaluationSheet = (
        sheetName: string,
        sheetControls: Control[],
        baseHeaders: string[],
        getBaseValues: (control: Control) => string[],
      ) => {
        const maxParams = Math.max(1, ...sheetControls.map((control) => getVerticalForControl(control)?.parametros.length ?? 0))
        const parameterHeader = Array.from({ length: maxParams }, (_, index) => ({ value: `Parametro ${index + 1}`, styleId: "BlueHeaderCenter" }))
        const parameterNames = Array.from({ length: maxParams }, (_, index) => {
          const parametro = sheetControls
            .map((control) => getVerticalForControl(control)?.parametros[index])
            .find(Boolean)
          return { value: parametro?.nombre ?? "", styleId: "BlueHeaderCenter" }
        })
        const weightingHeader = [
          { value: "", styleId: "GrayHeader" },
          { value: "PONDERACION DE LOS PARAMETROS DE CALIDAD", styleId: "GreenHeaderCenter", mergeAcross: maxParams - 1 },
        ]
        const weightingNames = [
          { value: "", styleId: "GrayHeader" },
          ...parameterNames.map((cell) => ({ ...cell, styleId: "GreenHeaderCenter" })),
        ]
        const rows = [
          [
            ...baseHeaders.map((header) => ({ value: header, styleId: "DarkHeaderCenter" })),
            ...parameterHeader,
            { value: "ANALISTA DE CALIDAD", styleId: "DarkHeaderCenter" },
            { value: "FECHA DE CONTROL", styleId: "DarkHeaderCenter" },
            { value: "COMENTARIOS", styleId: "DarkHeaderCenter" },
            ...weightingHeader,
          ],
          [
            ...baseHeaders.map(() => ({ value: "", styleId: "DarkHeaderCenter" })),
            ...parameterNames,
            { value: "", styleId: "DarkHeaderCenter" },
            { value: "", styleId: "DarkHeaderCenter" },
            { value: "", styleId: "DarkHeaderCenter" },
            ...weightingNames,
          ],
          ...(sheetControls.length ? sheetControls.map((control) => {
            const vertical = getVerticalForControl(control)
            const answers = answersByControl.get(control.id) ?? []
            const parameterValues = Array.from({ length: maxParams }, (_, index) => {
              const parametro = vertical?.parametros[index]
              const answer = parametro ? answers.find((item) => item.parametroId === parametro.id) : undefined
              return { value: answerLabel(answer?.valor), styleId: "Bordered" }
            })
            const weightingValues = Array.from({ length: maxParams }, (_, index) => {
              const parametro = vertical?.parametros[index]
              const answer = parametro ? answers.find((item) => item.parametroId === parametro.id) : undefined
              const value = !parametro || answer?.valor === "na"
                ? "No aplica"
                : answer?.valor === "cumple"
                  ? parametro.puntosBase
                  : answer?.valor === "intermedio"
                    ? parametro.puntosBase / 2
                    : 0
              return { value, styleId: "Bordered" }
            })

            return [
              ...getBaseValues(control).map((value) => ({ value, styleId: "Bordered" })),
              ...parameterValues,
              { value: getAuditorName(control), styleId: "Bordered" },
              { value: today, styleId: "Bordered" },
              { value: getAnswerComment(control), styleId: "Comment" },
              { value: "", styleId: "GrayHeader" },
              ...weightingValues,
            ]
          }) : [[
            { value: "Sin controles para esta hoja", styleId: "Bordered", mergeAcross: baseHeaders.length + (maxParams * 2) + 3 },
          ]]),
        ]

        return {
          name: sheetName,
          rows,
          columns: [
            ...baseHeaders.map(() => 150),
            ...Array.from({ length: maxParams }, () => 210),
            150,
            130,
            520,
            36,
            ...Array.from({ length: maxParams }, () => 130),
          ],
        }
      }
      const unidadControls = controls.filter((control) => control.etiqueta === "Unidad de Negocio")
      const productoControls = controls.filter((control) => control.etiqueta === "Producto" || Boolean(control.producto || control.productosVinculados?.length))
      const procesoControls = controls.filter((control) => control.etiqueta === "Proceso" || control.etiqueta === "Proceso de apoyo" || Boolean(control.proceso))
      const adherenciaControls = procesoControls.filter((control) => {
        const vertical = getVerticalForControl(control)
        return vertical?.parametros.some((parametro) => parametro.nombre.toLowerCase().includes("adherencia"))
      })
      const evidenceRows = [
        [{ value: "EVIDENCIAS / HALLAZGOS", styleId: "DarkHeader", mergeAcross: 0 }],
        ...(controls.flatMap((control) => {
          const vertical = getVerticalForControl(control)
          const answers = answersByControl.get(control.id) ?? []
          return (vertical?.parametros ?? []).flatMap((parametro) => {
            const answer = answers.find((item) => item.parametroId === parametro.id)
            if (!answer?.comentario?.trim() || answer.valor === "cumple") return []
            return [
              [{ value: `Vertical ${vertical?.nombre ?? ""} - Control ${control.identificador} - Parametro "${parametro.nombre}"`, styleId: "DarkHeader" }],
              [{ value: `Descripcion: ${answer.comentario.trim()}`, styleId: "Comment" }],
              [{ value: `Requisito Incumplido: ${answerLabel(answer.valor)}`, styleId: "Comment" }],
              [{ value: `Evidencia: ${answer.evidencias?.length ? answer.evidencias.join("\n") : "Sin adjuntos registrados"}`, styleId: "Comment" }],
              [{ value: "", styleId: "Bordered" }],
            ]
          })
        }))
      ]
      const detailRows = [
        [{ value: `${lote.unidadNombre} - Ciclo ${lote.ciclo} - ${lote[YEAR_KEY]}`, styleId: "TitleCenter", mergeAcross: 5 }],
        ["", "", "", "", "", ""],
        [{ value: "DETALLES DEL LOTE", styleId: "DarkHeader", mergeAcross: 5 }],
        [{ value: "Unidad evaluada", styleId: "DetailLabel" }, { value: lote.unidadNombre, styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Modelo de control", styleId: "DetailLabel" }, { value: lote.modeloNombre, styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Ciclo", styleId: "DetailLabel" }, { value: `Ciclo ${lote.ciclo} - ${lote[YEAR_KEY]}`, styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Estado", styleId: "DetailLabel" }, { value: formatEstado(lote.estado), styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Auditores", styleId: "DetailLabel" }, { value: lote.auditoresNombres || "Sin auditores asignados", styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Fecha de exportacion", styleId: "DetailLabel" }, { value: today, styleId: "DetailValue", mergeAcross: 4 }],
        [{ value: "Calificacion final", styleId: "DetailLabel" }, { value: lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-", styleId: "DetailValue", mergeAcross: 4 }],
        ["", "", "", "", "", ""],
        [{ value: "RESUMEN POR VERTICAL", styleId: "DarkHeader", mergeAcross: 5 }],
        [
          { value: "Vertical", styleId: "BlueHeaderCenter" },
          { value: "Peso", styleId: "BlueHeaderCenter" },
          { value: "Controles", styleId: "BlueHeaderCenter" },
          { value: "Evaluados", styleId: "BlueHeaderCenter" },
          { value: "Promedio logrado", styleId: "BlueHeaderCenter" },
          { value: "Aporte final", styleId: "BlueHeaderCenter" },
        ],
        ...lote.verticalResultados.map((vertical) => [
          { value: vertical.nombre, styleId: "Bordered" },
          { value: `${vertical.peso}%`, styleId: "Bordered" },
          { value: vertical.controlesTotal, styleId: "Bordered" },
          { value: vertical.controlesConScore, styleId: "Bordered" },
          { value: vertical.scorePromedio !== null ? `${vertical.scorePromedio.toFixed(1)}%` : "-", styleId: "Bordered" },
          { value: vertical.aporte !== null ? `${vertical.aporte}%` : "-", styleId: "Bordered" },
        ]),
      ]
      const excelSheets = [
        { name: "Detalle Lote", rows: detailRows, columns: [180, 220, 160, 160, 160, 160] },
        buildEvaluationSheet("Unidad de Negocio", unidadControls.length ? unidadControls : controls.slice(0, 1), ["UN EVALUADA", "UNIDAD DE NEGOCIO DEL QUE RECIBE ALGUN SERVICIO"], () => [lote.unidadNombre, lote.unidadNombre]),
        buildEvaluationSheet("Producto", productoControls, ["UN EVALUADA", "PRODUCTO / SERVICIO"], (control) => [lote.unidadNombre, [control.producto, ...(control.productosVinculados ?? [])].filter(Boolean).join("\n")]),
        buildEvaluationSheet("Proceso", procesoControls, ["UN EVALUADA", "PRODUCTO VINCULADO", "PROCESO", "TIPO"], (control) => [lote.unidadNombre, [control.producto, ...(control.productosVinculados ?? [])].filter(Boolean).join("\n"), control.proceso ?? control.identificador, control.etiqueta ?? "Proceso"]),
        {
          name: "Adherencia",
          rows: [
            [
              { value: "UN EVALUADA", styleId: "DarkHeaderCenter" },
              { value: "PROCESO VINCULADO", styleId: "DarkHeaderCenter" },
              { value: "SUBPROCESO / PROCEDIMIENTO", styleId: "DarkHeaderCenter" },
              { value: "CODIGO DEL PROCEDIMIENTO", styleId: "DarkHeaderCenter" },
              { value: "AREA", styleId: "DarkHeaderCenter" },
              { value: "ADHERENCIA AL PROCESO", styleId: "DarkHeaderCenter" },
              { value: "PERSONAS AUDITADAS - CargoS", styleId: "DarkHeaderCenter" },
              { value: "ANALISTA DE CALIDAD", styleId: "DarkHeaderCenter" },
              { value: "FECHA DE CONTROL", styleId: "DarkHeaderCenter" },
              { value: "COMENTARIOS", styleId: "DarkHeaderCenter" },
            ],
            ...(adherenciaControls.length ? adherenciaControls : procesoControls).map((control) => [
              { value: lote.unidadNombre, styleId: "Bordered" },
              { value: control.proceso ?? control.identificador, styleId: "Bordered" },
              { value: control.subprocesos?.join("\n") || control.subproceso || "", styleId: "Bordered" },
              { value: "", styleId: "Bordered" },
              { value: getAnswerAreas(control), styleId: "Bordered" },
              { value: formatEstado(getControlDisplayEstado(control, answersByControl.has(control.id) ? [control.id] : answeredControlIds)), styleId: "Bordered" },
              { value: [getAnswerPeople(control), getAnswerRoles(control)].filter(Boolean).join("\n"), styleId: "Bordered" },
              { value: getAuditorName(control), styleId: "Bordered" },
              { value: today, styleId: "Bordered" },
              { value: getAnswerComment(control), styleId: "Comment" },
            ]),
          ],
          columns: [150, 260, 320, 180, 220, 170, 330, 170, 130, 520],
        },
        { name: "Evidencia", rows: evidenceRows.length > 1 ? evidenceRows : [[{ value: "Sin evidencias registradas", styleId: "Bordered" }]], columns: [980] },
      ]

      if (exportFormat === "presentation") {
        const completedControls = controls.filter((control) => control.estado === "terminado").length
        const controlsWithScore = controls.filter((control) => control.scoreControl !== undefined)
        const averageScore = controlsWithScore.length
          ? Math.round(controlsWithScore.reduce((total, control) => total + (control.scoreControl ?? 0), 0) / controlsWithScore.length)
          : null
        const criticalControls = [...controlsWithScore]
          .sort((first, second) => (first.scoreControl ?? 0) - (second.scoreControl ?? 0))
          .slice(0, 5)

        downloadPptx(`${safeName}-presentation-ciclo-${lote.ciclo}-${lote[YEAR_KEY]}.pptx`, [
          {
            eyebrow: "Informe de evaluacion",
            title: `${lote.unidadNombre}\nCiclo ${lote.ciclo} - ${lote[YEAR_KEY]}`,
            subtitle: `${lote.modeloNombre} | ${lote.auditoresNombres || "Sin auditores asignados"}`,
            metrics: [
              { label: "Calificacion final", value: lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-" },
              { label: "Controles evaluados", value: `${completedControls}/${controls.length}` },
              { label: "Promedio controles", value: averageScore !== null ? `${averageScore}%` : "-" },
              { label: "Verticales", value: lote.verticalResultados.length },
            ],
            bullets: [
              `Estado del lote: ${formatEstado(lote.estado)}`,
              `Fecha de exportacion: ${today}`,
              `Modelo aplicado: ${lote.modeloNombre}`,
            ],
            footer: "Formato de informe ejecutivo de control de calidad",
          },
          {
            eyebrow: "Resumen de Controles",
            title: "Resultado por vertical",
            subtitle: "Aporte ponderado de cada vertical al resultado final.",
            table: {
              headers: ["Vertical", "Peso", "Promedio", "Aporte"],
              rows: lote.verticalResultados.map((vertical) => [
                vertical.nombre,
                `${vertical.peso}%`,
                vertical.scorePromedio !== null ? `${vertical.scorePromedio.toFixed(1)}%` : "-",
                vertical.aporte !== null ? `${vertical.aporte}%` : "-",
              ]),
            },
            footer: `${lote.unidadNombre} | Ciclo ${lote.ciclo} - ${lote[YEAR_KEY]}`,
          },
          {
            eyebrow: "Resumen de la Unidad de Negocio",
            title: "Controles con menor desempeno",
            subtitle: "Priorizacion de hallazgos y seguimientos segun score disponible.",
            bullets: criticalControls.length
              ? criticalControls.map((control) => `${control.identificador}: ${control.scoreControl}% - ${control.proceso ?? "Sin proceso"}`)
              : ["No hay controles con score disponible para priorizar."],
            table: {
              headers: ["Estado", "Cantidad"],
              rows: [
                ["Pendientes", controls.filter((control) => control.estado === "pendiente").length],
                ["En curso", controls.filter((control) => control.estado === "en_curso").length],
                ["Terminados", completedControls],
              ],
            },
            footer: `${lote.unidadNombre} | Ciclo ${lote.ciclo} - ${lote[YEAR_KEY]}`,
          },
        ])
      } else {
        downloadXlsx(`${safeName}-informe-ciclo-${lote.ciclo}-${lote[YEAR_KEY]}.xlsx`, [
          ...excelSheets,
          { name: "Respuestas", rows: respuestasRows, columns: [220, 150, 320, 100, 140, 220, 180, 420] },
        ])
      }
      setIsExportOpen(false)
    } catch (error) {
      setExportError(getErrorMessage(error, "No se pudo exportar el lote seleccionado."))
    } finally {
      setIsExporting(false)
    }
  }

  const auditedControls = lotesConDatos.flatMap((lote) =>
    lote.loteVerticales.flatMap((loteVertical) =>
      loteVertical.controles.map((control) => ({
        control,
        lote,
        vertical: modelos
          .find((modelo) => modelo.id === lote.modeloControlId)
          ?.verticales.find((vertical) => vertical.id === loteVertical.verticalId),
      })).filter((item) => item.control.estado === "en_replica" || item.control.estado === "terminado"),
    ),
  )

  if (view === "evaluaciones" && appUser?.role === "auditado") {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {auditedControls.map(({ control, lote, vertical }) => (
            <Card key={control.id} className="border-border/70 bg-card py-0 shadow-none">
              <CardContent className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{control.identificador}</p>
                    <Badge className={cn("h-5 px-2 text-[10px]", getEstadoBadgeColor(control.estado))}>{formatEstado(control.estado)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {lote.unidadNombre} | {vertical?.nombre ?? "Vertical sin configurar"} | Ciclo {lote.ciclo} - {lote[YEAR_KEY]}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className={cn("text-xl font-semibold leading-none", control.scoreControl !== undefined ? getScoreColor(control.scoreControl) : "text-muted-foreground")}>
                    {control.scoreControl !== undefined ? control.scoreControl : "-"}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Puntaje</p>
                </div>
                <Button size="sm" className="h-8 px-3 text-xs" asChild>
                  <Link href={`/evaluaciones/${control.id}`}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Verificar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {auditedControls.length === 0 && (
          <Card className="border-border/70 bg-card">
            <CardContent className="p-12 text-center">
              <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No hay controles recibidos</p>
              <p className="mt-1 text-sm text-muted-foreground">Cuando un control se envie a replica, aparecera en esta bandeja.</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {view === "evaluaciones" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="h-20 gap-0 border-border/70 bg-card py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={ClipboardCheck} tone="primary" size="md" />
              <div>
                <p className="text-2xl font-semibold leading-none tracking-tight">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Controles</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-20 gap-0 border-border/70 bg-card py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={AlertCircle} tone="neutral" size="md" />
              <div>
                <p className="text-2xl font-semibold leading-none tracking-tight">{stats.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-20 gap-0 border-border/70 bg-card py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={Clock} tone="primary" size="md" />
              <div>
                <p className="text-2xl font-semibold leading-none tracking-tight">{stats.enCurso}</p>
                <p className="text-xs text-muted-foreground">En Curso</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-20 gap-0 border-border/70 bg-card py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={CheckCircle2} tone="success" size="md" />
              <div>
                <p className="text-2xl font-semibold leading-none tracking-tight">{stats.terminados}</p>
                <p className="text-xs text-muted-foreground">Terminados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "evaluaciones" && (
        <>
      <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-fit lg:grid-cols-[280px_150px_220px]">
          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por lote, unidad, control o proceso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-border/70 bg-card/70 pl-9"
            />
          </div>
          <Select value={loteEstadoFilter} onValueChange={setLoteEstadoFilter}>
            <SelectTrigger className="w-full border-border/70 bg-card/70 lg:w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abierto">Abiertos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cerrado">Cerrados</SelectItem>
              <SelectItem value="deprecado">Dados de baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full border-border/70 bg-card/70 lg:w-[220px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Control" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los controles</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="terminado">Terminados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={isExportOpen}
          onOpenChange={(open) => {
            setIsExportOpen(open)
            if (!open) setExportError(null)
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full lg:ml-auto lg:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DialogTrigger>
          <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[26rem] gap-4 p-5 sm:!w-[26rem] sm:!max-w-[26rem] lg:!max-w-[26rem] lg:p-5">
            <DialogHeader>
              <DialogTitle>Exportar informe</DialogTitle>
              <DialogDescription>Selecciona el lote que quieres exportar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <Select value={exportLoteId} onValueChange={setExportLoteId}>
                <SelectTrigger className="w-full border-border/70 bg-card/70">
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotesConDatos.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as typeof exportFormat)}>
                <SelectTrigger className="w-full border-border/70 bg-card/70">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="presentation">Presentacion</SelectItem>
                </SelectContent>
              </Select>
              {exportError && <p className="text-sm text-destructive">{exportError}</p>}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setIsExportOpen(false)} disabled={isExporting}>
                  Cancelar
                </Button>
                <Button onClick={exportSelectedLote} disabled={!exportLoteId || isExporting}>
                  {isExporting ? "Exportando..." : "Exportar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
        </>
      )}

      {view === "calificaciones" && (
      <Card className="border-border/70 bg-card py-0">
        <CardHeader className="items-start gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-start">
          <CardTitle className="text-base">Calificacion por Unidad de Negocio</CardTitle>
          <Select value={calificacionesCycleFilter} onValueChange={setCalificacionesCycleFilter}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-[220px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filtrar ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ciclo vigente</SelectItem>
              <SelectItem value="all">Todos los ciclos</SelectItem>
              {calificacionesCycleOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  Ciclo {option.cycle} - {option.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            La calificacion final se calcula con el aporte de cada vertical segun su peso dentro del modelo de control.
          </p>
          <Accordion type="multiple" className="space-y-3">
            {lotesCalificacionesFiltrados.map((lote) => (
              <AccordionItem key={lote.id} value={`calificacion-${lote.id}`} className="overflow-hidden rounded-lg border border-border/70 bg-card">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/25 hover:no-underline">
                  <div className="grid min-w-0 w-full grid-cols-1 gap-3 pr-2 text-left lg:grid-cols-[minmax(0,1.35fr)_10rem_minmax(0,1fr)_8rem] lg:items-center lg:pr-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background">
                        {lote.unidadLogo ? (
                          <Image src={lote.unidadLogo} alt={lote.unidadNombre} width={48} height={28} className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{lote.unidadNombre}</p>
                        <p className="truncate text-xs text-muted-foreground">{lote.modeloNombre}</p>
                      </div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ciclo</p>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                    </div>
                    <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Auditores</p>
                      <p className="mt-1 truncate text-sm font-medium">{lote.auditoresNombres || "Sin auditores"}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-left lg:text-right">
                      <p className={`text-xl font-semibold leading-none ${lote.calificacionFinal !== null ? getScoreColor(lote.calificacionFinal) : "text-muted-foreground"}`}>
                        {lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Final</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 border-b border-border/60 bg-muted/25 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vertical</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Peso</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Controles</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Aporte</p>
                    </div>
                    <div className="divide-y divide-border/60">
                      {lote.verticalResultados.map((vertical) => (
                        <div key={vertical.id} className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 px-3 py-3">
                          <p className="truncate text-sm font-semibold">{vertical.nombre}</p>
                          <p className="text-sm font-semibold">{vertical.peso}%</p>
                          <p className="text-sm font-semibold">{vertical.controlesConScore}/{vertical.controlesTotal}</p>
                          <p className={`text-sm font-semibold ${vertical.aporte !== null ? getScoreColor(vertical.aporte) : "text-muted-foreground"}`}>
                            {vertical.aporte !== null ? `${vertical.aporte}%` : "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {lotesCalificacionesFiltrados.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No hay calificaciones para este ciclo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cambia el filtro para consultar ciclos anteriores o todos los ciclos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {view === "evaluaciones" && (
        <>
      <div className="space-y-3">
        {lotesFiltrados.map((lote) => {
          const totalControles = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
          const terminados = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)

          return (
            <Link key={lote.id} href={`/evaluaciones/${lote.id}`} className="block">
              <Card className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card shadow-none transition-colors hover:border-primary/50">
                <CardContent className="px-3 py-3 sm:px-4">
                <div className="grid min-w-0 w-full grid-cols-1 gap-3 text-left md:grid-cols-[1.35fr_0.8fr_1fr_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded">
                      {lote.unidadLogo ? (
                        <Image
                          src={lote.unidadLogo}
                          alt={lote.unidadNombre}
                          width={48}
                          height={28}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded border border-primary/20 bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lote.unidadNombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lote.modeloNombre}
                      </p>
                    </div>
                  </div>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                  <p className="truncate text-sm text-muted-foreground">{lote.auditoresNombres || "Sin auditores"}</p>
                  <div className="flex items-center gap-3 md:justify-end">
                    <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                    <div className="min-w-[72px] text-right">
                      <p className="text-sm font-semibold">{terminados}/{totalControles}</p>
                      <p className="text-xs text-muted-foreground">Controles</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {lotesFiltrados.length === 0 && (
        <Card className="border-border/70 bg-card">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-medium">No se encontraron lotes o controles</h3>
            <p className="text-sm text-muted-foreground">
              Ajusta los filtros de busqueda o ve a Planificacion para agregar controles a las verticales.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/planificacion">Ir a Planificacion</Link>
            </Button>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  )
}
