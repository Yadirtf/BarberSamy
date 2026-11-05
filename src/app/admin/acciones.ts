'use server';

/**
 * Acciones de los formularios del admin (Server Actions). Son una capa delgada:
 * verifican la sesión, llaman al caso de uso y refrescan la caché pública.
 * Toda regla de negocio vive en src/application y src/domain.
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { EstadoPedido } from '@/domain/pedidos/estados';
import { invalidarCatalogo } from '@/servidor/cache';
import { casos, entorno, prepararIndices } from '@/servidor/contenedor';
import { errorAccion, type EstadoAccion } from '@/servidor/respuestas';
import { abrirSesion, cerrarSesion, requerirSesion } from '@/servidor/sesion';
import { headers } from 'next/headers';
import type { ReporteImportacion } from '@/application/catalogo/importacion';
import type { Media } from '@/domain/media';

const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje });
const json = (fd: FormData, campo = 'datos') => JSON.parse(String(fd.get(campo) ?? '{}'));
const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? '').trim();

// ---------- Sesión ----------
export async function accionLogin(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const h = await headers();
    const ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for');
    const s = await casos().auth.iniciarSesion(texto(fd, 'email'), String(fd.get('clave') ?? ''), ip);
    await abrirSesion(s);
  } catch (e) {
    return errorAccion(e);
  }
  redirect('/admin');
}

/** Primer ingreso: crea el primer administrador (solo si no hay usuarios) y abre su sesión. */
export async function accionInstalar(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const c = casos();
    if (!(await c.instalacion.pendiente())) return { ok: false, mensaje: 'El sistema ya tiene administrador. Entra con tu usuario.' };
    await prepararIndices();
    const s = await c.instalacion.instalar(
      {
        codigo: String(fd.get('codigo') ?? ''),
        nombre: texto(fd, 'nombre'),
        email: texto(fd, 'email'),
        clave: String(fd.get('clave') ?? ''),
        confirmacion: String(fd.get('confirmacion') ?? ''),
      },
      entorno().secretoSesion,
    );
    invalidarCatalogo();
    await abrirSesion(s);
  } catch (e) {
    return errorAccion(e);
  }
  redirect('/admin');
}

export async function accionSalir() {
  await cerrarSesion();
  redirect('/admin/login');
}

export async function accionCambiarClave(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const s = await requerirSesion();
  try {
    await casos().auth.cambiarClave(s.usuarioId, String(fd.get('actual') ?? ''), String(fd.get('nueva') ?? ''));
    return ok('Contraseña actualizada');
  } catch (e) { return errorAccion(e); }
}

export async function accionCrearUsuario(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion('admin');
  try {
    const rol = texto(fd, 'rol') === 'admin' ? 'admin' : 'editor';
    await casos().auth.crearUsuario({ email: texto(fd, 'email'), nombre: texto(fd, 'nombre'), clave: String(fd.get('clave') ?? ''), rol });
    revalidatePath('/admin/configuracion');
    return ok('Usuario creado');
  } catch (e) { return errorAccion(e); }
}

// ---------- Productos ----------
export async function accionGuardarProducto(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  const id = texto(fd, 'id');
  let destino: string;
  try {
    const c = casos().productos;
    const p = id ? await c.actualizar(id, json(fd)) : await c.crear(json(fd));
    invalidarCatalogo();
    if (id) return ok('Cambios guardados');
    destino = `/admin/productos/${p.id}?creado=1`;
  } catch (e) { return errorAccion(e); }
  redirect(destino);
}

export async function accionDuplicarProducto(fd: FormData) {
  await requerirSesion();
  const copia = await casos().productos.duplicar(texto(fd, 'id'));
  redirect(`/admin/productos/${copia.id}?duplicado=1`);
}

export async function accionEliminarProducto(fd: FormData) {
  await requerirSesion();
  await casos().productos.eliminar(texto(fd, 'id'));
  invalidarCatalogo();
  redirect('/admin/productos?eliminado=1');
}

export async function accionVisibilidad(fd: FormData) {
  await requerirSesion();
  const campo = texto(fd, 'campo') === 'visibleTV' ? 'visibleTV' : 'visibleTienda';
  await casos().productos.cambiarVisibilidad(texto(fd, 'id'), { [campo]: texto(fd, 'valor') === '1' });
  invalidarCatalogo();
  revalidatePath('/admin/productos');
}

// ---------- Fotos por lotes y recorte del PDF ----------
export type ProductoParaFoto = { codigo: string; nombre: string; pagina: number | null; fotos: number };

export async function accionProductosParaFotos(revistaId: string): Promise<ProductoParaFoto[]> {
  await requerirSesion();
  return casos().productos.listarParaFotos(revistaId);
}

export async function accionAsignarFoto(revistaId: string, codigo: string, foto: Media): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    const p = await casos().productos.agregarFotoPorCodigo(revistaId, codigo, foto);
    invalidarCatalogo();
    return ok(`Foto guardada en ${p.nombre}`);
  } catch (e) { return errorAccion(e); }
}

// ---------- Revistas y campañas ----------
export async function accionGuardarRevista(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  const id = texto(fd, 'id');
  let destino: string;
  try {
    const c = casos().revistas;
    const r = id ? await c.actualizar(id, json(fd)) : await c.crear(json(fd));
    invalidarCatalogo();
    if (id) return ok('Revista guardada');
    destino = `/admin/revistas/${r.id}`;
  } catch (e) { return errorAccion(e); }
  redirect(destino);
}

export async function accionEliminarRevista(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    await casos().revistas.eliminar(texto(fd, 'id'));
    invalidarCatalogo();
  } catch (e) { return errorAccion(e); }
  redirect('/admin/revistas');
}

export async function accionCrearCampana(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    const revistaId = texto(fd, 'revistaId');
    await casos().revistas.crearCampana(
      { revistaId, codigo: texto(fd, 'codigo'), inicio: texto(fd, 'inicio') || null, fin: texto(fd, 'fin') || null },
      fd.get('vigente') === 'on',
    );
    invalidarCatalogo();
    revalidatePath(`/admin/revistas/${revistaId}`);
    return ok('Campaña creada');
  } catch (e) { return errorAccion(e); }
}

export async function accionEliminarCampana(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    await casos().revistas.eliminarCampana(texto(fd, 'id'));
    invalidarCatalogo();
    revalidatePath(`/admin/revistas/${texto(fd, 'revistaId')}`);
    return ok('Campaña eliminada');
  } catch (e) { return errorAccion(e); }
}

// ---------- Categorías ----------
export async function accionGuardarCategoria(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  const id = texto(fd, 'id');
  try {
    const datos = { nombre: texto(fd, 'nombre'), icono: texto(fd, 'icono'), orden: texto(fd, 'orden') || 0, padreId: texto(fd, 'padreId') || null, slug: texto(fd, 'slug') || undefined };
    if (id) await casos().categorias.actualizar(id, datos);
    else await casos().categorias.crear(datos);
    invalidarCatalogo();
    revalidatePath('/admin/categorias');
    return ok(id ? 'Categoría guardada' : 'Categoría creada');
  } catch (e) { return errorAccion(e); }
}

export async function accionEliminarCategoria(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    await casos().categorias.eliminar(texto(fd, 'id'));
    invalidarCatalogo();
    revalidatePath('/admin/categorias');
    return ok('Categoría eliminada');
  } catch (e) { return errorAccion(e); }
}

// ---------- Pedidos ----------
export async function accionCambiarEstado(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    const id = texto(fd, 'id');
    await casos().pedidos.cambiar(id, texto(fd, 'estado') as EstadoPedido, texto(fd, 'nota') || null);
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath('/admin/pedidos');
    return ok('Estado actualizado');
  } catch (e) { return errorAccion(e); }
}

// ---------- Televisor y configuración ----------
export async function accionGuardarTV(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    const datos = json(fd) as { ajustes: unknown; ordenProductos?: Record<string, string[]> };
    const c = casos();
    await c.configuracion.guardarTV(datos.ajustes);
    for (const [revistaId, ids] of Object.entries(datos.ordenProductos ?? {})) await c.productos.ordenarTV(revistaId, ids);
    invalidarCatalogo();
    return ok('Televisor actualizado. El TV toma los cambios en menos de 5 minutos.');
  } catch (e) { return errorAccion(e); }
}

export async function accionGuardarConfiguracion(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion('admin');
  try {
    await casos().configuracion.guardarGeneral({
      negocio: texto(fd, 'negocio'),
      eslogan: texto(fd, 'eslogan'),
      whatsapp: texto(fd, 'whatsapp'),
      encabezadoPedido: texto(fd, 'encabezadoPedido'),
      mensajeMarcaTV: texto(fd, 'mensajeMarcaTV'),
      infoEntrega: texto(fd, 'infoEntrega'),
      mediosPago: texto(fd, 'mediosPago'),
    });
    invalidarCatalogo();
    return ok('Configuración guardada');
  } catch (e) { return errorAccion(e); }
}

// ---------- Importación ----------
/** Una tanda del CSV (el navegador parte el archivo para no pasar el límite de CPU de Cloudflare). */
export async function accionImportarTanda(
  textoCsv: string,
  opciones: { simular: boolean; campanaVigente: boolean; filaInicial: number },
): Promise<{ ok: true; reporte: ReporteImportacion } | { ok: false; mensaje: string }> {
  await requerirSesion();
  try {
    if (textoCsv.length > 400_000) return { ok: false, mensaje: 'Tanda demasiado grande' };
    // La caché pública se invalida una sola vez al final (accionTerminarImportacion).
    const reporte = await casos().importacion.importar(textoCsv, { ...opciones, ausentes: false });
    return { ok: true, reporte };
  } catch (e) {
    return { ok: false, mensaje: errorAccion(e)?.mensaje ?? 'Error' };
  }
}

/** Al terminar todas las tandas: refresca la tienda y lista los visibles que no vinieron en el archivo. */
export async function accionTerminarImportacion(
  codigosPorRevista: Record<string, string[]>,
  simular: boolean,
): Promise<ReporteImportacion['ausentes']> {
  await requerirSesion();
  if (!simular) invalidarCatalogo();
  return casos().importacion.ausentes(codigosPorRevista);
}

export async function accionOcultarProductos(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await requerirSesion();
  try {
    const ids = fd.getAll('ids').map(String).filter(Boolean);
    const n = await casos().productos.ocultar(ids);
    invalidarCatalogo();
    return ok(`${n} productos ocultados`);
  } catch (e) { return errorAccion(e); }
}
