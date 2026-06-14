'use client'

import { useParams } from 'next/navigation'
import { HoldingForm } from '@/components/holdings/HoldingForm'
import { AdditionalBuyCalc } from '@/components/calculator/AdditionalBuyCalc'
import { usePortfolioStore } from '@/store/portfolio'
import type { Holding } from '@/types'

export default function EditHoldingPage() {
  const { id } = useParams<{ id: string }>()
  const { holdingsWithPrice, updateHolding } = usePortfolioStore()
  const holding = holdingsWithPrice.find((h) => h.id === id)

  async function handleSave(data: Omit<Holding, 'id' | 'created_at'>) {
    const res = await fetch(`/api/holdings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    updateHolding(updated)
  }

  if (!holding) {
    return <p className="text-muted-foreground">종목을 찾을 수 없습니다.</p>
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">{holding.name} 수정</h1>
        <HoldingForm
          portfolioId={holding.portfolio_id}
          initial={holding}
          onSave={handleSave}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">추가매수 계산기</h2>
        <AdditionalBuyCalc
          existingQuantity={holding.quantity}
          existingAvgPrice={holding.avg_price}
          currentPrice={holding.currentPrice ?? 0}
          currency={holding.currency}
        />
      </div>
    </div>
  )
}
