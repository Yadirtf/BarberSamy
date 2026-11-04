import type { Categoria } from '@/domain/catalogo/categoria';
import { DISPONIBILIDADES, type Disponibilidad, type Producto } from '@/domain/catalogo/producto';
import type { Revista } from '@/domain/catalogo/revista';
import type { Media } from '@/domain/media';
import { escribirCsv, leerCsv } from '@/domain/shared/csv';
import { slugificar } from '@/domain/shared/texto';
import type { Dependencias } from '../puertos';
import { slugUnico } from './slugs';
import { marcarCambioCatalogo } from './version';
import { casosRevistas } from './revistas';

/** Columnas del CSV de importación/exportación (mismo formato que la extracción de los PDF). */
export const COLUMNAS_CSV = [
  'revista', 'codigo', 'nombre', 'linea', 'categoria', 'subcategoria', 'contenido', 'descripcion',
  'caracteristicas', 'campana', 'pagina_pdf', 'imagen', 'disponibilidad', 'etiqueta', 'visible_tienda', 'visible_tv',
] as const;

/** Carpeta de Cloudinary donde se suben en bloque las fotos nombradas revista-codigo.webp */
export const CARPETA_PRODUCTOS = 'tienda/productos';

export interface ErrorFila { fila: number; mensaje: string }
export interface ReporteImportacion {
  simulado: boolean;
  creados: number;
  actualizados: number;
  errores: ErrorFila[];
  /** Productos visibles de las revistas importadas cuyo código no vino en el archivo (posiblemente salieron de la campaña). */
  ausentes: { id: string; revista: string; codigo: string; nombre: string }[];
}

type D = Pick<Dependencias, 'productos' | 'revistas' | 'categorias' | 'campanas' | 'configuracion' | 'contadores' | 'reloj' | 'ids'>;

const siNo = (v: string | undefined): boolean | undefined => {
  const s = (v ?? '').trim().toLowerCase();
  if (['si', 'sí', 's', '1', 'true', 'x'].includes(s)) return true;
  if (['no', 'n', '0', 'false'].includes(s)) return false;
  return undefined;
};

export function mediaDesdeColumna(valor: string): Media | null {
  const v = valor.trim();
  if (!v) return null;
  if (/^https?:\/\//.test(v) || v.startsWith('/')) return { proveedor: 'url', ref: v, tipo: 'imagen' };
  const sinExtension = v.replace(/\.[a-z0-9]{2,5}$/i, '');
  const ref = sinExtension.includes('/') ? sinExtension : `${CARPETA_PRODUCTOS}/${sinExtension}`;
  return { proveedor: 'cloudinary', ref, tipo: 'imagen' };
}

export function casosImportacion(d: D) {
  const revistasCasos = casosRevistas(d);

  async function importar(textoCsv: string, opciones: { simular?: boolean; campanaVigente?: boolean } = {}): Promise<ReporteImportacion> {
    const simular = !!opciones.simular;
    const filas = leerCsv(textoCsv);
    const reporte: ReporteImportacion = { simulado: simular, creados: 0, actualizados: 0, errores: [], ausentes: [] };
    if (!filas.length) {
      reporte.errores.push({ fila: 1, mensaje: 'El archivo está vacío o no tiene encabezados' });
      return reporte;
    }
    if (!('revista' in filas[0]) || !('codigo' in filas[0]) || !('nombre' in filas[0])) {
      reporte.errores.push({ fila: 1, mensaje: 'Faltan las columnas obligatorias: revista, codigo, nombre' });
      return reporte;
    }

    const revistas = new Map<string, Revista>((await d.revistas.listar()).map((r) => [r.slug, r]));
    const categorias = new Map<string, Categoria>((await d.categorias.listar()).map((c) => [c.slug, c]));
    const codigosPorRevista = new Map<string, Set<string>>();
    const campanasPorRevista = new Map<string, Set<string>>();
    const ahora = d.reloj.ahora();
    const aGuardar: Producto[] = [];
    const ordenSiguiente = new Map<string, number>();

    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const numFila = i + 2; // +1 por encabezado, +1 porque Excel cuenta desde 1
      const revista = revistas.get(slugificar(f.revista ?? ''));
      if (!revista) { reporte.errores.push({ fila: numFila, mensaje: `Revista "${f.revista}" no existe. Créala primero en Revistas.` }); continue; }
      const codigo = (f.codigo ?? '').trim();
      const nombre = (f.nombre ?? '').trim();
      if (!codigo || !nombre) { reporte.errores.push({ fila: numFila, mensaje: 'Falta código o nombre' }); continue; }
      if (codigo.length > 40 || nombre.length > 120) { reporte.errores.push({ fila: numFila, mensaje: 'Código o nombre demasiado largo' }); continue; }

      const codigos = codigosPorRevista.get(revista.id) ?? new Set<string>();
      if (codigos.has(codigo.toUpperCase())) { reporte.errores.push({ fila: numFila, mensaje: `Código ${codigo} repetido en el archivo` }); continue; }
      codigos.add(codigo.toUpperCase());
      codigosPorRevista.set(revista.id, codigos);

      // Categoría y subcategoría (la subcategoría se crea si no existe).
      let categoriaIds: string[] | undefined;
      if (f.categoria) {
        const cat = categorias.get(slugificar(f.categoria));
        if (!cat) { reporte.errores.push({ fila: numFila, mensaje: `Categoría "${f.categoria}" no existe` }); continue; }
        categoriaIds = [cat.id];
        if (f.subcategoria) {
          const slugSub = slugificar(f.subcategoria);
          let sub = categorias.get(slugSub);
          if (sub && sub.padreId !== cat.id) { reporte.errores.push({ fila: numFila, mensaje: `"${f.subcategoria}" ya existe en otra categoría` }); continue; }
          if (!sub) {
            sub = { id: d.ids.nuevo(), nombre: f.subcategoria.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), slug: slugSub, icono: '', orden: 0, padreId: cat.id };
            if (!simular) await d.categorias.guardar(sub);
            categorias.set(slugSub, sub);
          }
          categoriaIds = [sub.id];
        }
      }

      let campanaId: string | null | undefined;
      if (f.campana) {
        const set = campanasPorRevista.get(revista.id) ?? new Set<string>();
        set.add(f.campana.trim().toUpperCase());
        campanasPorRevista.set(revista.id, set);
        campanaId = simular ? null : (await revistasCasos.asegurarCampana(revista.id, f.campana)).id;
      }

      let disponibilidad: Disponibilidad | undefined;
      if (f.disponibilidad) {
        const v = f.disponibilidad.trim().toLowerCase().replace('por pedido', 'pedido').replace('en vitrina', 'vitrina') as Disponibilidad;
        if (!DISPONIBILIDADES.includes(v)) { reporte.errores.push({ fila: numFila, mensaje: 'disponibilidad debe ser vitrina, pedido o agotado' }); continue; }
        disponibilidad = v;
      }

      const pagina = f.pagina_pdf ? parseInt(f.pagina_pdf, 10) : NaN;
      const imagen = mediaDesdeColumna(f.imagen ?? '');
      const caracteristicas = f.caracteristicas ? f.caracteristicas.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 8) : undefined;
      const cambios: Partial<Producto> = {
        nombre,
        ...(f.linea !== undefined && f.linea !== '' && { linea: f.linea.slice(0, 80) }),
        ...(categoriaIds && { categoriaIds }),
        ...(f.contenido && { contenido: f.contenido.slice(0, 40) }),
        ...(f.descripcion && { descripcion: f.descripcion.slice(0, 1000) }),
        ...(caracteristicas && { caracteristicas }),
        ...(campanaId !== undefined && { campanaId }),
        ...(Number.isFinite(pagina) && { paginaCatalogo: pagina }),
        ...(disponibilidad && { disponibilidad }),
        ...(f.etiqueta && { etiqueta: f.etiqueta.slice(0, 20) }),
        ...(siNo(f.visible_tienda) !== undefined && { visibleTienda: siNo(f.visible_tienda) }),
        ...(siNo(f.visible_tv) !== undefined && { visibleTV: siNo(f.visible_tv) }),
      };

      const existente = await d.productos.porCodigo(revista.id, codigo);
      if (existente) {
        const imagenes = imagen && !existente.imagenes.some((m) => m.ref === imagen.ref) ? [imagen, ...existente.imagenes].slice(0, 8) : existente.imagenes;
        aGuardar.push({ ...existente, ...cambios, imagenes, actualizadoEn: ahora });
        reporte.actualizados++;
      } else {
        if (!ordenSiguiente.has(revista.id)) ordenSiguiente.set(revista.id, await d.productos.contarPorRevista(revista.id));
        const orden = ordenSiguiente.get(revista.id)!;
        ordenSiguiente.set(revista.id, orden + 1);
        const slug = simular ? slugificar(`${nombre}-${codigo}`) : await slugUnico(`${nombre}-${codigo}`, async (s) => aGuardar.some((p) => p.slug === s) || (await d.productos.existeSlug(s)));
        aGuardar.push({
          id: d.ids.nuevo(), revistaId: revista.id, codigo, slug, nombre,
          linea: null, categoriaIds: [], campanaId: null, descripcion: null, caracteristicas: [], contenido: null,
          disponibilidad: 'pedido', stockVitrina: null, imagenes: imagen ? [imagen] : [], video: null,
          pasosPreparacion: [], advertencias: null, etiqueta: null, color: revista.color, paginaCatalogo: null,
          visibleTienda: true, visibleTV: false, ordenTV: orden, creadoEn: ahora, actualizadoEn: ahora,
          ...cambios,
        } as Producto);
        reporte.creados++;
      }
    }

    // Productos visibles que no vinieron en el archivo: candidatos a ocultar.
    for (const [revistaId, codigos] of codigosPorRevista) {
      const revista = [...revistas.values()].find((r) => r.id === revistaId)!;
      for (const p of await d.productos.listarPorRevista(revistaId)) {
        if (p.visibleTienda && !codigos.has(p.codigo.toUpperCase())) {
          reporte.ausentes.push({ id: p.id, revista: revista.nombre, codigo: p.codigo, nombre: p.nombre });
        }
      }
    }

    if (!simular && aGuardar.length) {
      await d.productos.guardarVarios(aGuardar);
      if (opciones.campanaVigente) {
        for (const [revistaId, campanas] of campanasPorRevista) {
          if (campanas.size !== 1) continue;
          const c = await d.campanas.porCodigo(revistaId, [...campanas][0]);
          const r = await d.revistas.porId(revistaId);
          if (c && r) await d.revistas.guardar({ ...r, campanaVigenteId: c.id, actualizadoEn: ahora });
        }
      }
      await marcarCambioCatalogo(d);
    }
    return reporte;
  }

  async function exportar(): Promise<string> {
    const [productos, revistas, categorias] = await Promise.all([d.productos.todos(), d.revistas.listar(), d.categorias.listar()]);
    const rev = new Map(revistas.map((r) => [r.id, r]));
    const cat = new Map(categorias.map((c) => [c.id, c]));
    const campanaIds = [...new Set(productos.map((p) => p.campanaId).filter((x): x is string => !!x))];
    const camp = new Map((await d.campanas.porIds(campanaIds)).map((c) => [c.id, c]));
    const filas = productos.map((p) => {
      const c = p.categoriaIds.map((id) => cat.get(id)).find(Boolean);
      const madre = c?.padreId ? cat.get(c.padreId) : null;
      const img = p.imagenes[0];
      return {
        revista: rev.get(p.revistaId)?.slug ?? '',
        codigo: p.codigo,
        nombre: p.nombre,
        linea: p.linea,
        categoria: madre ? madre.slug : c?.slug,
        subcategoria: madre ? c?.slug : '',
        contenido: p.contenido,
        descripcion: p.descripcion,
        caracteristicas: p.caracteristicas.join(' | '),
        campana: p.campanaId ? camp.get(p.campanaId)?.codigo : '',
        pagina_pdf: p.paginaCatalogo,
        imagen: img ? (img.proveedor === 'cloudinary' && img.ref.startsWith(CARPETA_PRODUCTOS + '/') ? img.ref.slice(CARPETA_PRODUCTOS.length + 1) : img.ref) : '',
        disponibilidad: p.disponibilidad,
        etiqueta: p.etiqueta,
        visible_tienda: p.visibleTienda ? 'si' : 'no',
        visible_tv: p.visibleTV ? 'si' : 'no',
      };
    });
    return escribirCsv([...COLUMNAS_CSV], filas);
  }

  return { importar, exportar };
}
