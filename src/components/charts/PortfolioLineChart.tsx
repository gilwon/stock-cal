'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { HistoryPoint } from '@/types'

interface Props {
  data: HistoryPoint[]
  loading: boolean
}

function fmtDate(d: string): string {
  return d.slice(5).replace('-', '/') // 'YYYY-MM-DD' → 'MM/DD'
}

function fmtKRW(v: number): string {
  return v.toLocaleString('ko-KR')
}

export function PortfolioLineChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        분석 중...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">데이터 없음</p>
    )
  }

  const chartData = data.map((p) => ({
    date: fmtDate(p.date),
    평가금액: Math.round(p.marketValue),
    매입금액: Math.round(p.costBasis),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={fmtKRW}
          width={80}
        />
        <Tooltip formatter={(v: unknown, name: string) => [fmtKRW(v as number), name]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="평가금액"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="매입금액"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
