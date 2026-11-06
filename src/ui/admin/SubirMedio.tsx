'use client';

import { useRef, useState } from 'react';
import type { Media, TipoMedia } from '@/domain/media';

/**
 * Sube fotos o videos directo del navegador a Cloudinary con una firma del servidor.
 * Las fotos tomadas con el celular se achican antes de subir (máx. 1600 px) para que
 * suban rápido con datos móviles. Los PNG y WebP conservan la transparencia.
 */
const LADO_MAXIMO = 1600;

async function comprimirImagen(archivo: File | Blob): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return archivo;
  const bitmap = await createImageBitmap(archivo).catch(() => null);
  if (!bitmap) return archivo;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && archivo.size < 1_500_000) return archivo;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // PNG y WebP pueden traer transparencia (fotos sin fondo): se conserva el formato.
  const tipo = archivo.type === 'image/jpeg' ? 'image/jpeg' : archivo.type;
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? archivo), tipo, 0.86));
}

export async function subir(archivo: File | Blob, tipo: TipoMedia, carpeta: string): Promise<Media> {
  const firma = await fetch('/api/admin/medios/firma', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ carpeta }),
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? 'No se pudo preparar la subida');
    return d as { cloudName: string; apiKey: string; timestamp: number; firma: string; carpeta: string };
  });
  const cuerpo = new FormData();
  cuerpo.append('file', tipo === 'imagen' ? await comprimirImagen(archivo) : archivo, 'foto');
  cuerpo.append('api_key', firma.apiKey);
  cuerpo.append('timestamp', String(firma.timestamp));
  cuerpo.append('signature', firma.firma);
  cuerpo.append('folder', firma.carpeta);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/${tipo === 'imagen' ? 'image' : 'video'}/upload`, { method: 'POST', body: cuerpo });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message ?? 'Cloudinary rechazó el archivo');
  return { proveedor: 'cloudinary', ref: d.public_id, tipo, ancho: d.width, alto: d.height };
}

export function SubirMedio({ tipo, carpeta, multiple = false, onSubido, texto }: {
  tipo: TipoMedia;
  carpeta: string;
  multiple?: boolean;
  onSubido: (m: Media) => void;
  texto?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = '';
    setError(null);
    for (let i = 0; i < archivos.length; i++) {
      const a = archivos[i];
      if (tipo === 'video' && a.size > 100 * 1024 * 1024) { setError('El video pesa más de 100 MB. Recórtalo o comprímelo.'); continue; }
      setEstado(`Subiendo ${i + 1} de ${archivos.length}…`);
      try {
        onSubido(await subir(a, tipo, carpeta));
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setEstado(null);
  }

  return (
    <div>
      <input ref={input} type="file" hidden accept={tipo === 'imagen' ? 'image/*' : 'video/mp4,video/*'} multiple={multiple} onChange={alElegir} />
      <button type="button" className="btn btn-chico" disabled={!!estado} onClick={() => input.current?.click()}>
        {estado ?? texto ?? (tipo === 'imagen' ? '+ Subir fotos' : '+ Subir video')}
      </button>
      {error && <p className="aviso aviso-error pequeno">{error}</p>}
    </div>
  );
}
