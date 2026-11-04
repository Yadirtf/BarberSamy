import type { Metadata, Viewport } from 'next';
import './globals.css';

const urlSitio = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: { default: 'Tienda Barbería Samy', template: '%s · Tienda Barbería Samy' },
  description: 'Productos de belleza, cuidado personal y bienestar. Arma tu pedido y envíalo por WhatsApp.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#0c0b0a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
