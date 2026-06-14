import type {
  Holding,
  HoldingWithPrice,
  AdditionalBuyInput,
  AdditionalBuyResult,
  PortfolioSummary,
} from '@/types'

export function calcHoldingWithPrice(
  holding: Holding,
  currentPrice: number | null
): HoldingWithPrice {
  const costBasis = holding.quantity * holding.avg_price
  const marketValue = currentPrice !== null ? holding.quantity * currentPrice : 0
  const pnl = currentPrice !== null ? marketValue - costBasis : 0
  const pnlPct = costBasis > 0 && currentPrice !== null ? (pnl / costBasis) * 100 : 0
  return { ...holding, currentPrice, marketValue, costBasis, pnl, pnlPct }
}

export function calcPortfolioSummary(holdings: HoldingWithPrice[]): PortfolioSummary {
  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0)
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const totalPnl = totalMarketValue - totalCostBasis
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0
  return { totalMarketValue, totalCostBasis, totalPnl, totalPnlPct }
}

export function calcAdditionalBuy(input: AdditionalBuyInput): AdditionalBuyResult {
  const { existingQuantity, existingAvgPrice, additionalQuantity, additionalPrice, currentPrice } =
    input
  const existingCost = existingQuantity * existingAvgPrice
  const additionalCost = additionalQuantity * additionalPrice
  const newTotalQuantity = existingQuantity + additionalQuantity
  const newTotalCost = existingCost + additionalCost
  const newAvgPrice = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0
  const estimatedPnl = (currentPrice - newAvgPrice) * newTotalQuantity
  const estimatedPnlPct = newTotalCost > 0 ? (estimatedPnl / newTotalCost) * 100 : 0
  return {
    additionalCost,
    newTotalQuantity,
    newTotalCost,
    newAvgPrice,
    estimatedPnl,
    estimatedPnlPct,
    breakEvenPrice: newAvgPrice,
  }
}

export function targetPrice(newAvgPrice: number, targetPct: number): number {
  return newAvgPrice * (1 + targetPct / 100)
}
