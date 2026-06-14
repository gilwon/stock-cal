'use client'

import { useState } from 'react'
import { AdditionalBuyCalc } from '@/components/calculator/AdditionalBuyCalc'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">추가매수 계산기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>보유 수량</Label>
            <Input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="100"
              required
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
              required
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
              required
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
        <Button type="submit">계산하기</Button>
      </form>

      {submitted && (
        <AdditionalBuyCalc
          existingQuantity={parseFloat(qty)}
          existingAvgPrice={parseFloat(avgPrice)}
          currentPrice={parseFloat(currentPrice)}
          currency={currency}
        />
      )}
    </div>
  )
}
