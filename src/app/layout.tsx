import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { DisclaimerFooter } from '@/components/ui/DisclaimerFooter'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PortfolioProvider } from '@/components/providers/PortfolioProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stock Cal — 주식 포트폴리오 계산기',
  description: '보유 종목 손익 계산 및 추가매수 시뮬레이터',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-background`}>
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              📈 Stock Cal
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/holdings/new" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                + 종목 추가
              </Link>
              <Link href="/calculator" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                계산기
              </Link>
            </nav>
          </div>
        </header>
        <PortfolioProvider>
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-6">{children}</main>
        </PortfolioProvider>
        <DisclaimerFooter />
      </body>
    </html>
  )
}
