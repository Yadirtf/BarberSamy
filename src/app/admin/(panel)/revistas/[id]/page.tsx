import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { casos, entorno } from '@/servidor/contenedor';
import { FormularioRevista } from '@/ui/admin/FormularioRevista';
import { Campanas, EliminarRevista } from './Campanas';

export const metadata: Metadata = { title: 'Revista' };

export default async function EditarRevista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d } = casos();
  const revista = await d.revistas.porId(id);
  if (!revista) notFound();
  const [campanas, productos] = await Promise.all([d.campanas.listarPorRevista(id), d.productos.contarPorRevista(id)]);
  const conteo = await Promise.all(campanas.map((c) => d.productos.contarPorCampana(c.id)));
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <Link href="/admin/revistas" className="suave pequeno">← Revistas</Link>
      <h1>{revista.nombre}</h1>
      <FormularioRevista revista={revista} campanas={campanas.map((c) => ({ id: c.id, codigo: c.codigo }))} cloudName={entorno().cloudName} />
      <Campanas
        revistaId={id}
        vigenteId={revista.campanaVigenteId}
        campanas={campanas.map((c, i) => ({ id: c.id, codigo: c.codigo, inicio: c.inicio?.toISOString().slice(0, 10) ?? null, fin: c.fin?.toISOString().slice(0, 10) ?? null, productos: conteo[i] }))}
      />
      <section className="tarjeta">
        <h2>Eliminar revista</h2>
        {productos > 0
          ? <p className="suave">Tiene {productos} productos. Para sacarla de la tienda y el TV, desmarca “Activa”.</p>
          : <EliminarRevista id={id} />}
      </section>
    </div>
  );
}
