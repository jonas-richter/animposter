import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Impostor — Party-Spiel',
  description: 'Alle bekommen denselben Charakter — bis auf ein paar Fälschungen. Findet sie.',
  applicationName: 'Impostor',
  appleWebApp: {
    // "Zum Home-Bildschirm" on iOS then opens fullscreen without Safari's chrome.
    capable: true,
    title: 'Impostor',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Impostor — Party-Spiel',
    description: 'Alle bekommen denselben Charakter — bis auf ein paar Fälschungen.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#08080f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
