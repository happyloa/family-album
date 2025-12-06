import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const notoSansTc = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: '我們這一家',
  description: '為家人打造的私密相簿，重溫每一趟旅程的回憶。'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="bg-slate-950">
      <body
        className={`${notoSansTc.className} min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100 antialiased`}
      >
        <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-8 lg:px-12">{children}</main>
      </body>
    </html>
  );
}
