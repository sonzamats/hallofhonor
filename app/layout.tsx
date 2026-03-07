import type { Metadata } from 'next';
import NavBar from '@/components/ui/NavBar';
import BottomNav from '@/components/ui/BottomNav';
import GrainOverlay from '@/components/ui/GrainOverlay';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Hall of Valor | The Complete Record of American Military Valor',
  description:
    'A comprehensive, interactive record of every major U.S. military valor decoration — from the Medal of Honor to the Bronze Star. Explore recipients, awards, and the history of American military heroism.',
  metadataBase: new URL('https://hallofvalor.us'),
  openGraph: {
    title: 'Hall of Valor | The Complete Record of American Military Valor',
    description:
      'Explore every major U.S. military valor decoration and the heroes who earned them.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy-950 font-body text-cream antialiased">
        <NavBar />
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
        <GrainOverlay />
      </body>
    </html>
  );
}
