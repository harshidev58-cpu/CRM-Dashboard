import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Civic Shield Reality Layer | Chief Minister\'s Office',
  description: 'Governance Intelligence Platform for ground resolution verification and officer trust metrics.',
  keywords: 'Civic Shield, CM Dashboard, Reality Gap, Public Grievances, Governance Intelligence',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} dark`}>
      <head>
        {/* Force dark mode background */}
        <style>{`
          html, body {
            background-color: #09090b;
            color: #fafafa;
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
