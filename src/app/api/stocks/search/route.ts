import { NextRequest, NextResponse } from 'next/server'
import { searchTicker } from '@/lib/yahoo-finance'
import type { Market } from '@/types'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const market = (req.nextUrl.searchParams.get('market') ?? undefined) as Market | undefined

  if (q.length < 1) {
    return NextResponse.json([])
  }

  const results = await searchTicker(q, market)
  return NextResponse.json(results)
}
