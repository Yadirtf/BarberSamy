import { beforeEach, describe, expect, it } from 'vitest';
import { casosCategorias, ordenarComoArbol } from '@/application/catalogo/categorias';
import { casosImportacion } from '@/application/catalogo/importacion';
import { casosProductos } from '@/application/catalogo/productos';
import { casosRevistas } from '@/application/catalogo/revistas';
import { consultasTienda } from '@/application/catalogo/consultas';
import { casosPedidos, resumenParaProveedores } from '@/application/pedidos/pedidos';
import { casosTV } from '@/application/tv/playlist';
import { casosConfiguracion } from '@/application/configuracion';
import { ErrorDominio } from '@/domain/shared/errores';
import { dependenciasEnMemoria } from './memoria';

type Deps = ReturnType<typeof dependenciasEnMemoria>;

async function preparar(d: Deps) {
  const revistas = casosRevistas(d);
  const categorias = casosCategorias(d);
  const productos = casosProductos(d);
  const yanbal = await revistas.crear({ nombre: 'Yanbal', color: '#aa2233' });
  const esika = await revistas.crear({ nombre: 'Ésika', color: '#cc0066' });
  const perfumeria = await categorias.crear({ nombre: 'Perfumería', orden: 1 });
  const piel = await categorias.crear({ nombre: 'Piel', orden: 0 });
  const ccori = await productos.crear({
    revistaId: yanbal.id, codigo: '12345', nombre: 'Perfume Ccori', categoriaIds: [perfumeria.id],
    disponibilidad: 'pedido', visibleTV: true, imagenes: [{ proveedor: 'cloudinary', ref: 'tienda/productos/yanbal-12345', tipo: 'imagen' }],
  });
  const crema = await productos.crear({
    revistaId: esika.id, codigo: 'A1', nombre: 'Crema hidratante', categoriaIds: [piel.id],
    disponibilidad: 'vitrina', stockVitrina: 3, visibleTV: true, imagenes: [{ proveedor: 'url', ref: '/x.png', tipo: 'imagen' }],
  });
  return { yanbal, esika, perfumeria, piel, ccori, crema, revistas, categorias, productos };
}

describe('catálogo', () => {
  let d: Deps;
  beforeEach(() => { d = dependenciasEnMemoria(); });

  it('genera slugs únicos y sin tildes', async () => {
    const { esika, revistas } = await preparar(d);
    expect(esika.slug).toBe('esika');
    const otra = await revistas.crear({ nombre: 'Esika' });
    expect(otra.slug).toBe('esika-2');
  });

  it('no permite dos productos con el mismo código en la misma revista', async () => {
    const { yanbal, esika, productos } = await preparar(d);
    await expect(productos.crear({ revistaId: yanbal.id, codigo: '12345', nombre: 'Otro' })).rejects.toThrow(/ya existe/);
    // Pero sí en otra revista
    await expect(productos.crear({ revistaId: esika.id, codigo: '12345', nombre: 'Otro' })).resolves.toBeTruthy();
  });

  it('rechaza referencias inexistentes y campañas de otra revista', async () => {
    const { yanbal, esika, productos, revistas } = await preparar(d);
    await expect(productos.crear({ revistaId: 'nada', codigo: '1', nombre: 'X' })).rejects.toThrow(/revista/);
    await expect(productos.crear({ revistaId: yanbal.id, codigo: '1', nombre: 'X', categoriaIds: ['nada'] })).rejects.toThrow(/categor/);
    const c = await revistas.crearCampana({ revistaId: esika.id, codigo: 'c17-2026' });
    expect(c.codigo).toBe('C17-2026');
    await expect(productos.crear({ revistaId: yanbal.id, codigo: '1', nombre: 'X', campanaId: c.id })).rejects.toThrow(/campaña/);
  });

  it('no borra una revista con productos ni una categoría en uso', async () => {
    const { yanbal, perfumeria, revistas, categorias } = await preparar(d);
    await expect(revistas.eliminar(yanbal.id)).rejects.toBeInstanceOf(ErrorDominio);
    await expect(categorias.eliminar(perfumeria.id)).rejects.toThrow(/productos/);
  });

  it('subcategorías: un solo nivel y la búsqueda por madre incluye a las hijas', async () => {
    const { perfumeria, yanbal, categorias, productos } = await preparar(d);
    const mujer = await categorias.crear({ nombre: 'Perfume mujer', padreId: perfumeria.id });
    await expect(categorias.crear({ nombre: 'Nieta', padreId: mujer.id })).rejects.toThrow(/un nivel/);
    await productos.crear({ revistaId: yanbal.id, codigo: '999', nombre: 'Fragancia Ohm', categoriaIds: [mujer.id] });
    const r = await consultasTienda(d).buscar({ categoria: 'perfumeria' });
    expect(r.items.map((p) => p.codigo).sort()).toEqual(['12345', '999']);
    const arbol = ordenarComoArbol(await d.categorias.listar());
    expect(arbol.findIndex((c) => c.id === mujer.id)).toBe(arbol.findIndex((c) => c.id === perfumeria.id) + 1);
  });

  it('la tienda no muestra productos ocultos ni de revistas inactivas', async () => {
    const { esika, ccori, productos, revistas } = await preparar(d);
    await productos.cambiarVisibilidad(ccori.id, { visibleTienda: false });
    await revistas.actualizar(esika.id, { nombre: 'Ésika', activa: false });
    const r = await consultasTienda(d).buscar({});
    expect(r.total).toBe(0);
    expect(await consultasTienda(d).producto(ccori.slug)).toBeNull();
  });

  it('cada cambio sube la versión del catálogo que consulta el TV', async () => {
    await preparar(d);
    const v1 = await casosTV(d).version();
    await casosRevistas(d).crear({ nombre: 'Natura' });
    expect(await casosTV(d).version()).toBeGreaterThan(v1);
  });
});

describe('pedidos', () => {
  let d: Deps;
  beforeEach(() => { d = dependenciasEnMemoria(); });

  it('guarda una copia de los productos, numera en orden y arma el mensaje sin precios', async () => {
    const { ccori, crema, yanbal } = await preparar(d);
    await casosConfiguracion(d).guardarGeneral({ negocio: 'Samy', whatsapp: '57 312 556 8963', encabezadoPedido: 'Hola!' });
    const pedidos = casosPedidos(d);
    const r = await pedidos.crear({
      items: [
        { productoId: ccori.id, cantidad: 1 },
        { productoId: ccori.id, cantidad: 1 },
        { productoId: crema.id, cantidad: 1 },
        { revistaId: yanbal.id, codigo: '777', descripcion: 'Labial rojo', cantidad: 1 },
      ],
      cliente: { nombre: 'Ana' },
      nota: 'Para regalo',
    }, '1.1.1.1');
    expect(r.numero).toBe(1);
    expect(r.mensaje).toContain('*Pedido #0001*');
    expect(r.mensaje).toContain('Perfume Ccori (Yanbal · cód. 12345) x 2');
    expect(r.mensaje).toContain('Labial rojo (Yanbal · cód. 777) x 1');
    expect(r.mensaje).toContain('Nota: Para regalo');
    expect(r.mensaje).not.toMatch(/\$/);
    expect(r.urlWhatsapp).toMatch(/^https:\/\/wa\.me\/573125568963\?text=/);

    // El historial no cambia si luego se edita el producto.
    await casosProductos(d).actualizar(ccori.id, { revistaId: yanbal.id, codigo: '12345', nombre: 'Nombre nuevo' });
    const guardado = await d.pedidos.porId(r.id);
    expect(guardado!.items[0].nombre).toBe('Perfume Ccori');
    expect(guardado!.estado).toBe('nuevo');

    const r2 = await pedidos.crear({ items: [{ productoId: crema.id, cantidad: 2 }], cliente: { nombre: 'Luis' } }, null);
    expect(r2.numero).toBe(2);
  });

  it('rechaza productos agotados u ocultos', async () => {
    const { ccori, yanbal } = await preparar(d);
    await casosProductos(d).actualizar(ccori.id, { revistaId: yanbal.id, codigo: '12345', nombre: 'Perfume Ccori', disponibilidad: 'agotado' });
    await expect(casosPedidos(d).crear({ items: [{ productoId: ccori.id, cantidad: 1 }], cliente: { nombre: 'Ana' } }, null))
      .rejects.toThrow(/Ya no están disponibles/);
  });

  it('valida los datos del cliente y limita el spam por IP', async () => {
    const { crema } = await preparar(d);
    const p = casosPedidos(d);
    await expect(p.crear({ items: [], cliente: { nombre: 'Ana' } }, null)).rejects.toThrow(/vacío/);
    await expect(p.crear({ items: [{ productoId: crema.id, cantidad: 1 }], cliente: { nombre: '' } }, null)).rejects.toThrow(/nombre/);
    for (let i = 0; i < 8; i++) await p.crear({ items: [{ productoId: crema.id, cantidad: 1 }], cliente: { nombre: 'Ana' } }, '9.9.9.9');
    await expect(p.crear({ items: [{ productoId: crema.id, cantidad: 1 }], cliente: { nombre: 'Ana' } }, '9.9.9.9')).rejects.toThrow(/Demasiados/);
  });

  it('respeta el ciclo de estados y deja historial con fecha', async () => {
    const { crema } = await preparar(d);
    const p = casosPedidos(d);
    const { id } = await p.crear({ items: [{ productoId: crema.id, cantidad: 1 }], cliente: { nombre: 'Ana' } }, null);
    await expect(p.cambiar(id, 'entregado')).rejects.toThrow(/no puede pasar/);
    await p.cambiar(id, 'confirmado');
    const fin = await p.cambiar(id, 'entregado', 'Pagó en efectivo');
    expect(fin.historial.map((h) => h.estado)).toEqual(['nuevo', 'confirmado', 'entregado']);
    expect(fin.historial[2].nota).toBe('Pagó en efectivo');
    await expect(p.cambiar(id, 'cancelado')).rejects.toThrow();
  });

  it('el resumen para proveedores agrupa por revista y código y excluye la vitrina', async () => {
    const { ccori, crema, yanbal } = await preparar(d);
    const p = casosPedidos(d);
    const a = await p.crear({ items: [{ productoId: ccori.id, cantidad: 2 }, { productoId: crema.id, cantidad: 1 }], cliente: { nombre: 'Ana' } }, null);
    const b = await p.crear({ items: [{ productoId: ccori.id, cantidad: 1 }, { revistaId: yanbal.id, codigo: '555', cantidad: 3 }], cliente: { nombre: 'Luis' } }, null);
    await p.cambiar(a.id, 'confirmado');
    await p.cambiar(b.id, 'confirmado');
    const resumen = resumenParaProveedores(await d.pedidos.listarPorEstado('confirmado'));
    expect(resumen).toHaveLength(1);
    expect(resumen[0].revistaNombre).toBe('Yanbal');
    // Orden numérico de códigos: 555 antes que 12345
    expect(resumen[0].lineas).toEqual([
      { codigo: '555', nombre: 'Producto por código', cantidad: 3, pedidos: [2] },
      { codigo: '12345', nombre: 'Perfume Ccori', cantidad: 3, pedidos: [1, 2] },
    ]);
  });
});

describe('importación CSV', () => {
  let d: Deps;
  beforeEach(() => { d = dependenciasEnMemoria(); });

  const CSV = [
    'revista;codigo;nombre;linea;categoria;subcategoria;contenido;descripcion;caracteristicas;campana;pagina_pdf;imagen;visible_tienda;visible_tv',
    'yanbal;12345;Perfume Ccori Rosé;Ccori;perfumeria;perfume-mujer;50 ml;"Floral; elegante";Notas florales | Larga duración;C17-2026;34;yanbal-12345.webp;si;si',
    'yanbal;20001;Base Total Cover;;piel;;30 ml;;;C17-2026;40;;si;no',
    'avon;1;No existe;;;;;;;;;;;',
    'yanbal;20001;Repetido;;;;;;;;;;;',
  ].join('\n');

  it('simular no escribe nada y reporta errores por fila', async () => {
    await preparar(d);
    const r = await casosImportacion(d).importar(CSV, { simular: true });
    expect(r).toMatchObject({ simulado: true, creados: 1, actualizados: 1 });
    expect(r.errores.map((e) => e.fila)).toEqual([4, 5]);
    expect((await d.productos.todos()).length).toBe(2);
  });

  it('actualiza por código, crea los nuevos, crea subcategoría y campaña, y lista los ausentes', async () => {
    const { yanbal, ccori } = await preparar(d);
    const extra = await casosProductos(d).crear({ revistaId: yanbal.id, codigo: '888', nombre: 'Salió de campaña' });
    const r = await casosImportacion(d).importar(CSV, { campanaVigente: true });
    expect(r).toMatchObject({ simulado: false, creados: 1, actualizados: 1 });
    expect(r.ausentes.map((a) => a.id)).toEqual([extra.id]);

    const actualizado = (await d.productos.porId(ccori.id))!;
    expect(actualizado.nombre).toBe('Perfume Ccori Rosé');
    expect(actualizado.descripcion).toBe('Floral; elegante');
    expect(actualizado.caracteristicas).toEqual(['Notas florales', 'Larga duración']);
    expect(actualizado.paginaCatalogo).toBe(34);
    const sub = await d.categorias.porSlug('perfume-mujer');
    expect(sub?.padreId).toBeTruthy();
    expect(actualizado.categoriaIds).toEqual([sub!.id]);
    const camp = await d.campanas.porCodigo(yanbal.id, 'C17-2026');
    expect(actualizado.campanaId).toBe(camp!.id);
    expect((await d.revistas.porId(yanbal.id))!.campanaVigenteId).toBe(camp!.id);

    const nuevo = await d.productos.porCodigo(yanbal.id, '20001');
    expect(nuevo).toMatchObject({ nombre: 'Base Total Cover', visibleTienda: true, visibleTV: false, contenido: '30 ml' });

    await casosProductos(d).ocultar(r.ausentes.map((a) => a.id));
    expect((await d.productos.porId(extra.id))!.visibleTienda).toBe(false);
  });

  it('exporta en el mismo formato que importa (ida y vuelta)', async () => {
    await preparar(d);
    await casosImportacion(d).importar(CSV);
    const csv = await casosImportacion(d).exportar();
    expect(csv.split('\r\n')[0]).toContain('revista,codigo,nombre');
    const d2 = dependenciasEnMemoria();
    await preparar(d2);
    const r = await casosImportacion(d2).importar(csv);
    expect(r.errores).toEqual([]);
  });
});

describe('televisor', () => {
  it('sigue el orden de revistas del admin y de productos dentro de cada revista', async () => {
    const d = dependenciasEnMemoria();
    const { yanbal, esika, ccori, productos } = await preparar(d);
    const otro = await productos.crear({ revistaId: yanbal.id, codigo: '2', nombre: 'Segundo', visibleTV: true, imagenes: [{ proveedor: 'url', ref: '/a.png', tipo: 'imagen' }] });
    await productos.crear({ revistaId: yanbal.id, codigo: '3', nombre: 'Sin foto', visibleTV: true });
    await productos.ordenarTV(yanbal.id, [otro.id, ccori.id]);
    const cfg = await d.configuracion.obtener();
    await casosConfiguracion(d).guardarTV({ ...cfg.tv, revistaIds: [esika.id, yanbal.id] });

    const pl = await casosTV(d).playlist('https://tienda.test');
    expect(pl.revistas.map((r) => r.slug)).toEqual(['esika', 'yanbal']);
    expect(pl.revistas[1].productos.map((p) => p.nombre)).toEqual(['Segundo', 'Perfume Ccori']);
    expect(pl.revistas[1].productos[1].imagen).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1280/tienda/productos/yanbal-12345');
    expect(pl.revistas[1].productos[1].url).toBe('https://tienda.test/producto/perfume-ccori-12345?origen=tv');
    expect(pl.revistas[0].productos[0].vitrina).toBe(true);
    expect(JSON.stringify(pl)).not.toMatch(/precio/i);
  });
});
