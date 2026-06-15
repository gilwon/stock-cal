'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Holding, Market, Currency, TickerSearchResult } from '@/types'

interface Props {
  portfolioId: string
  initial?: Holding
  onSave: (data: Omit<Holding, 'id' | 'created_at'>) => Promise<void>
}

export function HoldingForm({ portfolioId, initial, onSave }: Props) {
  const router = useRouter()
  const [market, setMarket] = useState<Market>(initial?.market ?? 'KR')
  const [ticker, setTicker] = useState(initial?.ticker ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [avgPrice, setAvgPrice] = useState(initial?.avg_price?.toString() ?? '')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'KRW')
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setSearchResults([])
        setSearchOpen(false)
        return
      }
      setSearching(true)
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}&market=${market}`)
      const data = await res.json()
      setSearchResults(data)
      setSearchOpen(true)
      setSearching(false)
    },
    [market]
  )

  useEffect(() => {
    if (initial) return
    const t = setTimeout(() => {
      if (ticker && !name) handleSearch(ticker)
    }, 400)
    return () => clearTimeout(t)
  }, [ticker, name, handleSearch, initial])

  function selectResult(r: TickerSearchResult) {
    setTicker(r.ticker)
    setName(r.name)
    setMarket(r.market)
    setCurrency(r.market === 'KR' ? 'KRW' : 'USD')
    setSearchResults([])
    setSearchOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) {
      alert('종목을 검색 결과에서 선택해주세요.')
      return
    }
    setLoading(true)
    await onSave({
      portfolio_id: portfolioId,
      ticker,
      name,
      market,
      quantity: parseFloat(quantity),
      avg_price: parseFloat(avgPrice),
      currency,
    })
    setLoading(false)
    router.push('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label>시장</Label>
        <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KR">한국 (KOSPI/KOSDAQ)</SelectItem>
            <SelectItem value="US">미국 (NYSE/NASDAQ)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative space-y-2">
        <Label>종목 검색 (티커 또는 종목명)</Label>
        <Input
          value={ticker}
          onChange={(e) => {
            setTicker(e.target.value)
            setName('')
          }}
          placeholder={market === 'KR' ? '예: 삼성전자 또는 005930' : '예: AAPL 또는 Apple'}
          required
        />
        {searching && (
          <p className="text-xs text-muted-foreground">검색 중...</p>
        )}
        {searchOpen && !searching && searchResults.length === 0 && ticker && !name && (
          <p className="text-xs text-muted-foreground">결과 없음 — 티커 코드(예: 005930) 또는 영문 종목명으로 검색하세요.</p>
        )}
        {searchOpen && searchResults.length > 0 && (
          <ul className="absolute z-10 w-full rounded-md border bg-background shadow-lg">
            {searchResults.map((r) => (
              <li
                key={r.ticker}
                onClick={() => selectResult(r)}
                className="cursor-pointer px-4 py-2 hover:bg-muted text-sm"
              >
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">{r.ticker}</span>
              </li>
            ))}
          </ul>
        )}
        {name && (
          <p className="text-sm text-muted-foreground">
            선택됨: {name} ({ticker})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>보유 수량</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
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

      <div className="space-y-2">
        <Label>통화</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KRW">KRW (원)</SelectItem>
            <SelectItem value="USD">USD (달러)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
