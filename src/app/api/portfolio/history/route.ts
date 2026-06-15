import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { createServerClient } from '@/lib/supabase/server'
import { buildHistoryPoints } from '@/lib/history-calculator'

const yf = new YahooFinance()

export async function GET(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get('portfolioId')?.trim() ?? ''

  if (!portfolioId) {
    return NextResponse.json({ error: 'portfolioId required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: holdings, error } = await supabase
    .from('sc_holdings')
    .select('ticker, quantity, avg_price')
    .eq('portfolio_id', portfolioId)

  if (error || !holdings || holdings.length === 0) {
    return NextResponse.json([])
  }

  const period1 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const tickers = [...new Set(holdings.map((h) => h.ticker))]

  const tickerPricesArr = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const chart = await yf.chart(ticker, { period1, interval: '1d' })
        const prices = chart.quotes
          .filter((q) => q.close !== null && q.date != null)
          .map((q) => ({
            date: new Date(q.date as Date).toISOString().split('T')[0],
            close: q.close as number,
          }))
        return { ticker, prices }
      } catch {
        return { ticker, prices: [] }
      }
    })
  )

  const tickerPrices: Record<string, { date: string; close: number }[]> = {}
  for (const { ticker, prices } of tickerPricesArr) {
    tickerPrices[ticker] = prices
  }

  const result = buildHistoryPoints(holdings, tickerPrices)
  return NextResponse.json(result)
}
