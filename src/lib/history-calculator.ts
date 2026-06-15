import type { HistoryPoint } from '@/types'

interface DayPrice {
  date: string  // 'YYYY-MM-DD'
  close: number
}

export function buildHistoryPoints(
  holdings: Array<{ ticker: string; quantity: number; avg_price: number }>,
  tickerPrices: Record<string, DayPrice[]>
): HistoryPoint[] {
  if (holdings.length === 0) return []

  const tickerDateMap: Record<string, Record<string, number>> = {}
  const allDates = new Set<string>()

  for (const [ticker, prices] of Object.entries(tickerPrices)) {
    tickerDateMap[ticker] = {}
    for (const { date, close } of prices) {
      tickerDateMap[ticker][date] = close
      allDates.add(date)
    }
  }

  if (allDates.size === 0) return []

  const sortedDates = [...allDates].sort()
  const costBasis = holdings.reduce((sum, h) => sum + h.quantity * h.avg_price, 0)
  const lastPrice: Record<string, number> = {}

  return sortedDates.map((date) => {
    let marketValue = 0
    for (const h of holdings) {
      const priceMap = tickerDateMap[h.ticker] ?? {}
      if (date in priceMap) {
        lastPrice[h.ticker] = priceMap[date]
      }
      marketValue += h.quantity * (lastPrice[h.ticker] ?? 0)
    }
    return { date, marketValue, costBasis }
  })
}
