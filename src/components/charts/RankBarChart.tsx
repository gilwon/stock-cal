'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { HoldingWithPrice } from '@/types'

interface Props {
  holdings: HoldingWithPrice[]
}

export function RankBarChart({ holdings }: Props) {
  const data = [...holdings]
    .sort((a, b) => b.pnlPct - a.pnlPct)
    .map((h) => ({ name: h.name, pnlPct: h.pnlPct }))

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">데이터 없음</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 8, bottom: 8 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(v) => [(typeof v === 'number' ? `${v.toFixed(2)}%` : String(v)), '수익률']} />
        <Bar dataKey="pnlPct" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnlPct >= 0 ? '#ef4444' : '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
