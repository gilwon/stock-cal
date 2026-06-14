import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get('portfolioId')
  if (!portfolioId) return NextResponse.json([])

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('sc_holdings')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('sc_holdings')
    .insert({
      portfolio_id: body.portfolio_id,
      ticker: body.ticker,
      name: body.name,
      market: body.market,
      quantity: body.quantity,
      avg_price: body.avg_price,
      currency: body.currency,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
