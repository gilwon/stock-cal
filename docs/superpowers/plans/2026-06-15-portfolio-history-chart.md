# Portfolio History Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 "평가" 탭에 90일 포트폴리오 평가금액 + 매입금액 라인 차트를 추가한다.

**Architecture:** yahoo-finance2 `yf.chart()`로 각 보유 종목 90일 종가를 병렬 fetch → 날짜 union + forward-fill로 합산 → `/api/portfolio/history` API → `PortfolioLineChart` recharts 두 라인 렌더링. DB 추가 없음.

**Tech Stack:** yahoo-finance2 v3 (`new YahooFinance()`), Supabase (@supabase/ssr), recharts ^3.8.1, Next.js 16 App Router, TypeScript, Jest + SWC

---

## File Map

| 파일 | 작업 | 역할 |
|------|------|------|
| `src/types/index.ts` | 수정 | `HistoryPoint` 타입 추가 |
| `src/__tests__/history-calculator.test.ts` | 신규 | 날짜 합산/forward-fill 단위 테스트 |
| `src/lib/history-calculator.ts` | 신규 | 순수 함수: 날짜 병합, 평가금액 계산 |
| `src/app/api/portfolio/history/route.ts` | 신규 | GET /api/portfolio/history |
| `src/components/charts/PortfolioLineChart.tsx` | 수정 | placeholder → 실제 recharts 차트 |
| `src/app/page.tsx` | 수정 | history fetch + props 전달 |

---

## Task 1: HistoryPoint 타입 추가

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add HistoryPoint to end of file**

`src/types/index.ts` 끝에 추가:

```ts
export interface HistoryPoint {
  date: string        // 'YYYY-MM-DD'
  marketValue: number
  costBasis: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add HistoryPoint type"
```

---

## Task 2: History Calculator (TDD)

**Files:**
- Create: `src/__tests__/history-calculator.test.ts`
- Create: `src/lib/history-calculator.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/history-calculator.test.ts
import { buildHistoryPoints } from '@/lib/history-calculator'

describe('buildHistoryPoints', () => {
  it('returns empty array when no holdings', () => {
    expect(buildHistoryPoints([], {})).toEqual([])
  })

  it('calculates marketValue for single holding single date', () => {
    const result = buildHistoryPoints(
      [{ ticker: 'A', quantity: 10, avg_price: 100 }],
      { A: [{ date: '2026-01-01', close: 120 }] }
    )
    expect(result).toEqual([{ date: '2026-01-01', marketValue: 1200, costBasis: 1000 }])
  })

  it('costBasis is constant across all dates', () => {
    const result = buildHistoryPoints(
      [{ ticker: 'A', quantity: 5, avg_price: 80 }],
      {
        A: [
          { date: '2026-01-01', close: 100 },
          { date: '2026-01-02', close: 110 },
        ],
      }
    )
    expect(result[0].costBasis).toBe(400)
    expect(result[1].costBasis).toBe(400)
  })

  it('forward-fills missing price for a ticker', () => {
    const result = buildHistoryPoints(
      [
        { ticker: 'A', quantity: 1, avg_price: 100 },
        { ticker: 'B', quantity: 1, avg_price: 200 },
      ],
      {
        A: [
          { date: '2026-01-01', close: 110 },
          { date: '2026-01-02', close: 115 },
        ],
        B: [{ date: '2026-01-01', close: 200 }], // 2026-01-02 missing
      }
    )
    // 2026-01-02: A=115, B forward-filled=200
    expect(result[1]).toEqual({ date: '2026-01-02', marketValue: 315, costBasis: 300 })
  })

  it('unions dates from multiple tickers', () => {
    const result = buildHistoryPoints(
      [
        { ticker: 'A', quantity: 1, avg_price: 50 },
        { ticker: 'B', quantity: 1, avg_price: 50 },
      ],
      {
        A: [{ date: '2026-01-01', close: 100 }],
        B: [{ date: '2026-01-02', close: 200 }],
      }
    )
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-01-01')
    expect(result[1].date).toBe('2026-01-02')
  })

  it('ticker with no price data contributes 0 to marketValue', () => {
    const result = buildHistoryPoints(
      [{ ticker: 'A', quantity: 10, avg_price: 100 }],
      { A: [] }
    )
    expect(result).toEqual([])
  })

  it('sums multiple holdings on same date', () => {
    const result = buildHistoryPoints(
      [
        { ticker: 'A', quantity: 2, avg_price: 100 },
        { ticker: 'B', quantity: 3, avg_price: 200 },
      ],
      {
        A: [{ date: '2026-01-01', close: 150 }],
        B: [{ date: '2026-01-01', close: 250 }],
      }
    )
    expect(result[0].marketValue).toBe(2 * 150 + 3 * 250) // 1050
    expect(result[0].costBasis).toBe(2 * 100 + 3 * 200)   // 800
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest --testPathPatterns="history-calculator" --no-coverage
```

Expected: FAIL — `Cannot find module '../lib/history-calculator'`

- [ ] **Step 3: Implement history-calculator.ts**

```ts
// src/lib/history-calculator.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --testPathPatterns="history-calculator" --no-coverage
```

Expected: PASS — 모든 테스트 통과

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/history-calculator.test.ts src/lib/history-calculator.ts
git commit -m "feat: add history calculator with forward-fill date merging"
```

---

## Task 3: API Route

**Files:**
- Create: `src/app/api/portfolio/history/route.ts`

- [ ] **Step 1: Create directory and route file**

```bash
mkdir -p src/app/api/portfolio/history
```

```ts
// src/app/api/portfolio/history/route.ts
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
```

- [ ] **Step 2: Smoke test**

개발 서버(`http://localhost:3002`) 실행 중인지 확인 후:

```bash
# portfolioId는 Supabase sc_portfolios 테이블에서 실제 ID 복사
curl "http://localhost:3002/api/portfolio/history?portfolioId=<ACTUAL_ID>" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Points: {len(d)}')
if d: print('First:', d[0], 'Last:', d[-1])
"
```

Expected: 60~90개 날짜 포인트, 각 `{date, marketValue, costBasis}` 구조

- [ ] **Step 3: Commit**

```bash
git add src/app/api/portfolio/history/route.ts
git commit -m "feat: add GET /api/portfolio/history endpoint"
```

---

## Task 4: PortfolioLineChart 컴포넌트

**Files:**
- Modify: `src/components/charts/PortfolioLineChart.tsx`

현재 파일 전체 교체 (기존: placeholder만 있는 파일).

- [ ] **Step 1: Replace component**

```tsx
// src/components/charts/PortfolioLineChart.tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { HistoryPoint } from '@/types'

interface Props {
  data: HistoryPoint[]
  loading: boolean
}

function fmtDate(d: string): string {
  return d.slice(5).replace('-', '/') // 'YYYY-MM-DD' → 'MM/DD'
}

function fmtKRW(v: number): string {
  return v.toLocaleString('ko-KR')
}

export function PortfolioLineChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        분석 중...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">데이터 없음</p>
    )
  }

  const chartData = data.map((p) => ({
    date: fmtDate(p.date),
    평가금액: Math.round(p.marketValue),
    매입금액: Math.round(p.costBasis),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={fmtKRW}
          width={80}
        />
        <Tooltip formatter={(v: unknown, name: string) => [fmtKRW(v as number), name]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="평가금액"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="매입금액"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/charts/PortfolioLineChart.tsx
git commit -m "feat: implement PortfolioLineChart with 90-day history"
```

---

## Task 5: 대시보드 연동

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update page.tsx**

현재 파일 전체 교체:

```tsx
// src/app/page.tsx
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
```

- [ ] **Step 2: Run all tests**

```bash
npm test --no-coverage
```

Expected: 모든 테스트 PASS (기존 45개 + 새 history-calculator 테스트)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: `/api/portfolio/history` 라우트 포함, 에러 없음

- [ ] **Step 5: Browser verification**

1. `http://localhost:3002` 접속
2. "평가" 탭 클릭
3. "분석 중..." → 90일 라인 차트 표시 확인
4. indigo 실선(평가금액) + gray 점선(매입금액) 두 라인 확인
5. 손익 플러스 구간: 실선이 점선 위 / 마이너스: 점선이 위

- [ ] **Step 6: Final commit**

```bash
git add src/app/page.tsx
git commit -m "feat: connect portfolio history chart to dashboard"
```
