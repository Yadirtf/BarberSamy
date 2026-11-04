import type { FirmaMedios } from '@/application/puertos';

/**
 * Firma subidas directas del navegador a Cloudinary. Las fotos no pasan por el Worker
 * (que tiene límite de CPU por petición); el servidor solo firma los parámetros.
 */
export function firmaCloudinary(cloudName: string, apiKey: string, apiSecret: string): FirmaMedios {
  return {
    async firmarSubida(carpeta) {
      if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary no está configurado (faltan variables de entorno)');
      const timestamp = Math.floor(Date.now() / 1000);
      const firmar = `folder=${carpeta}&timestamp=${timestamp}${apiSecret}`;
      const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(firmar));
      const firma = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      return { cloudName, apiKey, timestamp, firma, carpeta };
    },
  };
}
