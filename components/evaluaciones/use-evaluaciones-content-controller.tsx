"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */

// Listado que combina lotes, verticales, controles y respuestas para filtrar resultados.
import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContentSkeleton, ErrorState } from "@/components/ui/async-state"
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
import { fetchAnswersForControl } from "@/lib/repositories/supabase/evaluations"
import { getErrorMessage } from "@/lib/error-message"
import { downloadPptx, downloadXlsx } from "@/lib/export"
import {
  controlMatchesFilters,
  getCompleteLotVerticals,
  matchesControlStatus,
} from "@/features/evaluations/domain/evaluation-list"

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

interface EvaluacionesContentProps {
  view?: "evaluaciones" | "calificaciones"
}

// Renderiza el modo operativo o de calificaciones según la vista solicitada.
export function useEvaluacionesContentController({ view = "evaluaciones" }: EvaluacionesContentProps) {
  const { data, isLoading, error: dataError, refresh } = useAppData({ domains: ["users", "settings", "models", "planning", "evaluations"] })
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
      const loteVerticales = getCompleteLotVerticals(lote, loteVerticalesData, modelos).map((loteVertical) => ({
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
      if (first.year !== second.year) return second.year - first.year
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
            ? lv.controles.filter((control) => matchesControlStatus(getControlDisplayEstado(control, answeredControlIds), filterEstado))
            : lv.controles.filter((control) => controlMatchesFilters(control, normalizedSearchTerm, filterEstado, answeredControlIds)),
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
          { value: "Parámetro", styleId: "GreenHeaderCenter" },
          { value: "Puntos base", styleId: "GreenHeaderCenter" },
          { value: "Respuesta", styleId: "GreenHeaderCenter" },
          { value: "Personas auditadas", styleId: "GreenHeaderCenter" },
          { value: "Cargo", styleId: "GreenHeaderCenter" },
          { value: "Área", styleId: "GreenHeaderCenter" },
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
      const answerLabel = (value?: string | null) => value ? formatEstado(value) : "Sin responder"
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
            return answer?.comentario?.trim() ? `- Parámetro ${index + 1}: ${answer.comentario.trim()}` : ""
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
        const parameterHeader = Array.from({ length: maxParams }, (_, index) => ({ value: `Parámetro ${index + 1}`, styleId: "BlueHeaderCenter" }))
        const parameterNames = Array.from({ length: maxParams }, (_, index) => {
          const parametro = sheetControls
            .map((control) => getVerticalForControl(control)?.parametros[index])
            .find(Boolean)
          return { value: parametro?.nombre ?? "", styleId: "BlueHeaderCenter" }
        })
        const weightingHeader = [
          { value: "", styleId: "GrayHeader" },
          { value: "PONDERACIÓN DE LOS PARÁMETROS DE CALIDAD", styleId: "GreenHeaderCenter", mergeAcross: maxParams - 1 },
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
              [{ value: `Vertical ${vertical?.nombre ?? ""} - Control ${control.identificador} - Parámetro "${parametro.nombre}"`, styleId: "DarkHeader" }],
              [{ value: `Descripción: ${answer.comentario.trim()}`, styleId: "Comment" }],
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
              { value: "CÓDIGO DEL PROCEDIMIENTO", styleId: "DarkHeaderCenter" },
              { value: "ÁREA", styleId: "DarkHeaderCenter" },
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
            eyebrow: "Informe de evaluación",
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
            subtitle: "Priorización de hallazgos y seguimientos según la puntuación disponible.",
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

  if (isLoading) {
    return <ContentSkeleton variant="list" label="Cargando evaluaciones" />
  }

  if (dataError) {
    return <ErrorState description={dataError} onRetry={() => void refresh()} />
  }

    return { view, data, isLoading, dataError, lotes, unidades, users, modelos, loteVerticalesData, answeredControlIds, searchTerm, setSearchTerm, filterEstado, setFilterEstado, loteEstadoFilter, setLoteEstadoFilter, isExportOpen, setIsExportOpen, exportLoteId, setExportLoteId, exportFormat, setExportFormat, isExporting, setIsExporting, exportError, setExportError, calificacionesCycleFilter, setCalificacionesCycleFilter, lotesConDatos, calificacionesCycleOptions, defaultCalificacionesCycleKey, selectedCalificacionesCycleKey, lotesCalificacionesFiltrados, controles, controlesLotesAbiertos, normalizedSearchTerm, hasActiveControlFilters, lotesFiltrados, stats, exportSelectedLote }
}
