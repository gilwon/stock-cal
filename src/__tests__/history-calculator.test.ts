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
        B: [{ date: '2026-01-01', close: 200 }],
      }
    )
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

  it('ticker with no price data returns empty', () => {
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
    expect(result[0].marketValue).toBe(2 * 150 + 3 * 250)
    expect(result[0].costBasis).toBe(2 * 100 + 3 * 200)
  })
})
