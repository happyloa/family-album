import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Album',
  description: 'A private gallery for the whole family to relive every trip together.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
