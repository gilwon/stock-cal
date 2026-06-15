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

// 우선주 판별: 이름이 쿼리 + 숫자/우/B 패턴으로 끝나는 경우
function isPreferredStock(name: string, query: string): boolean {
  if (name === query) return false
  // 우선주 suffix 패턴: 우, 우B, 우b, 1우, 2우B 등
  return /\d*우[bB]?$/.test(name)
}

async function searchNaverKR(query: string): Promise<TickerSearchResult[]> {
  try {
    const url = `https://m.stock.naver.com/front-api/search?q=${encodeURIComponent(query)}&target=stock&size=10&page=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    if (!json.isSuccess) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (json.result?.items ?? []).map((item: any) => {
      const suffix = item.typeCode === 'KOSDAQ' ? '.KQ' : '.KS'
      return {
        ticker: `${item.code}${suffix}`,
        name: item.name as string,
        market: 'KR' as Market,
      }
    })

    // 보통주 우선, 우선주 후순위 정렬 (쿼리 자체가 우선주 검색이 아닌 경우)
    const queryIsPreferred = /\d*우[bB]?$/.test(query)
    if (!queryIsPreferred) {
      results.sort((a: TickerSearchResult, b: TickerSearchResult) => {
        const aIsPref = isPreferredStock(a.name, query)
        const bIsPref = isPreferredStock(b.name, query)
        if (aIsPref && !bIsPref) return 1
        if (!aIsPref && bIsPref) return -1
        // 정확히 일치하는 이름 최우선
        if (a.name === query && b.name !== query) return -1
        if (a.name !== query && b.name === query) return 1
        return 0
      })
    }

    return results
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
    let yfResults = quotes
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

    // KR 결과 우선주 후순위 정렬
    if (market === 'KR' && hasKorean(query) && !/\d*우[bB]?$/.test(query)) {
      yfResults = yfResults.sort((a, b) => {
        const aIsPref = isPreferredStock(a.name, query)
        const bIsPref = isPreferredStock(b.name, query)
        if (aIsPref && !bIsPref) return 1
        if (!aIsPref && bIsPref) return -1
        if (a.name === query && b.name !== query) return -1
        if (a.name !== query && b.name === query) return 1
        return 0
      })
    }

    return yfResults
  } catch {
    if (market === 'KR') return searchNaverKR(query)
    return []
  }
}
