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
  title: 'AmarktAI Network — Intelligence Layer for Connected Apps',
  description: "AmarktAI Network is the intelligence layer powering a growing ecosystem of connected apps. Multi-model AI orchestration, adaptive execution, and shared context — so every connected app operates at its maximum potential.",
  keywords: ['AI operations', 'AI orchestration', 'multi-model AI', 'AmarktAI', 'connected apps', 'AI monitoring', 'shared intelligence', 'AI execution layer'],
  authors: [{ name: 'AmarktAI Network' }],
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
