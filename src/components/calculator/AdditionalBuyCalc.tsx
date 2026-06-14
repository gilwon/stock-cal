'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calcAdditionalBuy, targetPrice } from '@/lib/calculations'
import type { AdditionalBuyResult } from '@/types'

interface Props {
  existingQuantity?: number
  existingAvgPrice?: number
  currentPrice?: number
  currency?: string
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function pnlClass(n: number) {
  if (n > 0) return 'text-red-500'
  if (n < 0) return 'text-blue-500'
  return 'text-gray-500'
}

export function AdditionalBuyCalc({
  existingQuantity = 0,
  existingAvgPrice = 0,
  currentPrice = 0,
  currency = 'KRW',
}: Props) {
  const [addQty, setAddQty] = useState('')
  const [addPrice, setAddPrice] = useState(currentPrice > 0 ? currentPrice.toString() : '')
  const [targetPct, setTargetPct] = useState('10')

  const addQtyNum = parseFloat(addQty) || 0
  const addPriceNum = parseFloat(addPrice) || currentPrice

  let result: AdditionalBuyResult | null = null
  if (addQtyNum > 0 && addPriceNum > 0 && existingQuantity > 0 && currentPrice > 0) {
    result = calcAdditionalBuy({
      existingQuantity,
      existingAvgPrice,
      additionalQuantity: addQtyNum,
      additionalPrice: addPriceNum,
      currentPrice,
    })
  }

  const target = result ? targetPrice(result.newAvgPrice, parseFloat(targetPct) || 10) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">기존 수량</p>
          <p className="font-semibold">{existingQuantity.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">기존 평균단가</p>
          <p className="font-semibold">{existingAvgPrice > 0 ? fmt(existingAvgPrice, currency) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">현재가</p>
          <p className="font-semibold">{currentPrice > 0 ? fmt(currentPrice, currency) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>추가 매수 수량</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            placeholder="50"
          />
        </div>
        <div className="space-y-2">
          <Label>추가 매수 가격</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value)}
            placeholder={currentPrice > 0 ? currentPrice.toString() : ''}
          />
        </div>
      </div>

      {result && (
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">계산 결과</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">추가 매수 금액</p>
              <p className="font-semibold">{fmt(result.additionalCost, currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">새 총 수량</p>
              <p className="font-semibold">{result.newTotalQuantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">새 총 매입금액</p>
              <p className="font-semibold">{fmt(result.newTotalCost, currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">새 평균단가</p>
              <p className="font-semibold">{fmt(result.newAvgPrice, currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">손익분기점</p>
              <p className="font-semibold">{fmt(result.breakEvenPrice, currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">예상 손익</p>
              <p className={`font-semibold ${pnlClass(result.estimatedPnl)}`}>
                {result.estimatedPnl >= 0 ? '+' : ''}
                {fmt(result.estimatedPnl, currency)}{' '}
                <span className="text-xs">
                  ({result.estimatedPnlPct >= 0 ? '+' : ''}
                  {result.estimatedPnlPct.toFixed(2)}%)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs">목표 수익률 (%)</Label>
            <Input
              type="number"
              value={targetPct}
              onChange={(e) => setTargetPct(e.target.value)}
              className="w-24"
            />
          </div>
          {target && (
            <div className="pt-4">
              <p className="text-xs text-muted-foreground">목표가</p>
              <p className="text-lg font-bold text-red-500">{fmt(target, currency)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
