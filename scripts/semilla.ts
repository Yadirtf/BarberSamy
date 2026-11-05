/**
 * Datos iniciales: índices, categorías base, las revistas que maneja la clienta y la
 * configuración. No borra nada y se puede correr varias veces (salta lo que ya existe).
 * Con --ejemplos agrega 3 productos de muestra de la vitrina anterior.
 * Uso: npm run db:semilla  (o)  npm run db:semilla -- --ejemplos
 */
import { casosProductos } from '@/application/catalogo/productos';
import { casosInstalacion } from '@/application/instalacion';
import { crearIndices } from '@/infrastructure/mongo/colecciones';
import { conectar } from './_deps';

async function main() {
  const { d, db } = conectar();
  await crearIndices(await db());
  console.log('✓ Índices');

  const { categorias, revistas } = await casosInstalacion(d).sembrarCatalogoBase();
  console.log(`✓ ${categorias} categorías y ${revistas} revistas nuevas`);

  if (process.argv.includes('--ejemplos')) {
    const barberia = (await d.revistas.listar()).find((r) => r.slug === 'barberia-samy');
    const cat = await d.categorias.porSlug('barberia');
    if (barberia && cat) {
      const p = casosProductos(d);
      const ejemplos = [
        { codigo: 'EJ-POMADA', nombre: 'Pomada Mate', descripcion: 'Fijación fuerte con acabado natural, sin brillo. Se lava fácil con agua.', caracteristicas: ['Fijación fuerte todo el día', 'Acabado mate', 'Base agua'], contenido: '100 g', etiqueta: 'Más vendido', color: '#d4a857', archivo: 'ejemplo-pomada.svg' },
        { codigo: 'EJ-ACEITE', nombre: 'Aceite para Barba', descripcion: 'Suaviza, da brillo y quita la picazón de la barba. Aroma a sándalo y cedro.', caracteristicas: ['Aceite de argán y jojoba', 'Absorción rápida', 'Gotero de precisión'], contenido: '30 ml', etiqueta: 'Oferta', color: '#e08a2e', archivo: 'ejemplo-aceite.svg' },
        { codigo: 'EJ-SHAMPOO', nombre: 'Shampoo Mentolado', descripcion: 'Limpieza profunda con efecto refrescante para el cuero cabelludo.', caracteristicas: ['Mentol natural', 'Control de caspa', 'Uso diario'], contenido: '400 ml', etiqueta: null, color: '#2fae86', archivo: 'ejemplo-shampoo.svg' },
      ];
      for (const e of ejemplos) {
        if (await d.productos.porCodigo(barberia.id, e.codigo)) continue;
        const { archivo, ...datos } = e;
        await p.crear({ ...datos, revistaId: barberia.id, categoriaIds: [cat.id], disponibilidad: 'vitrina', visibleTienda: true, visibleTV: true, imagenes: [{ proveedor: 'url', ref: `/ejemplos/${archivo}`, tipo: 'imagen' }] });
        console.log(`✓ Ejemplo ${e.nombre}`);
      }
    }
  }
  console.log('Listo.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
