import type { Metadata } from 'next';
import { ordenarComoArbol } from '@/application/catalogo/categorias';
import { casos } from '@/servidor/contenedor';
import { FilaCategoria, NuevaCategoria } from './Categorias';

export const metadata: Metadata = { title: 'Categorías' };

export default async function Categorias() {
  const { d } = casos();
  const cats = ordenarComoArbol(await d.categorias.listar());
  const conteo = await Promise.all(cats.map((c) => d.productos.contarPorCategoria(c.id)));
  const madres = cats.filter((c) => !c.padreId).map((c) => ({ id: c.id, nombre: c.nombre }));
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <h1>Categorías</h1>
      <p className="suave">Son comunes a todas las revistas. Las subcategorías (un nivel) son opcionales; al filtrar por una categoría se incluyen sus subcategorías.</p>
      {cats.map((c, i) => <FilaCategoria key={c.id} categoria={c} productos={conteo[i]} madres={madres.filter((m) => m.id !== c.id)} />)}
      {!cats.length && <p className="aviso">No hay categorías. Corre <code>npm run db:semilla</code> para crear las básicas o agrégalas aquí.</p>}
      <h2>Nueva categoría</h2>
      <NuevaCategoria madres={madres} />
    </div>
  );
}
