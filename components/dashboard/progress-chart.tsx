"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

export type ProgressChartDatum = {
  name: string
  value: number
  color: string
}

const defaultData: ProgressChartDatum[] = [
  { name: "Terminadas", value: 2, color: "var(--success)" },
  { name: "En Curso", value: 2, color: "var(--primary)" },
  { name: "Pendientes", value: 1, color: "var(--chart-5)" },
]

type ProgressChartProps = {
  data?: ProgressChartDatum[]
  centerLabel?: string
  centerValue?: string
  height?: number
}

export function ProgressChart({
  data = defaultData,
  centerLabel = "Avance",
  centerValue,
  height = 280,
}: ProgressChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0)
  const resolvedCenterValue = centerValue ?? `${total}`

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-9">
        <div className="rounded-full border border-primary/15 bg-background px-5 py-4 text-center shadow-[0_18px_42px_oklch(0.28_0.025_252/0.12)]">
          <p className="text-3xl font-semibold leading-none tracking-tight text-primary">{resolvedCenterValue}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{centerLabel}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="48%"
            innerRadius={68}
            outerRadius={108}
            paddingAngle={4}
            cornerRadius={10}
            dataKey="value"
            stroke="var(--background)"
            strokeWidth={4}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--foreground)",
              boxShadow: "0 18px 44px oklch(0.28 0.025 252 / 0.12)",
            }}
            formatter={(value: number, name: string) => [value, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={34}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
