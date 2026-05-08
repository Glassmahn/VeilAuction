import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SolanaProviders } from '@/components/providers/solana-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans"
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-heading"
})

export const metadata: Metadata = {
  title: 'VeilAuction - Confidential Sealed-Bid Auctions on Solana',
  description: 'The first production-ready sealed-bid auction platform where bids remain fully encrypted until auction close. Built on Arcium and Solana.',
  generator: 'v0.app',
  keywords: ['auction', 'sealed-bid', 'Solana', 'Arcium', 'MPC', 'confidential', 'NFT', 'crypto'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#d4a574',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SolanaProviders>
            {children}
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </SolanaProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
