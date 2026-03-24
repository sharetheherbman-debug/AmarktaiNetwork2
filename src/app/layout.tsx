import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import '@fontsource-variable/space-grotesk'
import CommandBar from '@/components/CommandBar'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Amarktai Network — One Brain. Multiple Apps.',
  description: "Amarktai Network is the AI operating layer for a connected ecosystem of apps. Multi-model orchestration, shared intelligence, centralized monitoring, and self-healing automation — one brain powering everything.",
  keywords: ['AI operations', 'AI orchestration', 'multi-model AI', 'AI operating layer', 'Africa', 'connected apps', 'AI monitoring', 'shared intelligence'],
  authors: [{ name: 'Amarktai Network' }],
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <CommandBar />
      </body>
    </html>
  )
}
