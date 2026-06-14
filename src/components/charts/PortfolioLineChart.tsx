'use client'

import type { PortfolioSummary } from '@/types'

interface Props {
  summary: PortfolioSummary
}

export function PortfolioLineChart({ summary }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
      <p className="text-sm">현재 평가금액</p>
      <p className="text-3xl font-bold text-foreground">
        {summary.totalMarketValue.toLocaleString()}
      </p>
      <p className="text-xs">히스토리 차트는 Phase 2에서 제공됩니다</p>
    </div>
  )
}
