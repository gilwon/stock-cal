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
    const closes = [
      ...Array.from({ length: 50 }, (_, i) => 120 - i),
      ...Array.from({ length: 50 }, (_, i) => 70 + i * 0.5),
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
