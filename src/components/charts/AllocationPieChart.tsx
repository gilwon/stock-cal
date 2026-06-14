'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { HoldingWithPrice } from '@/types'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9']

interface Props {
  holdings: HoldingWithPrice[]
}

export function AllocationPieChart({ holdings }: Props) {
  const data = holdings
    .filter((h) => h.marketValue > 0)
    .map((h) => ({ name: h.name, value: h.marketValue }))

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">데이터 없음</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} ${((percent ?? 0) * 100).toFixed(1)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => (typeof v === 'number' ? v.toLocaleString() : String(v))} />
      </PieChart>
    </ResponsiveContainer>
  )
}
