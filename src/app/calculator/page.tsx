'use client'

import { useState } from 'react'
import { AdditionalBuyCalc } from '@/components/calculator/AdditionalBuyCalc'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Currency } from '@/types'

export default function CalculatorPage() {
  const [qty, setQty] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [currency, setCurrency] = useState<Currency>('KRW')

  const qtyNum = parseFloat(qty) || 0
  const avgPriceNum = parseFloat(avgPrice) || 0
  const currentPriceNum = parseFloat(currentPrice) || 0
  const ready = qtyNum > 0 && avgPriceNum > 0 && currentPriceNum > 0

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">추가매수 계산기</h1>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>보유 수량</Label>
            <Input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>평균 매수가</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="70000"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>현재가</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="67000"
            />
          </div>
          <div className="space-y-2">
            <Label>통화</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KRW">KRW</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {ready ? (
        <AdditionalBuyCalc
          existingQuantity={qtyNum}
          existingAvgPrice={avgPriceNum}
          currentPrice={currentPriceNum}
          currency={currency}
        />
      ) : (
        <p className="text-sm text-muted-foreground">보유 수량, 평균 매수가, 현재가를 입력하면 자동으로 계산됩니다.</p>
      )}
    </div>
  )
}
