export type Market = 'KR' | 'US'
export type Currency = 'KRW' | 'USD'

export interface Portfolio {
  id: string
  user_id: string | null
  name: string
  base_currency: Currency
  created_at: string
}

export interface Holding {
  id: string
  portfolio_id: string
  ticker: string
  name: string
  market: Market
  quantity: number
  avg_price: number
  currency: Currency
  created_at: string
}

export interface HoldingWithPrice extends Holding {
  currentPrice: number | null
  marketValue: number
  costBasis: number
  pnl: number
  pnlPct: number
}

export interface PriceQuote {
  price: number
  currency: Currency
  name: string
}

export type QuoteMap = Record<string, PriceQuote | null>

export interface TickerSearchResult {
  ticker: string
  name: string
  market: Market
}

export interface AdditionalBuyInput {
  existingQuantity: number
  existingAvgPrice: number
  additionalQuantity: number
  additionalPrice: number
  currentPrice: number
}

export interface AdditionalBuyResult {
  additionalCost: number
  newTotalQuantity: number
  newTotalCost: number
  newAvgPrice: number
  estimatedPnl: number
  estimatedPnlPct: number
  breakEvenPrice: number
}

export interface PortfolioSummary {
  totalMarketValue: number
  totalCostBasis: number
  totalPnl: number
  totalPnlPct: number
}
