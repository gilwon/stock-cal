'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { HoldingWithPrice } from '@/types'

interface Props {
  holdings: HoldingWithPrice[]
  onDelete: (id: string) => void
}

function pnlClass(n: number) {
  if (n > 0) return 'text-red-500 font-semibold'
  if (n < 0) return 'text-blue-500 font-semibold'
  return 'text-gray-500'
}

function fmtPrice(n: number | null, currency: string) {
  if (n === null) return '—'
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function HoldingsTable({ holdings, onDelete }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        보유 종목이 없습니다.{' '}
        <Link href="/holdings/new" className="text-primary underline">
          종목 추가
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">평균단가</TableHead>
            <TableHead className="text-right">현재가</TableHead>
            <TableHead className="text-right">평가금액</TableHead>
            <TableHead className="text-right">손익</TableHead>
            <TableHead className="text-right">수익률</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => (
            <TableRow key={h.id}>
              <TableCell>
                <div className="font-medium">{h.name}</div>
                <div className="text-xs text-muted-foreground">
                  {h.ticker}{' '}
                  <Badge variant="outline" className="text-[10px]">
                    {h.market}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">{h.quantity.toLocaleString()}</TableCell>
              <TableCell className="text-right">{fmtPrice(h.avg_price, h.currency)}</TableCell>
              <TableCell className="text-right">
                {h.currentPrice === null ? (
                  <span className="text-muted-foreground text-xs">조회 중</span>
                ) : (
                  fmtPrice(h.currentPrice, h.currency)
                )}
              </TableCell>
              <TableCell className="text-right">{fmtPrice(h.marketValue, h.currency)}</TableCell>
              <TableCell className={`text-right ${pnlClass(h.pnl)}`}>
                {h.pnl >= 0 ? '+' : ''}
                {fmtPrice(h.pnl, h.currency)}
              </TableCell>
              <TableCell className={`text-right ${pnlClass(h.pnlPct)}`}>
                {h.pnlPct >= 0 ? '+' : ''}
                {h.pnlPct.toFixed(2)}%
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Link
                    href={`/holdings/${h.id}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    수정
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onDelete(h.id)}
                  >
                    삭제
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
