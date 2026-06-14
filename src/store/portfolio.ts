import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Portfolio, Holding, HoldingWithPrice, QuoteMap } from '@/types'
import { calcHoldingWithPrice, calcPortfolioSummary } from '@/lib/calculations'

interface PortfolioStore {
  portfolios: Portfolio[]
  activePortfolioId: string | null
  holdings: Holding[]
  quotes: QuoteMap
  holdingsWithPrice: HoldingWithPrice[]
  isLoadingPrices: boolean

  setPortfolios: (portfolios: Portfolio[]) => void
  setActivePortfolioId: (id: string | null) => void
  setHoldings: (holdings: Holding[]) => void
  setQuotes: (quotes: QuoteMap) => void
  setLoadingPrices: (v: boolean) => void
  addHolding: (holding: Holding) => void
  updateHolding: (holding: Holding) => void
  removeHolding: (id: string) => void
}

function mergeWithPrices(holdings: Holding[], quotes: QuoteMap): HoldingWithPrice[] {
  return holdings.map((h) => calcHoldingWithPrice(h, quotes[h.ticker]?.price ?? null))
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      portfolios: [],
      activePortfolioId: null,
      holdings: [],
      quotes: {},
      holdingsWithPrice: [],
      isLoadingPrices: false,

      setPortfolios: (portfolios) => set({ portfolios }),
      setActivePortfolioId: (id) => set({ activePortfolioId: id }),

      setHoldings: (holdings) =>
        set({ holdings, holdingsWithPrice: mergeWithPrices(holdings, get().quotes) }),

      setQuotes: (quotes) =>
        set({ quotes, holdingsWithPrice: mergeWithPrices(get().holdings, quotes) }),

      setLoadingPrices: (v) => set({ isLoadingPrices: v }),

      addHolding: (holding) => {
        const holdings = [...get().holdings, holding]
        set({ holdings, holdingsWithPrice: mergeWithPrices(holdings, get().quotes) })
      },
      updateHolding: (holding) => {
        const holdings = get().holdings.map((h) => (h.id === holding.id ? holding : h))
        set({ holdings, holdingsWithPrice: mergeWithPrices(holdings, get().quotes) })
      },
      removeHolding: (id) => {
        const holdings = get().holdings.filter((h) => h.id !== id)
        set({ holdings, holdingsWithPrice: mergeWithPrices(holdings, get().quotes) })
      },
    }),
    {
      name: 'sc_data',
      partialize: (s) => ({
        portfolios: s.portfolios,
        holdings: s.holdings,
        activePortfolioId: s.activePortfolioId,
      }),
    }
  )
)

export function usePortfolioSummary() {
  return usePortfolioStore((s) => calcPortfolioSummary(s.holdingsWithPrice))
}
