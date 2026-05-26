"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type ScoreByVerticalDatum = {
  name: string
  score: number
  weight: number
}

const defaultData: ScoreByVerticalDatum[] = [
  { name: "Cumplimiento", score: 85, weight: 30 },
  { name: "Calidad", score: 78, weight: 35 },
  { name: "Eficiencia", score: 72, weight: 35 },
]

function getBarColor(score: number): string {
  if (score >= 90) return "var(--success)"
  if (score >= 71) return "var(--warning)"
  return "var(--destructive)"
}

type ScoreByVerticalChartProps = {
  data?: ScoreByVerticalDatum[]
  height?: number
}

export function ScoreByVerticalChart({ data = defaultData, height = 280 }: ScoreByVerticalChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 14, right: 24, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 8" opacity={0.38} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 650 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            width={124}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.26 }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--foreground)",
              boxShadow: "0 18px 44px oklch(0.28 0.025 252 / 0.12)",
            }}
            formatter={(value: number, name, props) => [
              `${value}% (Peso: ${props.payload?.weight ?? 0}%)`,
              "Puntuación",
            ]}
          />
          <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={26} background={{ fill: "var(--muted)", radius: 8 }}>
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
