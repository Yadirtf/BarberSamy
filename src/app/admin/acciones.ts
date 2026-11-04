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
import { casos } from '@/servidor/contenedor';
import { errorAccion, type EstadoAccion } from '@/servidor/respuestas';
import { abrirSesion, cerrarSesion, requerirSesion } from '@/servidor/sesion';
import { headers } from 'next/headers';
import type { ReporteImportacion } from '@/application/catalogo/importacion';

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
    });
    invalidarCatalogo();
    return ok('Configuración guardada');
  } catch (e) { return errorAccion(e); }
}

// ---------- Importación ----------
export type EstadoImportacion = (EstadoAccion & { reporte?: ReporteImportacion }) | null;

export async function accionImportar(_: EstadoImportacion, fd: FormData): Promise<EstadoImportacion> {
  await requerirSesion();
  try {
    const archivo = fd.get('archivo');
    if (!(archivo instanceof File) || !archivo.size) return { ok: false, mensaje: 'Elige un archivo CSV' };
    if (archivo.size > 3_000_000) return { ok: false, mensaje: 'El archivo es muy grande (máx. 3 MB). Divídelo por revista.' };
    const simular = fd.get('modo') !== 'importar';
    const reporte = await casos().importacion.importar(await archivo.text(), { simular, campanaVigente: fd.get('vigente') === 'on' });
    if (!simular) invalidarCatalogo();
    const resumen = `${reporte.creados} nuevos, ${reporte.actualizados} actualizados, ${reporte.errores.length} con error`;
    return { ok: reporte.errores.length === 0, mensaje: simular ? `Revisión (no se guardó nada): ${resumen}` : `Importado: ${resumen}`, reporte };
  } catch (e) { return errorAccion(e); }
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
