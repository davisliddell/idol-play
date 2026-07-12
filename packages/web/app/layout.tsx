import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Idol Play - Survivor Simulator',
  description: 'Comprehensive Survivor game simulation with live viewing and results analysis',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
