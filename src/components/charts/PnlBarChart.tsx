'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { HoldingWithPrice } from '@/types'

interface Props {
  holdings: HoldingWithPrice[]
}

export function PnlBarChart({ holdings }: Props) {
  const data = holdings.map((h) => ({ name: h.name, pnl: h.pnl }))

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">데이터 없음</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v / 1000).toFixed(0) + 'k'} />
        <Tooltip formatter={(v) => [(typeof v === 'number' ? v.toLocaleString() : String(v)), '손익']} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? '#ef4444' : '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
