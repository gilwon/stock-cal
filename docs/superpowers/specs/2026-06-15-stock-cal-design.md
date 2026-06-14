# Stock Cal — MVP Design Spec
Date: 2026-06-15
Phase: 1 (MVP)

---

## 1. 목표

개인 주식 포트폴리오의 손익·평균단가·추가매수 시나리오를 계산하고 시각화하는 웹앱.

---

## 2. 아키텍처

```
[브라우저] React (Next.js App Router)
    ↓
[Next.js API Routes]
    ├── /api/stocks/quote   → yahoo-finance2 → 현재가 (5분 캐시)
    ├── /api/stocks/search  → yahoo-finance2 → 종목 검색
    └── /api/portfolio/*    → Supabase → CRUD
[Supabase]
    ├── Auth (선택적 — 게스트 가능)
    └── PostgreSQL DB
[Vercel] 배포
```

**게스트 모드**: 비로그인 → `localStorage['sc_data']` 저장. 로그인 시 Supabase로 마이그레이션.

**지원 시장**
- 한국: KOSPI `.KS` / KOSDAQ `.KQ` 접미사 (예: `005930.KS`)
- 미국: 그대로 (예: `AAPL`, `TSLA`)

---

## 3. 데이터 모델

```sql
sc_portfolios
  id            uuid PK default gen_random_uuid()
  user_id       uuid FK → auth.users (nullable)
  name          text
  base_currency text        -- 'KRW' | 'USD'
  created_at    timestamptz default now()

sc_holdings
  id            uuid PK default gen_random_uuid()
  portfolio_id  uuid FK → sc_portfolios
  ticker        text        -- '005930.KS', 'AAPL'
  name          text        -- '삼성전자', 'Apple Inc.'
  market        text        -- 'KR' | 'US'
  quantity      numeric
  avg_price     numeric
  currency      text        -- 'KRW' | 'USD'
  created_at    timestamptz default now()

sc_price_cache
  ticker        text PK
  price         numeric
  updated_at    timestamptz default now()
```

**프론트 파생 타입 (Zustand)**

```ts
interface HoldingWithPrice extends Holding {
  currentPrice: number | null
  marketValue: number    // quantity × currentPrice
  costBasis: number      // quantity × avg_price
  pnl: number            // marketValue - costBasis
  pnlPct: number         // pnl / costBasis × 100
}
```

---

## 4. 화면 구성

### 4-1. Dashboard (`/`)
- 요약 카드 3개: 총 평가금액 | 총 손익 | 총 수익률
- 보유종목 테이블: 종목명 | 수량 | 평균단가 | 현재가 | 평가금액 | 손익 | 수익률 | 액션
- 차트 그리드:
  - 파이차트 (종목별 비중)
  - 손익 막대그래프 (종목별)
  - 수익률 순위 바차트
  - 전체 포트폴리오 라인차트 (향후 히스토리 추가 시)

### 4-2. 종목 추가 (`/holdings/new`)
- 티커 검색 (자동완성)
- 시장 선택 (KR / US)
- 수량, 평균매수가, 통화 입력

### 4-3. 종목 수정 + 계산기 (`/holdings/[id]`)
- 보유 정보 수정
- 추가매수 계산기 내장

### 4-4. 독립 계산기 (`/calculator`)
- 종목 선택 후 시뮬레이션

---

## 5. 색상 규칙 (한국 주식 컨벤션)

| 상태 | 색상 | Tailwind | Recharts |
|------|------|----------|----------|
| 수익 (상승) | 빨강 | `text-red-500` / `bg-red-50` | `#ef4444` |
| 손실 (하락) | 파랑 | `text-blue-500` / `bg-blue-50` | `#3b82f6` |
| 보합 | 회색 | `text-gray-500` | `#6b7280` |

---

## 6. API 구조

```
GET  /api/stocks/quote?tickers=005930.KS,AAPL
→ {
    "005930.KS": { price: 71200, currency: "KRW", name: "삼성전자" },
    "AAPL":      { price: 189.5, currency: "USD", name: "Apple Inc." }
  }

GET  /api/stocks/search?q=삼성&market=KR
→ [{ ticker: "005930.KS", name: "삼성전자", market: "KR" }]

GET    /api/portfolio
POST   /api/portfolio
PUT    /api/portfolio/[id]
DELETE /api/portfolio/[id]

GET    /api/holdings?portfolioId=xxx
POST   /api/holdings
PUT    /api/holdings/[id]
DELETE /api/holdings/[id]
```

**캐시**: `sc_price_cache` 5분 TTL. 만료 시 yahoo-finance2 재조회 후 갱신.

---

## 7. 계산 로직

```
총 매입금액   = quantity × avg_price
현재 평가금액 = quantity × currentPrice
평가손익      = 평가금액 - 매입금액
수익률(%)     = 평가손익 / 매입금액 × 100

-- 추가매수 계산기
새로운 총 수량   = 기존수량 + 추가수량
새로운 총 매입   = (기존수량 × 기존평균단가) + (추가수량 × 추가가격)
새로운 평균단가  = 새로운 총 매입 / 새로운 총 수량
예상 손익        = (현재가 - 새로운 평균단가) × 새로운 총 수량
예상 수익률(%)   = 예상 손익 / 새로운 총 매입 × 100
목표가 (N% 달성) = 새로운 평균단가 × (1 + N/100)
```

---

## 8. 폴더 구조

```
stock_cal/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── holdings/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── calculator/page.tsx
│   │   └── api/
│   │       ├── stocks/
│   │       │   ├── quote/route.ts
│   │       │   └── search/route.ts
│   │       ├── portfolio/route.ts
│   │       └── holdings/
│   │           ├── route.ts
│   │           └── [id]/route.ts
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   └── HoldingsTable.tsx
│   │   ├── charts/
│   │   │   ├── AllocationPieChart.tsx
│   │   │   ├── PnlBarChart.tsx
│   │   │   ├── RankBarChart.tsx
│   │   │   └── PortfolioLineChart.tsx
│   │   ├── calculator/
│   │   │   └── AdditionalBuyCalc.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── yahoo-finance.ts
│   │   ├── calculations.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   ├── store/
│   │   └── portfolio.ts
│   └── types/
│       └── index.ts
├── .env.local.example
└── package.json
```

---

## 9. 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 14+ (App Router) |
| 스타일 | Tailwind CSS + shadcn/ui |
| 차트 | Recharts |
| 상태관리 | Zustand |
| DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (선택적) |
| 주가 API | yahoo-finance2 (Node.js) |
| 배포 | Vercel |

---

## 10. Phase 2 (비MVP)

- 매수/보유/매도 검토 신호 (기술적 지표 + 밸류에이션)
- 뉴스 감성 분석
- 포트폴리오 히스토리 (날짜별 스냅샷)
- 환율 자동 변환
- 다중 포트폴리오

---

## 11. 면책 문구 (필수)

> "이 앱의 분석은 투자 참고용이며, 최종 투자 판단은 사용자의 책임입니다."

모든 계산 결과 화면 하단에 고정 표시.
