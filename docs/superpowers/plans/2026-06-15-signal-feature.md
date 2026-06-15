# Signal Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보유 종목별 매수/보유/매도 신호를 기술적(RSI, MA, 52주) + 가치평가(목표가, 컨센서스, PER) 지표 점수 합산으로 계산해 테이블 뱃지 및 상세 패널로 표시한다.

**Architecture:** yahoo-finance2로 100일 historical + quoteSummary 수집 → 서버에서 6개 지표 점수 계산 → Supabase `sc_signal_cache` 24h TTL 캐시 → `/api/stocks/signal` API → Zustand store → 대시보드 테이블 뱃지 + 종목 상세 패널.

**Tech Stack:** yahoo-finance2 v3 (`yf.chart`, `yf.quoteSummary`), Supabase (sc_signal_cache), Zustand v5, Next.js 16 App Router, shadcn/ui, Jest + SWC

---

## File Map

| 파일 | 작업 | 역할 |
|------|------|------|
| `supabase/migrations/0002_signal_cache.sql` | 신규 | sc_signal_cache 테이블 |
| `src/types/index.ts` | 수정 | SignalIndicators, SignalResult 타입 추가 |
| `src/__tests__/signal-calculator.test.ts` | 신규 | 계산 함수 단위 테스트 |
| `src/lib/signal-calculator.ts` | 신규 | RSI/MA/점수/종합 순수 함수 |
| `src/app/api/stocks/signal/route.ts` | 신규 | GET /api/stocks/signal |
| `src/components/signal/SignalBadge.tsx` | 신규 | 매수/보유/매도 뱃지 |
| `src/components/signal/SignalPanel.tsx` | 신규 | 6개 지표 카드 패널 |
| `src/store/portfolio.ts` | 수정 | signals 상태 + setSignals 추가 |
| `src/app/page.tsx` | 수정 | signal fetch useEffect 추가 |
| `src/components/dashboard/HoldingsTable.tsx` | 수정 | 신호 열 추가 |
| `src/app/holdings/[id]/page.tsx` | 수정 | SignalPanel 추가 |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0002_signal_cache.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/0002_signal_cache.sql
create table sc_signal_cache (
  ticker      text primary key,
  signal      text not null check (signal in ('buy','hold','sell')),
  score       integer not null,
  indicators  jsonb not null,
  updated_at  timestamptz not null default now()
);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: `Applied 1 migration` (or Supabase dashboard에서 수동 실행)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_signal_cache.sql
git commit -m "feat: add sc_signal_cache table migration"
```

---

## Task 2: Type Definitions

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add signal types to end of file**

`src/types/index.ts` 끝에 추가:

```ts
export interface SignalIndicators {
  rsi: { value: number | null; score: number }
  ma: { ma20: number | null; ma50: number | null; ma200: number | null; score: number }
  week52: { high: number | null; low: number | null; score: number }
  targetPrice: { mean: number | null; upside: number | null; score: number }
  consensus: { buy: number; hold: number; sell: number; score: number }
  per: { value: number | null; score: number }
}

export interface SignalResult {
  ticker: string
  signal: 'buy' | 'hold' | 'sell'
  score: number
  indicators: SignalIndicators
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SignalIndicators and SignalResult types"
```

---

## Task 3: Signal Calculator (TDD)

**Files:**
- Create: `src/__tests__/signal-calculator.test.ts`
- Create: `src/lib/signal-calculator.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/signal-calculator.test.ts
import {
  calcMA,
  calcRSI,
  scoreRSI,
  scoreMA,
  scoreWeek52,
  scoreTargetPrice,
  scoreConsensus,
  scorePER,
  buildSignalResult,
} from '@/lib/signal-calculator'

describe('calcMA', () => {
  it('returns null when fewer closes than period', () => {
    expect(calcMA([1, 2, 3], 5)).toBeNull()
  })
  it('returns average of last N closes', () => {
    expect(calcMA([1, 2, 3, 4, 5], 3)).toBeCloseTo(4) // avg of 3,4,5
  })
  it('works when closes.length === period', () => {
    expect(calcMA([10, 20, 30], 3)).toBeCloseTo(20)
  })
})

describe('calcRSI', () => {
  it('returns null when fewer than period+1 closes', () => {
    expect(calcRSI(Array(14).fill(100), 14)).toBeNull()
  })
  it('returns ~100 when all moves are up', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i)
    expect(calcRSI(closes, 14)).toBeGreaterThan(95)
  })
  it('returns ~0 when all moves are down', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 - i)
    expect(calcRSI(closes, 14)).toBeLessThan(5)
  })
})

describe('scoreRSI', () => {
  it('returns 0 for null', () => expect(scoreRSI(null)).toBe(0))
  it('returns +2 for value < 30', () => expect(scoreRSI(25)).toBe(2))
  it('returns +1 for value 30-44', () => expect(scoreRSI(40)).toBe(1))
  it('returns 0 for value 45-55', () => expect(scoreRSI(50)).toBe(0))
  it('returns -1 for value 56-70', () => expect(scoreRSI(65)).toBe(-1))
  it('returns -2 for value > 70', () => expect(scoreRSI(75)).toBe(-2))
})

describe('scoreMA', () => {
  it('returns 0 when ma50 or ma200 is null', () => {
    expect(scoreMA(100, null, 90)).toBe(0)
    expect(scoreMA(100, 95, null)).toBe(0)
  })
  it('returns +2 for golden cross: price > ma50 > ma200', () => {
    expect(scoreMA(110, 105, 100)).toBe(2)
  })
  it('returns +1 for price > ma50 but ma50 < ma200', () => {
    expect(scoreMA(110, 105, 110)).toBe(1)
  })
  it('returns -1 for price < ma50 but ma50 > ma200', () => {
    expect(scoreMA(90, 95, 90)).toBe(-1)
  })
  it('returns -2 for dead cross: price < ma50 < ma200', () => {
    expect(scoreMA(80, 90, 100)).toBe(-2)
  })
})

describe('scoreWeek52', () => {
  it('returns 0 when high or low is null', () => {
    expect(scoreWeek52(100, null, 80)).toBe(0)
    expect(scoreWeek52(100, 120, null)).toBe(0)
  })
  it('returns +1 when current <= low * 1.1', () => {
    expect(scoreWeek52(88, 120, 80)).toBe(1) // 88 <= 80*1.1=88 ✓
  })
  it('returns -1 when current >= high * 0.9', () => {
    expect(scoreWeek52(108, 120, 80)).toBe(-1) // 108 >= 120*0.9=108 ✓
  })
  it('returns 0 in middle range', () => {
    expect(scoreWeek52(100, 120, 80)).toBe(0)
  })
})

describe('scoreTargetPrice', () => {
  it('returns 0 when targetMean is null', () => {
    expect(scoreTargetPrice(100, null)).toBe(0)
  })
  it('returns +2 for upside > 20%', () => {
    expect(scoreTargetPrice(100, 125)).toBe(2)
  })
  it('returns +1 for upside 10-20%', () => {
    expect(scoreTargetPrice(100, 115)).toBe(1)
  })
  it('returns 0 for upside -10% to 10%', () => {
    expect(scoreTargetPrice(100, 105)).toBe(0)
  })
  it('returns -2 for downside > 10%', () => {
    expect(scoreTargetPrice(100, 85)).toBe(-2)
  })
})

describe('scoreConsensus', () => {
  it('returns 0 when total is 0', () => {
    expect(scoreConsensus(0, 0, 0)).toBe(0)
  })
  it('returns -2 when sell > 30%', () => {
    expect(scoreConsensus(3, 3, 4)).toBe(-2) // sell 4/10=40%
  })
  it('returns +2 when buy > 70% (and sell <= 30%)', () => {
    expect(scoreConsensus(8, 2, 0)).toBe(2) // buy 80%
  })
  it('returns +1 when buy 50-70%', () => {
    expect(scoreConsensus(6, 4, 0)).toBe(1) // buy 60%
  })
  it('returns 0 otherwise', () => {
    expect(scoreConsensus(4, 6, 0)).toBe(0) // buy 40%
  })
})

describe('scorePER', () => {
  it('returns 0 for null', () => expect(scorePER(null)).toBe(0))
  it('returns 0 for negative (no earnings)', () => expect(scorePER(-5)).toBe(0))
  it('returns +1 for PER < 10', () => expect(scorePER(8)).toBe(1))
  it('returns 0 for PER 10-40', () => expect(scorePER(20)).toBe(0))
  it('returns -1 for PER > 40', () => expect(scorePER(50)).toBe(-1))
})

describe('buildSignalResult', () => {
  it('returns buy when score >= 4', () => {
    // RSI=25→+2, MA golden→+2, 52w low→+1, target+25%→+2 = +7
    const closes = [
      ...Array.from({ length: 50 }, (_, i) => 120 - i), // downtrend then
      ...Array.from({ length: 50 }, (_, i) => 70 + i * 0.5), // slight recovery
    ]
    const result = buildSignalResult('TEST', closes, {
      high52: 120,
      low52: 70,
      targetMeanPrice: 112,
      currentPrice: closes[closes.length - 1],
      per: 15,
      consensusBuy: 8,
      consensusHold: 2,
      consensusSell: 0,
    })
    expect(['buy', 'hold', 'sell']).toContain(result.signal)
    expect(result.ticker).toBe('TEST')
    expect(result.score).toBe(
      result.indicators.rsi.score +
      result.indicators.ma.score +
      result.indicators.week52.score +
      result.indicators.targetPrice.score +
      result.indicators.consensus.score +
      result.indicators.per.score
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="signal-calculator" --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/signal-calculator'`

- [ ] **Step 3: Implement signal-calculator.ts**

```ts
// src/lib/signal-calculator.ts
import type { SignalIndicators, SignalResult } from '@/types'

export function calcMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

export function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null

  const changes: number[] = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    const c = changes[i]
    if (c > 0) avgGain += c
    else avgLoss += -c
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period; i < changes.length; i++) {
    const c = changes[i]
    avgGain = (avgGain * (period - 1) + (c > 0 ? c : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (c < 0 ? -c : 0)) / period
  }

  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export function scoreRSI(value: number | null): number {
  if (value === null) return 0
  if (value < 30) return 2
  if (value < 45) return 1
  if (value <= 55) return 0
  if (value <= 70) return -1
  return -2
}

export function scoreMA(
  current: number,
  ma50: number | null,
  ma200: number | null
): number {
  if (ma50 === null || ma200 === null) return 0
  if (current > ma50 && ma50 > ma200) return 2
  if (current > ma50 && ma50 <= ma200) return 1
  if (current <= ma50 && ma50 > ma200) return -1
  return -2
}

export function scoreWeek52(
  current: number,
  high: number | null,
  low: number | null
): number {
  if (high === null || low === null) return 0
  if (current <= low * 1.1) return 1
  if (current >= high * 0.9) return -1
  return 0
}

export function scoreTargetPrice(
  current: number,
  targetMean: number | null
): number {
  if (targetMean === null || targetMean <= 0) return 0
  const upside = (targetMean - current) / current
  if (upside > 0.2) return 2
  if (upside > 0.1) return 1
  if (upside >= -0.1) return 0
  return -2
}

export function scoreConsensus(buy: number, hold: number, sell: number): number {
  const total = buy + hold + sell
  if (total === 0) return 0
  const sellPct = sell / total
  const buyPct = buy / total
  if (sellPct > 0.3) return -2
  if (buyPct > 0.7) return 2
  if (buyPct > 0.5) return 1
  return 0
}

export function scorePER(value: number | null): number {
  if (value === null || value <= 0) return 0
  if (value < 10) return 1
  if (value <= 40) return 0
  return -1
}

export function buildSignalResult(
  ticker: string,
  closes: number[],
  params: {
    high52: number | null
    low52: number | null
    targetMeanPrice: number | null
    currentPrice: number
    per: number | null
    consensusBuy: number
    consensusHold: number
    consensusSell: number
  }
): SignalResult {
  const current = closes.length > 0 ? closes[closes.length - 1] : params.currentPrice

  const rsiValue = calcRSI(closes)
  const ma20 = calcMA(closes, 20)
  const ma50 = calcMA(closes, 50)
  const ma200 = calcMA(closes, 200)

  const rsiScore = scoreRSI(rsiValue)
  const maScore = scoreMA(current, ma50, ma200)
  const week52Score = scoreWeek52(current, params.high52, params.low52)
  const targetUpside =
    params.targetMeanPrice !== null && params.targetMeanPrice > 0
      ? (params.targetMeanPrice - current) / current
      : null
  const targetScore = scoreTargetPrice(current, params.targetMeanPrice)
  const consensusScore = scoreConsensus(
    params.consensusBuy,
    params.consensusHold,
    params.consensusSell
  )
  const perScore = scorePER(params.per)

  const score = rsiScore + maScore + week52Score + targetScore + consensusScore + perScore
  const signal: 'buy' | 'hold' | 'sell' =
    score >= 4 ? 'buy' : score <= -4 ? 'sell' : 'hold'

  const indicators: SignalIndicators = {
    rsi: { value: rsiValue, score: rsiScore },
    ma: { ma20, ma50, ma200, score: maScore },
    week52: { high: params.high52, low: params.low52, score: week52Score },
    targetPrice: { mean: params.targetMeanPrice, upside: targetUpside, score: targetScore },
    consensus: {
      buy: params.consensusBuy,
      hold: params.consensusHold,
      sell: params.consensusSell,
      score: consensusScore,
    },
    per: { value: params.per, score: perScore },
  }

  return {
    ticker,
    signal,
    score,
    indicators,
    updatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="signal-calculator" --no-coverage
```

Expected: PASS — 모든 테스트 통과

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/signal-calculator.test.ts src/lib/signal-calculator.ts
git commit -m "feat: add signal calculator with RSI/MA/scoring functions"
```

---

## Task 4: API Route

**Files:**
- Create: `src/app/api/stocks/signal/route.ts`

- [ ] **Step 1: Create route file**

```ts
// src/app/api/stocks/signal/route.ts
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
```

- [ ] **Step 2: Smoke test API**

```bash
curl "http://localhost:3002/api/stocks/signal?ticker=AAPL"
```

Expected: JSON with `signal`, `score`, `indicators` fields (처음 호출은 수 초 소요)

```bash
curl "http://localhost:3002/api/stocks/signal?ticker=005930.KS"
```

Expected: 한국 주식도 동일 구조 반환 (일부 지표 null 가능)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stocks/signal/route.ts
git commit -m "feat: add GET /api/stocks/signal endpoint with 24h cache"
```

---

## Task 5: SignalBadge Component

**Files:**
- Create: `src/components/signal/SignalBadge.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/signal/SignalBadge.tsx
import { cn } from '@/lib/utils'

interface Props {
  signal: 'buy' | 'hold' | 'sell' | null | undefined
  className?: string
}

const CONFIG = {
  buy:  { label: '매수', className: 'bg-green-100 text-green-700 border-green-200' },
  hold: { label: '보유', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  sell: { label: '매도', className: 'bg-blue-100 text-blue-700 border-blue-200' },
} as const

export function SignalBadge({ signal, className }: Props) {
  if (!signal) return null
  const { label, className: colorClass } = CONFIG[signal]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/signal/SignalBadge.tsx
git commit -m "feat: add SignalBadge component"
```

---

## Task 6: SignalPanel Component

**Files:**
- Create: `src/components/signal/SignalPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/signal/SignalPanel.tsx
'use client'

import { useState } from 'react'
import { SignalBadge } from './SignalBadge'
import type { SignalResult } from '@/types'

interface IndicatorCardProps {
  label: string
  score: number
  value: string
  detail: string
}

function IndicatorCard({ label, score, value, detail }: IndicatorCardProps) {
  const scoreColor =
    score > 0 ? 'text-green-600' : score < 0 ? 'text-blue-600' : 'text-gray-500'
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${scoreColor}`}>
          {score > 0 ? `+${score}` : score}
        </span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  )
}

function fmtNum(n: number | null, digits = 1): string {
  if (n === null) return '—'
  return n.toFixed(digits)
}

function fmtPct(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`
}

interface Props {
  ticker: string
  signal: SignalResult | null
  loading: boolean
  onRefresh: () => void
}

export function SignalPanel({ ticker, signal, loading, onRefresh }: Props) {
  const ind = signal?.indicators

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">투자 신호</span>
          {loading ? (
            <span className="text-xs text-muted-foreground">분석 중...</span>
          ) : signal ? (
            <>
              <SignalBadge signal={signal.signal} />
              <span className="text-xs text-muted-foreground">
                종합점수 {signal.score > 0 ? `+${signal.score}` : signal.score} / 12
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">데이터 없음</span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 underline underline-offset-2"
        >
          새로고침
        </button>
      </div>

      {signal && ind && (
        <div className="grid grid-cols-3 gap-2">
          <IndicatorCard
            label="RSI(14)"
            score={ind.rsi.score}
            value={fmtNum(ind.rsi.value)}
            detail={
              ind.rsi.value === null
                ? '데이터 없음'
                : ind.rsi.value < 30
                ? '과매도'
                : ind.rsi.value > 70
                ? '과매수'
                : '중립'
            }
          />
          <IndicatorCard
            label="이동평균"
            score={ind.ma.score}
            value={
              ind.ma.score === 2
                ? '골든크로스'
                : ind.ma.score === -2
                ? '데드크로스'
                : ind.ma.score === 1
                ? '상승세'
                : ind.ma.score === -1
                ? '하락세'
                : '중립'
            }
            detail={`MA50: ${fmtNum(ind.ma.ma50, 0)} / MA200: ${fmtNum(ind.ma.ma200, 0)}`}
          />
          <IndicatorCard
            label="52주 위치"
            score={ind.week52.score}
            value={
              ind.week52.score === 1
                ? '저점 근처'
                : ind.week52.score === -1
                ? '고점 근처'
                : '중간'
            }
            detail={`고: ${fmtNum(ind.week52.high, 0)} / 저: ${fmtNum(ind.week52.low, 0)}`}
          />
          <IndicatorCard
            label="목표주가"
            score={ind.targetPrice.score}
            value={fmtPct(ind.targetPrice.upside)}
            detail={
              ind.targetPrice.mean !== null
                ? `평균 ${fmtNum(ind.targetPrice.mean, 0)}`
                : '데이터 없음'
            }
          />
          <IndicatorCard
            label="컨센서스"
            score={ind.consensus.score}
            value={(() => {
              const total = ind.consensus.buy + ind.consensus.hold + ind.consensus.sell
              if (total === 0) return '—'
              return `매수 ${Math.round((ind.consensus.buy / total) * 100)}%`
            })()}
            detail={`매수 ${ind.consensus.buy} / 보유 ${ind.consensus.hold} / 매도 ${ind.consensus.sell}`}
          />
          <IndicatorCard
            label="PER"
            score={ind.per.score}
            value={ind.per.value !== null ? `${fmtNum(ind.per.value)}x` : '—'}
            detail={
              ind.per.value === null
                ? '데이터 없음'
                : ind.per.value < 10
                ? '저평가'
                : ind.per.value > 40
                ? '고평가'
                : '적정'
            }
          />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        ⚠️ 투자 판단 참고용 정보입니다. 투자 책임은 본인에게 있습니다.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/signal/SignalPanel.tsx
git commit -m "feat: add SignalPanel component with 6 indicator cards"
```

---

## Task 7: Zustand Store — Signals 상태 추가

**Files:**
- Modify: `src/store/portfolio.ts`

- [ ] **Step 1: Add signals state and setSignals action**

`src/store/portfolio.ts`에서 import 추가 및 인터페이스/초기값/액션 수정:

```ts
// 상단 import에 추가
import type { Portfolio, Holding, HoldingWithPrice, QuoteMap, SignalResult } from '@/types'
```

`PortfolioStore` 인터페이스에 추가:
```ts
  signals: Record<string, SignalResult | null>
  setSignals: (signals: Record<string, SignalResult | null>) => void
```

초기값에 추가:
```ts
      signals: {},
```

액션에 추가:
```ts
      setSignals: (signals) => set({ signals }),
```

`partialize`는 수정 불필요 — signals는 localStorage에 저장 안 함.

- [ ] **Step 2: Commit**

```bash
git add src/store/portfolio.ts
git commit -m "feat: add signals state to portfolio store"
```

---

## Task 8: Dashboard — Signal Fetch 추가

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add signal fetching to dashboard**

`src/app/page.tsx` 수정:

```tsx
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
import type { QuoteMap, SignalResult } from '@/types'

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
          <PortfolioLineChart summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: fetch signals in parallel on dashboard mount"
```

---

## Task 9: HoldingsTable — 신호 열 추가

**Files:**
- Modify: `src/components/dashboard/HoldingsTable.tsx`

- [ ] **Step 1: Add signals prop and signal column**

```tsx
// src/components/dashboard/HoldingsTable.tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { SignalBadge } from '@/components/signal/SignalBadge'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { HoldingWithPrice, SignalResult } from '@/types'

interface Props {
  holdings: HoldingWithPrice[]
  signals: Record<string, SignalResult | null>
  onDelete: (id: string) => void
}

function pnlClass(n: number) {
  if (n > 0) return 'text-red-500 font-semibold'
  if (n < 0) return 'text-blue-500 font-semibold'
  return 'text-gray-500'
}

function fmtPrice(n: number | null, currency: string) {
  if (n === null) return '—'
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function HoldingsTable({ holdings, signals, onDelete }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        보유 종목이 없습니다.{' '}
        <Link href="/holdings/new" className="text-primary underline">
          종목 추가
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">평균단가</TableHead>
            <TableHead className="text-right">현재가</TableHead>
            <TableHead className="text-right">평가금액</TableHead>
            <TableHead className="text-right">손익</TableHead>
            <TableHead className="text-right">수익률</TableHead>
            <TableHead className="text-center">신호</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const sig = signals[h.ticker]
            const sigLoading = !(h.ticker in signals)
            return (
              <TableRow key={h.id}>
                <TableCell>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.ticker}{' '}
                    <Badge variant="outline" className="text-[10px]">
                      {h.market}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">{h.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">{fmtPrice(h.avg_price, h.currency)}</TableCell>
                <TableCell className="text-right">
                  {h.currentPrice === null ? (
                    <span className="text-muted-foreground text-xs">조회 중</span>
                  ) : (
                    fmtPrice(h.currentPrice, h.currency)
                  )}
                </TableCell>
                <TableCell className="text-right">{fmtPrice(h.marketValue, h.currency)}</TableCell>
                <TableCell className={`text-right ${pnlClass(h.pnl)}`}>
                  {h.pnl >= 0 ? '+' : ''}
                  {fmtPrice(h.pnl, h.currency)}
                </TableCell>
                <TableCell className={`text-right ${pnlClass(h.pnlPct)}`}>
                  {h.pnlPct >= 0 ? '+' : ''}
                  {h.pnlPct.toFixed(2)}%
                </TableCell>
                <TableCell className="text-center">
                  {sigLoading ? (
                    <span className="text-muted-foreground text-xs">분석 중</span>
                  ) : sig ? (
                    <SignalBadge signal={sig.signal} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link
                      href={`/holdings/${h.id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                    >
                      수정
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDelete(h.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/HoldingsTable.tsx
git commit -m "feat: add signal badge column to holdings table"
```

---

## Task 10: Holdings Detail Page — SignalPanel 추가

**Files:**
- Modify: `src/app/holdings/[id]/page.tsx`

- [ ] **Step 1: Update detail page**

```tsx
// src/app/holdings/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { HoldingForm } from '@/components/holdings/HoldingForm'
import { AdditionalBuyCalc } from '@/components/calculator/AdditionalBuyCalc'
import { SignalPanel } from '@/components/signal/SignalPanel'
import { usePortfolioStore } from '@/store/portfolio'
import type { Holding, SignalResult } from '@/types'

export default function EditHoldingPage() {
  const { id } = useParams<{ id: string }>()
  const { holdingsWithPrice, updateHolding } = usePortfolioStore()
  const holding = holdingsWithPrice.find((h) => h.id === id)

  const [signal, setSignal] = useState<SignalResult | null>(null)
  const [signalLoading, setSignalLoading] = useState(false)

  const fetchSignal = useCallback(
    async (forceRefresh = false) => {
      if (!holding) return
      setSignalLoading(true)
      try {
        const url = `/api/stocks/signal?ticker=${encodeURIComponent(holding.ticker)}${forceRefresh ? '&refresh=true' : ''}`
        const res = await fetch(url)
        const data = await res.json()
        setSignal('signal' in data ? data : null)
      } catch {
        setSignal(null)
      } finally {
        setSignalLoading(false)
      }
    },
    [holding]
  )

  useEffect(() => {
    fetchSignal()
  }, [fetchSignal])

  async function handleSave(data: Omit<Holding, 'id' | 'created_at'>) {
    const res = await fetch(`/api/holdings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    updateHolding(updated)
  }

  if (!holding) {
    return <p className="text-muted-foreground">종목을 찾을 수 없습니다.</p>
  }

  return (
    <div className="space-y-10">
      <SignalPanel
        ticker={holding.ticker}
        signal={signal}
        loading={signalLoading}
        onRefresh={() => fetchSignal(true)}
      />

      <div>
        <h1 className="text-2xl font-bold mb-6">{holding.name} 수정</h1>
        <HoldingForm
          portfolioId={holding.portfolio_id}
          initial={holding}
          onSave={handleSave}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">추가매수 계산기</h2>
        <AdditionalBuyCalc
          existingQuantity={holding.quantity}
          existingAvgPrice={holding.avg_price}
          currentPrice={holding.currentPrice ?? 0}
          currency={holding.currency}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/holdings/[id]/page.tsx
git commit -m "feat: add SignalPanel to holding detail page"
```

---

## Task 11: Full Integration Test

- [ ] **Step 1: Run all tests**

```bash
npm test --no-coverage
```

Expected: 모든 기존 테스트 + signal-calculator 테스트 PASS

- [ ] **Step 2: Browser verification**

1. `http://localhost:3002` 접속
2. 보유 종목 테이블에 "신호" 열 확인 — "분석 중" → 뱃지 표시로 전환
3. 종목 "수정" 클릭 → 상세 페이지 상단에 SignalPanel 확인
4. 6개 지표 카드 + 종합 점수 + 새로고침 버튼 확인
5. 새로고침 버튼 클릭 → `refresh=true` 호출로 재계산 확인

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 signal feature"
```
