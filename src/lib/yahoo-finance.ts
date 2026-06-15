import YahooFinance from 'yahoo-finance2'
import type { Currency, Market, PriceQuote, QuoteMap, TickerSearchResult } from '@/types'

const yf = new YahooFinance()

// Suppress the yahooSurvey notice
try {
  yf._notices.suppress(['yahooSurvey'])
} catch {
  // ignore if not available
}

function detectCurrency(ticker: string): Currency {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? 'KRW' : 'USD'
}

function detectMarket(ticker: string): Market {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? 'KR' : 'US'
}

export async function fetchQuotes(tickers: string[]): Promise<QuoteMap> {
  const results: QuoteMap = {}
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const quote = await yf.quote(ticker)
        const price = quote.regularMarketPrice
        if (price === undefined || price === null) {
          results[ticker] = null
          return
        }
        results[ticker] = {
          price,
          currency: detectCurrency(ticker),
          name: quote.longName ?? quote.shortName ?? ticker,
        } satisfies PriceQuote
      } catch {
        results[ticker] = null
      }
    })
  )
  return results
}

function hasKorean(str: string) {
  return /[가-힣]/.test(str)
}

async function searchNaverKR(query: string): Promise<TickerSearchResult[]> {
  try {
    const url = `https://m.stock.naver.com/front-api/search?q=${encodeURIComponent(query)}&target=stock&size=10&page=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json.isSuccess) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.result?.items ?? []).map((item: any) => {
      const suffix = item.typeCode === 'KOSDAQ' ? '.KQ' : '.KS'
      return {
        ticker: `${item.code}${suffix}`,
        name: item.name as string,
        market: 'KR' as Market,
      }
    })
  } catch {
    return []
  }
}

export async function searchTicker(
  query: string,
  market?: Market
): Promise<TickerSearchResult[]> {
  if (market === 'KR' && hasKorean(query)) {
    return searchNaverKR(query)
  }

  try {
    const result = await yf.search(query, { newsCount: 0 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = result.quotes ?? []
    const yfResults = quotes
      .filter((q) => q.quoteType === 'EQUITY' && typeof q.symbol === 'string')
      .map((q) => ({
        ticker: q.symbol as string,
        name: (q.longname ?? q.shortname ?? q.symbol) as string,
        market: detectMarket(q.symbol as string),
      }))
      .filter((q) => !market || q.market === market)
      .slice(0, 10)

    // Yahoo returned nothing for KR → fallback to Naver
    if (yfResults.length === 0 && market === 'KR') {
      return searchNaverKR(query)
    }
    return yfResults
  } catch {
    if (market === 'KR') return searchNaverKR(query)
    return []
  }
}
