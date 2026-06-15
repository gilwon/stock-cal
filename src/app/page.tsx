'use client'

import { useEffect, useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { AllocationPieChart } from '@/components/charts/AllocationPieChart'
import { PnlBarChart } from '@/components/charts/PnlBarChart'
import { RankBarChart } from '@/components/charts/RankBarChart'
import { PortfolioLineChart } from '@/components/charts/PortfolioLineChart'
import { usePortfolioStore, usePortfolioSummary } from '@/store/portfolio'
import type { QuoteMap, SignalResult, HistoryPoint } from '@/types'

export default function DashboardPage() {
  const {
    holdingsWithPrice,
    holdings,
    setQuotes,
    setSignals,
    signals,
    portfolios,
    activePortfolioId,
    removeHolding,
    setLoadingPrices,
  } = usePortfolioStore()

  const summary = usePortfolioSummary()
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (holdings.length === 0) return
    const tickers = [...new Set(holdings.map((h) => h.ticker))].join(',')
    setLoadingPrices(true)
    fetch(`/api/stocks/quote?tickers=${tickers}`)
      .then((r) => r.json())
      .then((data: QuoteMap) => setQuotes(data))
      .finally(() => setLoadingPrices(false))
  }, [holdings, setQuotes, setLoadingPrices])

  useEffect(() => {
    if (holdings.length === 0) return
    const tickers = [...new Set(holdings.map((h) => h.ticker))]
    Promise.all(
      tickers.map((ticker) =>
        fetch(`/api/stocks/signal?ticker=${encodeURIComponent(ticker)}`)
          .then((r) => r.json())
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, SignalResult | null> = {}
      tickers.forEach((ticker, i) => {
        map[ticker] = results[i] && 'signal' in results[i] ? results[i] : null
      })
      setSignals(map)
    })
  }, [holdings, setSignals])

  useEffect(() => {
    if (!activePortfolioId) return
    setHistoryLoading(true)
    fetch(`/api/portfolio/history?portfolioId=${activePortfolioId}`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [activePortfolioId])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('이 종목을 삭제할까요?')) return
      await fetch(`/api/holdings/${id}`, { method: 'DELETE' })
      removeHolding(id)
    },
    [removeHolding]
  )

  const baseCurrency =
    portfolios.find((p) => p.id === activePortfolioId)?.base_currency ?? 'KRW'

  return (
    <div className="space-y-8">
      <SummaryCards summary={summary} baseCurrency={baseCurrency} />

      <HoldingsTable
        holdings={holdingsWithPrice}
        signals={signals}
        onDelete={handleDelete}
      />

      <Tabs defaultValue="pie">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pie">비중</TabsTrigger>
          <TabsTrigger value="pnl">손익</TabsTrigger>
          <TabsTrigger value="rank">순위</TabsTrigger>
          <TabsTrigger value="line">평가</TabsTrigger>
        </TabsList>
        <TabsContent value="pie" className="rounded-lg border p-4 mt-2">
          <AllocationPieChart holdings={holdingsWithPrice} />
        </TabsContent>
        <TabsContent value="pnl" className="rounded-lg border p-4 mt-2">
          <PnlBarChart holdings={holdingsWithPrice} />
        </TabsContent>
        <TabsContent value="rank" className="rounded-lg border p-4 mt-2">
          <RankBarChart holdings={holdingsWithPrice} />
        </TabsContent>
        <TabsContent value="line" className="rounded-lg border p-4 mt-2">
          <PortfolioLineChart data={history} loading={historyLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
