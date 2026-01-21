import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'COMEX Metals | Supply & Demand',
  description: 'Real-time supply and demand tracking for COMEX metals',
  keywords: ['COMEX', 'metals', 'supply', 'demand', 'inventory', 'warehouse'],
  authors: [{ name: 'COMEX Metals Dashboard' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    title: 'COMEX Metals | Supply & Demand',
    description: 'Real-time supply and demand tracking for COMEX metals',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen">
            {/* Theme Toggle & Last Updated - Fixed position */}
            <div className="fixed top-4 right-6 z-50 flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Last updated: January 21, 2026 • CME Group</span>
              </div>
              <ThemeToggle />
            </div>

            <main>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
