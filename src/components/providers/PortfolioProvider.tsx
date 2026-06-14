'use client'

import { useEffect } from 'react'
import { usePortfolioStore } from '@/store/portfolio'
import type { Portfolio, Holding } from '@/types'

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { setPortfolios, setActivePortfolioId, setHoldings } = usePortfolioStore()

  useEffect(() => {
    async function bootstrap() {
      let portfolios: Portfolio[] = []

      try {
        const res = await fetch('/api/portfolio')
        const data = await res.json()
        portfolios = Array.isArray(data) ? data : []
      } catch {
        // ignore
      }

      if (portfolios.length === 0) {
        try {
          const res = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Portfolio', base_currency: 'KRW' }),
          })
          const created: Portfolio = await res.json()
          portfolios = [created]
        } catch {
          return
        }
      }

      setPortfolios(portfolios)
      const targetId = portfolios[0].id
      setActivePortfolioId(targetId)

      try {
        const hRes = await fetch(`/api/holdings?portfolioId=${targetId}`)
        const hData = await hRes.json()
        const holdings: Holding[] = Array.isArray(hData) ? hData : []
        setHoldings(holdings)
      } catch {
        setHoldings([])
      }
    }

    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
