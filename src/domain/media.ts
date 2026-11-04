/**
 * Referencia a una imagen o video. El archivo nunca vive en la base de datos ni en git:
 * se guarda en Cloudinary (proveedor "cloudinary", ref = public_id) o es una URL externa
 * o un archivo de /public (proveedor "url").
 */
export type TipoMedia = 'imagen' | 'video';

export interface Media {
  proveedor: 'cloudinary' | 'url';
  ref: string;
  tipo: TipoMedia;
  ancho?: number;
  alto?: number;
}

export function esMediaValida(m: unknown): m is Media {
  if (!m || typeof m !== 'object') return false;
  const x = m as Media;
  return (x.proveedor === 'cloudinary' || x.proveedor === 'url') && typeof x.ref === 'string' && x.ref.length > 0 &&
    (x.tipo === 'imagen' || x.tipo === 'video');
}
