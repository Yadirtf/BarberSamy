import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  // Cloudflare cobra la optimización de imágenes; Cloudinary ya entrega cada foto
  // al tamaño y formato justos, así que Next no las procesa.
  images: { unoptimized: true },
  poweredByHeader: false,
  async rewrites() {
    // El modo TV es HTML + JS puro (public/tv). Estas rutas cortas lo sirven sin React.
    return [
      { source: '/tv', destination: '/tv/index.html' },
      { source: '/tv/diagnostico', destination: '/tv/diagnostico.html' },
    ];
  },
  async headers() {
    return [
      {
        source: '/tv/:archivo*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=300' }],
      },
    ];
  },
};

export default nextConfig;

// Permite usar getCloudflareContext() también con `next dev`.
initOpenNextCloudflareForDev();
