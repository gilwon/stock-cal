import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { fetchQuotes } from '@/lib/yahoo-finance'

const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET(req: NextRequest) {
  const tickerParam = req.nextUrl.searchParams.get('tickers')
  const tickers = tickerParam?.split(',').map((t) => t.trim()).filter(Boolean) ?? []

  if (tickers.length === 0) {
    return NextResponse.json({})
  }

  const supabase = await createServerClient()
  const staleThreshold = new Date(Date.now() - CACHE_TTL_MS).toISOString()

  const { data: cached } = await supabase
    .from('sc_price_cache')
    .select('ticker, price, currency, name')
    .in('ticker', tickers)
    .gt('updated_at', staleThreshold)

  const cachedMap = Object.fromEntries((cached ?? []).map((c) => [c.ticker, c]))
  const staleTickers = tickers.filter((t) => !cachedMap[t])

  if (staleTickers.length > 0) {
    const fresh = await fetchQuotes(staleTickers)
    const upsertRows = Object.entries(fresh)
      .filter(([, v]) => v !== null)
      .map(([ticker, v]) => ({
        ticker,
        price: v!.price,
        currency: v!.currency,
        name: v!.name,
        updated_at: new Date().toISOString(),
      }))

    if (upsertRows.length > 0) {
      await supabase.from('sc_price_cache').upsert(upsertRows)
    }

    for (const [ticker, v] of Object.entries(fresh)) {
      if (v) cachedMap[ticker] = v
    }
  }

  const result = Object.fromEntries(
    tickers.map((t) => [t, cachedMap[t] ?? null])
  )

  return NextResponse.json(result)
}
