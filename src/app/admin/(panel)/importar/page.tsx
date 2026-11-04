import type { Metadata } from 'next';
import { COLUMNAS_CSV } from '@/application/catalogo/importacion';
import { Importar } from './Importar';

export const metadata: Metadata = { title: 'Importar y exportar' };

export default function PaginaImportar() {
  const ejemplo = [
    COLUMNAS_CSV.join(','),
    'yanbal,12345,Perfume Ccori,Ccori,perfumeria,perfume-mujer,50 ml,Fragancia floral,Notas florales | Larga duración,C17-2026,34,yanbal-12345.webp,pedido,Nuevo,si,si',
  ].join('\n');
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <h1>Importar y exportar</h1>
      <section className="tarjeta">
        <h2>Exportar</h2>
        <p className="suave">Descarga todos los productos en CSV (se abre en Excel). Sirve como plantilla: edítalo y vuelve a importarlo.</p>
        <a className="btn" href="/api/admin/exportar">Descargar productos.csv</a>
      </section>
      <section className="tarjeta">
        <h2>Importar CSV</h2>
        <p className="suave">Los productos se identifican por <b>revista + código</b>: si el código ya existe se actualiza; si no, se crea. Las celdas vacías no borran datos. Primero usa “Revisar” para ver qué pasaría sin guardar nada.</p>
        <details>
          <summary className="oro" style={{ cursor: 'pointer' }}>Formato de columnas</summary>
          <ul className="lista-puntos pequeno">
            <li><b>revista</b> (obligatoria): la dirección de la revista, ej. <code>yanbal</code>, <code>esika</code>.</li>
            <li><b>codigo</b>, <b>nombre</b> (obligatorias).</li>
            <li><b>categoria</b>: piel, cabello, perfumeria, maquillaje, salud, barberia. <b>subcategoria</b>: se crea si no existe.</li>
            <li><b>caracteristicas</b>: separadas por <code>|</code>. <b>campana</b>: se crea si no existe.</li>
            <li><b>imagen</b>: nombre del archivo subido a la carpeta <code>tienda/productos</code> de Cloudinary (ej. <code>yanbal-12345.webp</code>) o una URL.</li>
            <li><b>disponibilidad</b>: vitrina, pedido o agotado. <b>visible_tienda</b> / <b>visible_tv</b>: si o no.</li>
          </ul>
          <pre className="tarjeta pequeno" style={{ overflowX: 'auto' }}>{ejemplo}</pre>
        </details>
        <Importar />
      </section>
    </div>
  );
}
