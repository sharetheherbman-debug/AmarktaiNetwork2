import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amarktai Network — The AI Ecosystem',
  description: 'Amarktai Network designs and develops AI systems, applications, PWAs, and intelligent automation platforms.',
  keywords: ['AI', 'technology', 'applications', 'automation', 'digital platforms'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
