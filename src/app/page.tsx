'use client'

import { useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { AllocationPieChart } from '@/components/charts/AllocationPieChart'
import { PnlBarChart } from '@/components/charts/PnlBarChart'
import { RankBarChart } from '@/components/charts/RankBarChart'
import { PortfolioLineChart } from '@/components/charts/PortfolioLineChart'
import { usePortfolioStore, usePortfolioSummary } from '@/store/portfolio'
import type { QuoteMap } from '@/types'

export default function DashboardPage() {
  const {
    holdingsWithPrice,
    holdings,
    setQuotes,
    portfolios,
    activePortfolioId,
    removeHolding,
    setLoadingPrices,
  } = usePortfolioStore()

  const summary = usePortfolioSummary()

  // Fetch prices when holdings change
  useEffect(() => {
    if (holdings.length === 0) return
    const tickers = [...new Set(holdings.map((h) => h.ticker))].join(',')
    setLoadingPrices(true)
    fetch(`/api/stocks/quote?tickers=${tickers}`)
      .then((r) => r.json())
      .then((data: QuoteMap) => setQuotes(data))
      .finally(() => setLoadingPrices(false))
  }, [holdings, setQuotes, setLoadingPrices])

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

      <HoldingsTable holdings={holdingsWithPrice} onDelete={handleDelete} />

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
          <PortfolioLineChart summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
