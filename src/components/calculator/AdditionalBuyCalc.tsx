'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

function pnlSign(n: number) {
  return n >= 0 ? '+' : ''
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

  // 기존 현황 손익
  const currentPnl = currentPrice > 0 && existingAvgPrice > 0
    ? (currentPrice - existingAvgPrice) * existingQuantity
    : null
  const currentPnlPct = existingAvgPrice > 0 && currentPrice > 0
    ? ((currentPrice - existingAvgPrice) / existingAvgPrice) * 100
    : null

  let result: AdditionalBuyResult | null = null
  if (addQtyNum > 0 && addPriceNum > 0 && existingQuantity > 0) {
    result = calcAdditionalBuy({
      existingQuantity,
      existingAvgPrice,
      additionalQuantity: addQtyNum,
      additionalPrice: addPriceNum,
      currentPrice,
    })
  }

  const targetPriceVal = result ? targetPrice(result.newAvgPrice, parseFloat(targetPct) || 10) : null

  return (
    <div className="space-y-6">
      {/* 현재 보유 현황 */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-3">현재 보유 현황</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">보유 수량</p>
            <p className="font-semibold">{existingQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">평균단가</p>
            <p className="font-semibold">{existingAvgPrice > 0 ? fmt(existingAvgPrice, currency) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">현재가</p>
            <p className="font-semibold">{currentPrice > 0 ? fmt(currentPrice, currency) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">현재 손익률</p>
            {currentPnlPct !== null ? (
              <p className={`font-semibold ${pnlClass(currentPnlPct)}`}>
                {pnlSign(currentPnlPct)}{currentPnlPct.toFixed(2)}%
                <span className="text-xs ml-1">
                  ({pnlSign(currentPnl!)}{fmt(currentPnl!, currency)})
                </span>
              </p>
            ) : (
              <p className="font-semibold text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* 추가 매수 입력 */}
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
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label>추가 매수 가격</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="any"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder={currentPrice > 0 ? currentPrice.toString() : ''}
            />
            {currentPrice > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs px-2"
                onClick={() => setAddPrice(currentPrice.toString())}
              >
                현재가
              </Button>
            )}
          </div>
        </div>
      </div>

      {!result && addQty === '' && (
        <p className="text-xs text-muted-foreground">추가 매수 수량을 입력하면 자동으로 계산됩니다.</p>
      )}

      {/* 계산 결과 */}
      {result && (
        <Card className="border-2">
          <CardContent className="pt-4 space-y-4">
            {/* 핵심: 새 평균단가 + 손익 비교 */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">새 평균단가</p>
                <p className="text-2xl font-bold">{fmt(result.newAvgPrice, currency)}</p>
                {existingAvgPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    기존 {fmt(existingAvgPrice, currency)} →{' '}
                    <span className={result.newAvgPrice < existingAvgPrice ? 'text-blue-500' : 'text-red-500'}>
                      {result.newAvgPrice < existingAvgPrice ? '▼' : '▲'}{' '}
                      {fmt(Math.abs(result.newAvgPrice - existingAvgPrice), currency)}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">추가매수 후 손익</p>
                <p className={`text-xl font-bold ${pnlClass(result.estimatedPnl)}`}>
                  {pnlSign(result.estimatedPnl)}{result.estimatedPnlPct.toFixed(2)}%
                </p>
                <p className={`text-xs ${pnlClass(result.estimatedPnl)}`}>
                  {pnlSign(result.estimatedPnl)}{fmt(result.estimatedPnl, currency)}
                </p>
              </div>
            </div>

            <hr />

            {/* 세부 수치 */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">손익분기점</p>
                <p className="font-semibold">{fmt(result.breakEvenPrice, currency)}</p>
              </div>
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
            </div>

            <hr />

            {/* 목표가 */}
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs">목표 수익률 (%)</Label>
                <Input
                  type="number"
                  value={targetPct}
                  onChange={(e) => setTargetPct(e.target.value)}
                  className="w-20 h-8 text-sm"
                />
              </div>
              {targetPriceVal && (
                <div>
                  <p className="text-xs text-muted-foreground">목표가</p>
                  <p className="text-lg font-bold text-red-500">{fmt(targetPriceVal, currency)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
