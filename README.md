# 📈 Stock Cal — 주식 포트폴리오 계산기

보유 종목 손익 계산, 추가매수 시뮬레이션, 매수/보유/매도 신호 분석을 제공하는 개인 투자 도구.

## 주요 기능

- **포트폴리오 대시보드** — 보유 종목 현재가·손익·수익률 실시간 조회
- **매수/보유/매도 신호** — RSI, 이동평균, 52주 위치, 목표주가, 컨센서스, PER 6개 지표 종합 분석
- **90일 평가금액 차트** — 평가금액 vs 매입금액 히스토리 라인 차트
- **추가매수 계산기** — 새 평균단가·손익분기점·목표가 시뮬레이션
- **한글 종목 검색** — 삼성전자, LG전자 등 한글로 국내 주식 검색 (Naver Finance 연동)
- **비중·손익·순위 차트** — 포트폴리오 구성 시각화

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4, shadcn/ui |
| 상태 관리 | Zustand v5 |
| DB / Auth | Supabase (PostgreSQL + RLS) |
| 시세 데이터 | yahoo-finance2 v3 |
| 차트 | Recharts |
| 폰트 | Paperozi (Paperlogy) |
| 테스트 | Jest + SWC |

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 (포트 변경 시 `package.json`의 `dev` 스크립트 확인)

### 환경 변수

`.env.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### DB 마이그레이션

```bash
npx supabase db push
```

또는 Supabase 대시보드에서 `supabase/migrations/` 파일 순서대로 실행.

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── holdings/          # CRUD API
│   │   ├── portfolio/
│   │   │   └── history/       # 90일 평가금액 히스토리
│   │   └── stocks/
│   │       ├── quote/         # 현재가 조회
│   │       ├── search/        # 종목 검색
│   │       └── signal/        # 매수/보유/매도 신호 (24h 캐시)
│   ├── calculator/            # 독립 추가매수 계산기
│   ├── holdings/
│   │   ├── [id]/              # 종목 수정 + SignalPanel
│   │   └── new/               # 종목 추가
│   └── page.tsx               # 대시보드
├── components/
│   ├── calculator/            # AdditionalBuyCalc
│   ├── charts/                # Pie, Bar, Line 차트
│   ├── dashboard/             # SummaryCards, HoldingsTable
│   ├── holdings/              # HoldingForm
│   └── signal/                # SignalBadge, SignalPanel
├── lib/
│   ├── calculations.ts        # 손익 계산 순수 함수
│   ├── history-calculator.ts  # 히스토리 날짜 병합/forward-fill
│   ├── signal-calculator.ts   # RSI/MA/지표 점수 계산
│   └── yahoo-finance.ts       # 시세·검색 (Naver 폴백)
├── store/
│   └── portfolio.ts           # Zustand 포트폴리오 스토어
└── types/
    └── index.ts               # 공통 타입 정의
```

## 테스트

```bash
npm test
```

## 면책 조항

이 서비스의 신호 및 분석 정보는 투자 판단 참고용입니다. 투자 책임은 본인에게 있습니다.
