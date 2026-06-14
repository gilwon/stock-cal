import {
  calcHoldingWithPrice,
  calcPortfolioSummary,
  calcAdditionalBuy,
  targetPrice,
} from '@/lib/calculations'
import type { Holding } from '@/types'

const baseHolding: Holding = {
  id: '1',
  portfolio_id: 'p1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  market: 'US',
  quantity: 10,
  avg_price: 100,
  currency: 'USD',
  created_at: '2024-01-01T00:00:00Z',
}

describe('calcHoldingWithPrice', () => {
  it('computes profit when price rises', () => {
    const result = calcHoldingWithPrice(baseHolding, 120)
    expect(result.costBasis).toBe(1000)
    expect(result.marketValue).toBe(1200)
    expect(result.pnl).toBe(200)
    expect(result.pnlPct).toBeCloseTo(20)
  })

  it('computes loss when price falls', () => {
    const result = calcHoldingWithPrice(baseHolding, 80)
    expect(result.pnl).toBe(-200)
    expect(result.pnlPct).toBeCloseTo(-20)
  })

  it('handles null currentPrice', () => {
    const result = calcHoldingWithPrice(baseHolding, null)
    expect(result.currentPrice).toBeNull()
    expect(result.marketValue).toBe(0)
    expect(result.pnl).toBe(0)
    expect(result.pnlPct).toBe(0)
  })
})

describe('calcPortfolioSummary', () => {
  it('sums across multiple holdings', () => {
    const h1 = calcHoldingWithPrice(baseHolding, 120)
    const h2 = calcHoldingWithPrice(
      { ...baseHolding, id: '2', quantity: 5, avg_price: 200 },
      180
    )
    const result = calcPortfolioSummary([h1, h2])
    expect(result.totalMarketValue).toBe(1200 + 900)
    expect(result.totalCostBasis).toBe(1000 + 1000)
    expect(result.totalPnl).toBe(100)
    expect(result.totalPnlPct).toBeCloseTo(5)
  })

  it('returns zeros for empty array', () => {
    const result = calcPortfolioSummary([])
    expect(result.totalMarketValue).toBe(0)
    expect(result.totalPnlPct).toBe(0)
  })
})

describe('calcAdditionalBuy', () => {
  it('calculates new average price after additional purchase', () => {
    const result = calcAdditionalBuy({
      existingQuantity: 100,
      existingAvgPrice: 70000,
      additionalQuantity: 50,
      additionalPrice: 64000,
      currentPrice: 67000,
    })
    expect(result.newAvgPrice).toBeCloseTo(68000)
    expect(result.newTotalQuantity).toBe(150)
    expect(result.newTotalCost).toBe(10200000)
    expect(result.additionalCost).toBe(3200000)
    expect(result.breakEvenPrice).toBeCloseTo(68000)
  })

  it('computes estimated pnl based on current price', () => {
    const result = calcAdditionalBuy({
      existingQuantity: 100,
      existingAvgPrice: 70000,
      additionalQuantity: 50,
      additionalPrice: 64000,
      currentPrice: 70000,
    })
    expect(result.estimatedPnl).toBeCloseTo(300000)
  })
})

describe('targetPrice', () => {
  it('computes price to achieve target % return from avg price', () => {
    expect(targetPrice(68000, 10)).toBeCloseTo(74800)
    expect(targetPrice(68000, 0)).toBe(68000)
    expect(targetPrice(68000, -10)).toBeCloseTo(61200)
  })
})
