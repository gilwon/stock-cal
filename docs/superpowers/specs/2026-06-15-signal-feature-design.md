# Signal Feature Design — Phase 2

**Date:** 2026-06-15  
**Status:** Approved

## Overview

매수/보유/매도 Signal 기능. 보유 종목별로 기술적 + 가치평가 지표를 종합해 투자 참고 신호를 제공한다.

## Scope

- 대시보드 보유 종목 테이블에 종합 Signal 뱃지 추가
- 종목 상세 페이지(`/holdings/[id]`)에 지표별 상세 패널 추가
- 신규 API 엔드포인트: `GET /api/stocks/signal`
- 신규 DB 테이블: `sc_signal_cache` (24h TTL)

---

## Data Layer

### 데이터 소스

| 소스 | 메서드 | 용도 |
|------|--------|------|
| yahoo-finance2 | `yf.chart(ticker, { period1: '100daysAgo', interval: '1d' })` | 100일 종가 → RSI, MA 계산 |
| yahoo-finance2 | `yf.quoteSummary(ticker, { modules: ['financialData','summaryDetail','recommendationTrend'] })` | P/E, PBR, 목표주가, 애널리스트 컨센서스 |

### 캐시

- Supabase `sc_signal_cache` 테이블, TTL 24시간
- `refresh=true` 쿼리파람으로 강제 재계산 가능
- 가격 캐시(`sc_price_cache` 5분)와 별도 운영

---

## Signal 계산

### 지표 및 점수 (각 -2 ~ +2, 총 -12 ~ +12)

#### 기술적 지표

**RSI(14)**
| 조건 | 점수 |
|------|------|
| < 30 (과매도) | +2 |
| 30 ~ 45 | +1 |
| 45 ~ 55 | 0 |
| 55 ~ 70 | -1 |
| > 70 (과매수) | -2 |

**이동평균 크로스 (MA20/50/200)**
| 조건 | 점수 |
|------|------|
| 현재가 > MA50 > MA200 (골든크로스) | +2 |
| 현재가 > MA50, MA50 < MA200 | +1 |
| 현재가 < MA50, MA50 > MA200 | -1 |
| 현재가 < MA50 < MA200 (데드크로스) | -2 |

**52주 가격 위치**
| 조건 | 점수 |
|------|------|
| 52주 저점 대비 +10% 이내 | +1 |
| 52주 고점 대비 -10% 이내 | -1 |
| 그 외 | 0 |

#### 가치평가 지표

**애널리스트 목표주가 상승여력**
| 조건 | 점수 |
|------|------|
| > 20% | +2 |
| 10 ~ 20% | +1 |
| -10 ~ 10% | 0 |
| < -10% | -2 |

**애널리스트 컨센서스** (위에서부터 매칭, 첫 조건 적용)
| 조건 | 점수 |
|------|------|
| sell 비중 > 30% | -2 |
| strongBuy + buy 비중 > 70% | +2 |
| strongBuy + buy 비중 50 ~ 70% | +1 |
| 그 외 (hold 과반 등) | 0 |

**PER (주가수익비율)**
| 조건 | 점수 |
|------|------|
| < 10 | +1 |
| 10 ~ 40 | 0 |
| > 40 | -1 |

### 종합 판단

| 합산 점수 | 신호 |
|-----------|------|
| ≥ +4 | 매수 (buy) |
| -3 ~ +3 | 보유 (hold) |
| ≤ -4 | 매도 (sell) |

데이터 미제공 지표(KR주식 일부 펀더멘털 등)는 0점 처리 후 UI에서 "데이터 없음" 표시.

---

## API

### `GET /api/stocks/signal`

**Query params:**
- `ticker` (required): Yahoo Finance 티커 (e.g., `005930.KS`, `AAPL`)
- `refresh` (optional): `true`이면 캐시 무시하고 재계산

**Response:**
```ts
{
  ticker: string
  signal: 'buy' | 'hold' | 'sell'
  score: number
  indicators: {
    rsi:         { value: number | null, score: number }
    ma:          { ma20: number | null, ma50: number | null, ma200: number | null, score: number }
    week52:      { high: number | null, low: number | null, score: number }
    targetPrice: { mean: number | null, upside: number | null, score: number }
    consensus:   { buy: number, hold: number, sell: number, score: number }
    per:         { value: number | null, score: number }
  }
  updatedAt: string
}
```

**에러:** 티커 조회 실패 시 `{ error: string }` 반환.

---

## DB Schema

```sql
create table sc_signal_cache (
  ticker      text primary key,
  signal      text not null check (signal in ('buy','hold','sell')),
  score       integer not null,
  indicators  jsonb not null,
  updated_at  timestamptz not null default now()
);
```

RLS 불필요 (sc_price_cache와 동일하게 public read/write).

Migration 파일: `supabase/migrations/0002_signal_cache.sql`

---

## UI

### 대시보드 HoldingsTable

- 기존 "현재가" 열 우측에 "신호" 열 추가
- Signal fetch는 가격 fetch와 병렬 실행 (페이지 마운트 시)
- 상태별 표시:
  - 로딩: `분석 중...` (muted text)
  - 데이터 없음: `—`
  - 결과: `🟢 매수` / `🟡 보유` / `🔴 매도` badge

### 종목 상세 페이지 (`/holdings/[id]`)

기존 편집 폼 상단에 Signal 패널 추가:

```
┌─────────────────────────────────────────┐
│  🟢 매수   종합점수 +6 / 12   [새로고침] │
├──────────┬──────────┬────────────────────┤
│ RSI  +2  │ MA  +2   │ 52주 위치  +1      │
│ 22.4     │ 골든크로스│ 저점 근처          │
├──────────┼──────────┼────────────────────┤
│ 목표가+2  │ 컨센서스+1│ PER  0            │
│ 상승 28% │ 매수 62% │ 18.3x             │
└──────────┴──────────┴────────────────────┘
⚠️ 투자 판단 참고용. 투자 책임은 본인에게 있습니다.
```

- 상세 페이지 진입 시 signal fetch 트리거
- `새로고침` 버튼 → `refresh=true`로 재호출
- 6개 지표 카드 (2×3 그리드), 각 카드에 점수 + 원시값 표시

---

## 파일 구조 (신규/수정)

```
supabase/migrations/
  0002_signal_cache.sql           # 신규

src/
  lib/
    signal-calculator.ts          # 신규: RSI/MA/점수 계산 순수 함수
  app/api/stocks/signal/
    route.ts                      # 신규: GET /api/stocks/signal
  components/signal/
    SignalBadge.tsx                # 신규: 뱃지 컴포넌트
    SignalPanel.tsx                # 신규: 상세 패널 (6개 지표 카드)
  app/holdings/[id]/
    page.tsx                      # 수정: SignalPanel 추가
  components/dashboard/
    HoldingsTable.tsx             # 수정: 신호 열 추가
```

---

## 제약 및 면책

- 투자 판단 참고용 정보. 투자 책임은 본인에게 있음 (DisclaimerFooter 활용)
- KR 주식 일부 펀더멘털 데이터 Yahoo Finance 미제공 가능 → 0점 처리
- Historical fetch 종목당 ~100개 데이터포인트 (캐시로 부담 최소화)
