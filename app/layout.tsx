import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '我們這一家',
  description: 'A private gallery for the whole family to relive every trip together.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="bg-slate-950">
      <body className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100 antialiased">
        <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-8 lg:px-12">{children}</main>
      </body>
    </html>
  );
}
