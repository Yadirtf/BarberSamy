import type { Metadata } from 'next';
import { casos } from '@/servidor/contenedor';
import { Fotos } from './Fotos';

export const metadata: Metadata = { title: 'Fotos' };

export default async function PaginaFotos() {
  const revistas = (await casos().d.revistas.listar()).map((r) => ({ id: r.id, nombre: r.nombre, slug: r.slug }));
  return (
    <div className="pila" style={{ maxWidth: 1200 }}>
      <h1>Fotos de productos</h1>
      <p className="suave">
        Dos formas rápidas de poner fotos: recortarlas del catálogo PDF o subir muchas a la vez con el código como nombre.
        Cada foto queda como principal del producto (revista + código).
      </p>
      <Fotos revistas={revistas} />
    </div>
  );
}
