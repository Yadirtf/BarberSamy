/**
 * Datos iniciales: índices, categorías base, las revistas que maneja la clienta y la
 * configuración. No borra nada y se puede correr varias veces (salta lo que ya existe).
 * Con --ejemplos agrega 3 productos de muestra de la vitrina anterior.
 * Uso: npm run db:semilla  (o)  npm run db:semilla -- --ejemplos
 */
import { casosCategorias } from '@/application/catalogo/categorias';
import { casosProductos } from '@/application/catalogo/productos';
import { casosRevistas } from '@/application/catalogo/revistas';
import { CATEGORIAS_BASE } from '@/domain/catalogo/categoria';
import { crearIndices } from '@/infrastructure/mongo/colecciones';
import { conectar } from './_deps';

const REVISTAS: [string, string][] = [
  ['Barbería Samy', '#d4a857'],
  ['Yanbal', '#b3005e'],
  ['Avon', '#e4007c'],
  ['Ésika', '#e6007e'],
  ['Cyzone', '#00a19a'],
  ['Natura', '#f28c28'],
  ['Oriflame', '#4f9b3a'],
  ['Anyeluz', '#8e44ad'],
  ['Milagros', '#c0392b'],
  ['Naprolap', '#1f7a4d'],
  ['Astaxantina', '#d35400'],
];

/** Revistas de suplementos y bienestar: sus fichas llevan el aviso médico. */
const REVISTAS_SALUD = new Set(['Naprolap', 'Astaxantina']);

async function main() {
  const { d, db } = conectar();
  await crearIndices(await db());
  console.log('✓ Índices');

  const cats = casosCategorias(d);
  for (const [i, c] of CATEGORIAS_BASE.entries()) {
    if (await d.categorias.porSlug(c.slug)) continue;
    await cats.crear({ ...c, orden: i });
    console.log(`✓ Categoría ${c.nombre}`);
  }

  const revs = casosRevistas(d);
  for (const [nombre, color] of REVISTAS) {
    const existentes = await d.revistas.listar();
    if (existentes.some((r) => r.nombre.toLowerCase() === nombre.toLowerCase())) continue;
    await revs.crear({ nombre, color, diasEntrega: nombre.startsWith('Barbería') ? 0 : 5, avisoSalud: REVISTAS_SALUD.has(nombre) });
    console.log(`✓ Revista ${nombre}`);
  }

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
