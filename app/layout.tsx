import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

import { ErrorBoundary } from '@/components/ErrorBoundary';

// 設定字型：使用 Noto Sans TC (繁體中文)
const notoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap'
});

// 設定 Metadata，包含 SEO 與爬蟲設定
export const metadata: Metadata = {
  title: '我們這一家',
  description: '為家人打造的私密相簿，重溫每一趟旅程的回憶。',
  robots: {
    // 禁止搜尋引擎索引與追蹤，確保隱私
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      'max-image-preview': 'none',
      'max-snippet': 0,
      'max-video-preview': 0
    }
  }
};

/**
 * RootLayout: 應用程式的根佈局
 * 包含全域樣式、字型設定以及背景效果
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`bg-slate-950 ${notoSans.className}`}>
      <body className="min-h-screen bg-gradient-to-b from-slate-950/90 via-slate-950 to-slate-900 text-slate-100 antialiased">
        {/* 背景裝飾效果：使用 radial-gradient 製作光暈 */}
        <div className="pointer-events-none fixed inset-0 -z-10 select-none opacity-80 mix-blend-screen" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_80%_0,rgba(129,140,248,0.08),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(16,185,129,0.1),transparent_30%)]" />
        </div>
        {/* 主要內容區域（包含 Error Boundary 保護） */}
        <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-8 lg:px-12">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}

