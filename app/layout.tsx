import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Album',
  description: 'A private gallery for the whole family to relive every trip together.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#020617] to-[#020617] text-slate-100 antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
