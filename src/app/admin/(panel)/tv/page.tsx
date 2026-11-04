import type { Metadata } from 'next';
import { casos } from '@/servidor/contenedor';
import { urlsPublicas } from '@/infrastructure/cloudinary/urls';
import { AjustesTelevisor } from './AjustesTelevisor';

export const metadata: Metadata = { title: 'Televisor' };

export default async function Televisor() {
  const { d } = casos();
  const [config, revistas] = await Promise.all([d.configuracion.obtener(), d.revistas.listar()]);
  const productos = await Promise.all(revistas.map((r) => d.productos.listarPorRevista(r.id)));
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>Televisor</h1>
        <div className="fila">
          <a className="btn btn-chico" href="/tv" target="_blank" rel="noopener">Vista previa ↗</a>
          <a className="btn btn-chico" href="/tv/diagnostico" target="_blank" rel="noopener">Diagnóstico ↗</a>
        </div>
      </div>
      <p className="suave">El TV muestra las revistas en este orden. Cada revista abre con su portada y sigue con sus productos marcados “Mostrar en el televisor”.</p>
      <AjustesTelevisor
        ajustes={config.tv}
        revistas={revistas.map((r, i) => ({
          id: r.id,
          nombre: r.nombre,
          color: r.color,
          activa: r.activa,
          productos: productos[i].filter((p) => p.visibleTV).map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            vitrina: p.disponibilidad === 'vitrina',
            tieneMedio: p.imagenes.length > 0 || !!p.video,
            miniatura: urlsPublicas.imagen(p.imagenes[0], 80) ?? urlsPublicas.posterVideo(p.video, 80),
          })),
        }))}
      />
    </div>
  );
}
