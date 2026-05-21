"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getScoreColor,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"
import Link from "next/link"
import { useAppData } from "@/hooks/use-app-data"
import { downloadCsv } from "@/lib/export"

export function AuditoriasTable() {
  const { data } = useAppData()
  // Construir lista de controles recientes con datos
  const controlesRecientes = useMemo(() => {
    const controles: Array<{
      id: string
      identificador: string
      verticalNombre: string
      unidadNombre: string
      unidadLogo?: string
      auditorNombre: string
      estado: string
      scoreControl?: number
      ciclo: string
    }> = []

    data.loteVerticales.forEach((loteVertical) => {
      const lote = data.lotes.find((l) => l.id === loteVertical.loteId)
      if (!lote) return

      const unidad = data.unidades.find((u) => u.id === lote.unidadNegocioId)
      const modelo = data.modelos.find((m) => m.id === lote.modeloControlId)
      const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)

      loteVertical.controles.forEach((control) => {
        const auditor = control.auditorId
          ? data.users.find((u) => u.id === control.auditorId)
          : null

        controles.push({
          id: control.id,
          identificador: control.identificador,
          verticalNombre: vertical?.nombre || "N/A",
          unidadNombre: unidad?.nombre || "N/A",
          unidadLogo: unidad?.logo,
          auditorNombre: auditor?.name || "Sin asignar",
          estado: control.estado,
          scoreControl: control.scoreControl,
          ciclo: `Ciclo ${lote.ciclo} - ${lote.año}`,
        })
      })
    })

    // Ordenar por fecha de creación (más recientes primero) y tomar los primeros 5
    return controles.slice(0, 5)
  }, [data])

  const exportControl = (control: (typeof controlesRecientes)[number]) => {
    downloadCsv(`control-${control.id}.csv`, [
      {
        control: control.identificador,
        vertical: control.verticalNombre,
        unidad: control.unidadNombre,
        auditor: control.auditorNombre,
        estado: control.estado,
        score: control.scoreControl ?? "",
        ciclo: control.ciclo,
      },
    ])
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Control
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Vertical
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Unidad
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Auditor
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Estado
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Puntuación
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {controlesRecientes.map((control) => (
            <tr key={control.id} className="border-b border-border hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4">
                <span className="font-mono font-medium">{control.identificador}</span>
              </td>
              <td className="py-3 px-4 text-sm">
                {control.verticalNombre}
              </td>
              <td className="py-3 px-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 overflow-hidden rounded">
                    {control.unidadLogo ? (
                      <Image src={control.unidadLogo} alt={control.unidadNombre} width={24} height={24} className="object-contain" />
                    ) : (
                      <div className="h-6 w-6 flex items-center justify-center bg-muted rounded">
                        <span className="text-xs">U</span>
                      </div>
                    )}
                  </div>
                  <span>{control.unidadNombre}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {control.auditorNombre}
              </td>
              <td className="py-3 px-4">
                <Badge className={getEstadoBadgeColor(control.estado)}>
                  {formatEstado(control.estado)}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right">
                {control.scoreControl !== undefined ? (
                  <span className={`font-semibold ${getScoreColor(control.scoreControl)}`}>
                    {control.scoreControl}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/evaluaciones/${control.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/evaluaciones/${control.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportControl(control)}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportControl(control)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generar reporte
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
