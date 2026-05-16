"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

const data = [
  { name: "Terminadas", value: 2, color: "var(--success)" },
  { name: "En Curso", value: 2, color: "var(--primary)" },
  { name: "Pendientes", value: 1, color: "var(--chart-5)" },
]

export function ProgressChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="var(--background)"
            strokeWidth={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
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
            height={36}
            formatter={(value) => (
              <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
