'use client'

import { HoldingForm } from '@/components/holdings/HoldingForm'
import { usePortfolioStore } from '@/store/portfolio'
import type { Holding } from '@/types'

export default function NewHoldingPage() {
  const { activePortfolioId, addHolding } = usePortfolioStore()

  async function handleSave(data: Omit<Holding, 'id' | 'created_at'>) {
    const res = await fetch('/api/holdings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const holding = await res.json()
    addHolding(holding)
  }

  if (!activePortfolioId) {
    return (
      <p className="text-muted-foreground">포트폴리오를 먼저 생성해주세요.</p>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">종목 추가</h1>
      <HoldingForm portfolioId={activePortfolioId} onSave={handleSave} />
    </div>
  )
}
