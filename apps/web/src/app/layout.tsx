import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { CartProvider } from '@/features/cart';
import { NotificationProvider } from '@/features/notifications';
import { SiteFooter, SiteHeader, StorefrontOnly } from '@/components/layout';
import { colors } from '@/design-system/tokens';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Shopkart - Modern E-Commerce',
  description: 'Shopkart E-Commerce Microservices Platform',
};

export const viewport: Viewport = {
  themeColor: colors.primary.DEFAULT,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-canvas text-ink">
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <StorefrontOnly>
                <SiteHeader />
              </StorefrontOnly>
              <main id="main-content" className="flex flex-1 flex-col">
                {children}
              </main>
              <StorefrontOnly>
                <SiteFooter />
              </StorefrontOnly>
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
