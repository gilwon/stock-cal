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
