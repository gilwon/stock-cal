import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PortfolioSummary } from '@/types'

interface Props {
  summary: PortfolioSummary
  baseCurrency: string
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function pnlColor(n: number) {
  if (n > 0) return 'text-red-500'
  if (n < 0) return 'text-blue-500'
  return 'text-gray-500'
}

export function SummaryCards({ summary, baseCurrency }: Props) {
  const { totalMarketValue, totalPnl, totalPnlPct } = summary

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">총 평가금액</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{fmt(totalMarketValue, baseCurrency)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">총 평가손익</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${pnlColor(totalPnl)}`}>
            {totalPnl >= 0 ? '+' : ''}
            {fmt(totalPnl, baseCurrency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">총 수익률</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${pnlColor(totalPnlPct)}`}>
            {totalPnlPct >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(2)}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
