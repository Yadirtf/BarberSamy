import type { Media } from '@/domain/media';

/**
 * URLs de medios. Cloudinary redimensiona y comprime al vuelo según la URL:
 * la misma foto sale a 400 px para el celular y a 1280 px para el TV.
 * Funciona en el servidor y en el navegador (solo usa el cloud name público).
 */
export function crearUrlsMedios(cloudName: string) {
  const base = cloudName ? `https://res.cloudinary.com/${cloudName}` : '';

  function imagen(m: Media | null | undefined, ancho: number): string | null {
    if (!m) return null;
    if (m.proveedor === 'url') return m.ref;
    if (!base) return null;
    return `${base}/image/upload/f_auto,q_auto,c_limit,w_${Math.round(ancho)}/${m.ref}`;
  }

  /** Video H.264 sin audio: lo que cualquier TV decodifica por hardware sin tirones. */
  function video(m: Media | null | undefined, ancho: number): string | null {
    if (!m) return null;
    if (m.proveedor === 'url') return m.ref;
    if (!base) return null;
    return `${base}/video/upload/q_auto,c_limit,w_${Math.round(ancho)},vc_h264,ac_none/${m.ref}.mp4`;
  }

  /** Primer cuadro del video como imagen (para miniaturas). */
  function posterVideo(m: Media | null | undefined, ancho: number): string | null {
    if (!m || m.proveedor !== 'cloudinary' || !base) return null;
    return `${base}/video/upload/so_0,f_jpg,q_auto,c_limit,w_${Math.round(ancho)}/${m.ref}.jpg`;
  }

  return { imagen, video, posterVideo };
}

export const urlsPublicas = crearUrlsMedios(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '');
