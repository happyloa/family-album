import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: '我們這一家',
  description: '為家人打造的私密相簿，重溫每一趟旅程的回憶。'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`bg-slate-950 ${notoSans.className}`}>
      <body className="min-h-screen bg-gradient-to-b from-slate-950/90 via-slate-950 to-slate-900 text-slate-100 antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 select-none opacity-80 mix-blend-screen" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_80%_0,rgba(129,140,248,0.08),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(16,185,129,0.1),transparent_30%)]" />
        </div>
        <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-8 lg:px-12">{children}</main>
      </body>
    </html>
  );
}
