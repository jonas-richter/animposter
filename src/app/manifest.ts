import type { MetadataRoute } from 'next';

// Makes "Zum Home-Bildschirm" on iOS/Android produce a proper app tile that
// opens without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Impostor — Party-Spiel',
    short_name: 'Impostor',
    description: 'Alle bekommen denselben Charakter — bis auf ein paar Fälschungen.',
    lang: 'de',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080f',
    theme_color: '#08080f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
