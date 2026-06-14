import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('sc_portfolios')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const body = await req.json()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('sc_portfolios')
    .insert({
      name: body.name ?? 'My Portfolio',
      base_currency: body.base_currency ?? 'KRW',
      user_id: user?.id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
