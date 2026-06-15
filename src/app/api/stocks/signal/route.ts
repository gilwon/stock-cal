import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { createServerClient } from '@/lib/supabase/server'
import { buildSignalResult } from '@/lib/signal-calculator'
import type { SignalResult } from '@/types'

const yf = new YahooFinance()
const SIGNAL_TTL_MS = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.trim() ?? ''
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 })
  }

  const supabase = await createServerClient()

  if (!refresh) {
    const staleThreshold = new Date(Date.now() - SIGNAL_TTL_MS).toISOString()
    const { data: cached } = await supabase
      .from('sc_signal_cache')
      .select('*')
      .eq('ticker', ticker)
      .gt('updated_at', staleThreshold)
      .single()

    if (cached) {
      return NextResponse.json({
        ticker: cached.ticker,
        signal: cached.signal,
        score: cached.score,
        indicators: cached.indicators,
        updatedAt: cached.updated_at,
      } satisfies SignalResult)
    }
  }

  try {
    const period1 = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)

    const [chart, summary] = await Promise.all([
      yf.chart(ticker, { period1, interval: '1d' }),
      yf
        .quoteSummary(ticker, {
          modules: ['financialData', 'summaryDetail', 'recommendationTrend'],
        })
        .catch(() => null),
    ])

    const closes = chart.quotes
      .filter((q) => q.close !== null)
      .map((q) => q.close as number)

    if (closes.length < 15) {
      return NextResponse.json(
        { error: 'insufficient price history' },
        { status: 422 }
      )
    }

    const fd = summary?.financialData
    const sd = summary?.summaryDetail
    const rt = summary?.recommendationTrend?.trend?.[0]

    const result = buildSignalResult(ticker, closes, {
      high52: (sd as { fiftyTwoWeekHigh?: number } | null)?.fiftyTwoWeekHigh ?? null,
      low52: (sd as { fiftyTwoWeekLow?: number } | null)?.fiftyTwoWeekLow ?? null,
      targetMeanPrice: (fd as { targetMeanPrice?: number } | null)?.targetMeanPrice ?? null,
      currentPrice: closes[closes.length - 1],
      per: (sd as { trailingPE?: number } | null)?.trailingPE ?? null,
      consensusBuy:
        ((rt as { strongBuy?: number } | null)?.strongBuy ?? 0) +
        ((rt as { buy?: number } | null)?.buy ?? 0),
      consensusHold: (rt as { hold?: number } | null)?.hold ?? 0,
      consensusSell:
        ((rt as { strongSell?: number } | null)?.strongSell ?? 0) +
        ((rt as { sell?: number } | null)?.sell ?? 0),
    })

    await supabase.from('sc_signal_cache').upsert({
      ticker,
      signal: result.signal,
      score: result.score,
      indicators: result.indicators,
      updated_at: result.updatedAt,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[signal]', ticker, err)
    return NextResponse.json({ error: 'failed to fetch signal data' }, { status: 500 })
  }
}
