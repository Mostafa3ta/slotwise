import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Slotwise', template: '%s · Slotwise' },
  description:
    'A clinic appointment scheduler: book, move and resize appointments across providers, with overlap and working-hours checks and a next-free-slot finder.',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#1d2027' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
