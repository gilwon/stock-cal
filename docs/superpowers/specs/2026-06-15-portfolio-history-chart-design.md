# Portfolio History Chart Design — Phase 3

**Date:** 2026-06-15
**Status:** Approved

## Overview

대시보드 "평가" 탭에 90일 포트폴리오 히스토리 라인 차트 추가. 평가금액(실선)과 매입금액(점선) 두 라인으로 손익 갭을 시각화한다.

## Scope

- 신규 API: `GET /api/portfolio/history`
- 기존 `PortfolioLineChart` placeholder → 실제 차트로 교체
- DB 테이블 추가 없음 (yahoo-finance2 실시간 재계산)

---

## Data Layer

### API: `GET /api/portfolio/history?portfolioId=XXX`

**동작:**
1. Supabase에서 해당 `portfolioId`의 보유 종목(`sc_holdings`) 조회
2. 각 종목 `yf.chart(ticker, { period1: 90일전, interval: '1d' })` 병렬 fetch
3. 날짜별 합산 계산:
   - `marketValue = sum(holding.quantity × price_on_date)`
   - `costBasis = sum(holding.quantity × holding.avg_price)` (고정값 — 날짜와 무관)
4. KR/US 혼재 포트폴리오 대응: 모든 종목 날짜 union, 빠진 날짜는 직전 유효가(forward-fill)
5. 응답: `HistoryPoint[]` 배열 (날짜 오름차순)

**응답 타입:**
```ts
interface HistoryPoint {
  date: string        // 'YYYY-MM-DD'
  marketValue: number
  costBasis: number
}
```

**에러:**
- `portfolioId` 누락 → 400
- 보유 종목 없음 → `[]` 빈 배열 반환
- 특정 종목 fetch 실패 → 해당 종목 0으로 처리 (전체 실패 방지)

### 날짜 정렬 로직

```
allDates = union(각 종목 날짜 배열)를 오름차순 정렬
각 날짜 d에 대해:
  각 종목별 lastKnownPrice[ticker] 유지 (forward-fill)
  marketValue = sum(holding.quantity × lastKnownPrice[ticker] ?? 0)
  costBasis = sum(holding.quantity × holding.avg_price)
```

---

## Type Definitions

`src/types/index.ts` 추가:

```ts
export interface HistoryPoint {
  date: string
  marketValue: number
  costBasis: number
}
```

---

## UI

### PortfolioLineChart

**파일:** `src/components/charts/PortfolioLineChart.tsx` (수정)

recharts `LineChart` + 두 `Line`:

| 라인 | 데이터 | 색상 | 스타일 |
|------|--------|------|--------|
| 평가금액 | `marketValue` | `#6366f1` (indigo) | 실선 |
| 매입금액 | `costBasis` | `#9ca3af` (gray-400) | 점선 (`strokeDasharray="4 4"`) |

**상태별 표시:**
- 로딩: `분석 중...` (muted text, 기존 signal 패턴)
- 빈 데이터: `데이터 없음`
- 정상: recharts `LineChart`

**축 포맷:**
- X축: `MM/DD` (날짜, 15개 간격으로 틱)
- Y축: `n.toLocaleString('ko-KR')` (한국 숫자 포맷)
- Tooltip: 평가금액 / 매입금액 레이블 + 포맷

### 대시보드 연동

`src/app/page.tsx` 수정:
- "평가" 탭에서 `PortfolioLineChart`에 `portfolioId` + `history` props 전달
- `useEffect`로 탭 마운트 시 `/api/portfolio/history?portfolioId=XXX` fetch
- 로딩 상태 관리: `historyLoading` state

---

## File Map

| 파일 | 작업 | 역할 |
|------|------|------|
| `src/types/index.ts` | 수정 | `HistoryPoint` 타입 추가 |
| `src/app/api/portfolio/history/route.ts` | 신규 | GET /api/portfolio/history |
| `src/components/charts/PortfolioLineChart.tsx` | 수정 | placeholder → 실제 차트 |
| `src/app/page.tsx` | 수정 | history fetch + props 전달 |

---

## 제약

- 현재 보유 수량 기준 과거 계산 (매수/매도 이력 미반영) — 단순화
- yahoo-finance2 종목당 ~1초, 병렬 처리로 전체 2~5초 예상
- KR 주식 일부 날짜 누락 가능 → forward-fill로 처리
