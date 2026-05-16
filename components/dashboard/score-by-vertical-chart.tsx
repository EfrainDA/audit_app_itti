"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"

const data = [
  { name: "Cumplimiento", score: 85, weight: 30 },
  { name: "Calidad", score: 78, weight: 35 },
  { name: "Eficiencia", score: 72, weight: 35 },
]

function getBarColor(score: number): string {
  if (score >= 90) return "var(--success)"
  if (score >= 71) return "var(--warning)"
  return "var(--destructive)"
}

export function ScoreByVerticalChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 8" opacity={0.35} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            width={100}
          />
          <Tooltip
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
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24} background={{ fill: "var(--muted)", radius: 6 }}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
