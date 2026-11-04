import type { MetadataRoute } from 'next';

/** Permite "Agregar a la pantalla de inicio" la tienda en el celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tienda Barbería Samy',
    short_name: 'Tienda Samy',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0b0a',
    theme_color: '#0c0b0a',
    icons: [{ src: '/icono.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
