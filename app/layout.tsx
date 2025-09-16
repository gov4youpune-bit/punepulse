import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PWAProvider } from '@/providers/pwa-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { cn } from '@/lib/utils';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pune Pulse - Civic Complaint System',
  description: 'Camera-first civic complaint submission system for Pune Municipal Corporation',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pune Pulse',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

// ✅ No type import — just export plain object
export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Pune Pulse" />
          <meta name="mobile-web-app-capable" content="yes" />
          <link rel="apple-touch-startup-image" href="/apple-splash-2048-2732.png" />
        </head>
        <body className={cn(inter.className, "min-h-screen bg-background antialiased")}>
          <header className="flex justify-end items-center p-4 gap-4 h-16">
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <PWAProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </PWAProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
