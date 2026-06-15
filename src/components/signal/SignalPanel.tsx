'use client'

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

export function SignalPanel({ ticker: _ticker, signal, loading, onRefresh }: Props) {
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
