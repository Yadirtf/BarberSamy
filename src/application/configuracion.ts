import { ajustesTVSchema, type Configuracion, datosConfiguracionSchema } from '@/domain/configuracion';
import { marcarCambioCatalogo } from './catalogo/version';
import type { Dependencias } from './puertos';
import { validar } from './validar';

type D = Pick<Dependencias, 'configuracion' | 'revistas' | 'contadores'>;

export function casosConfiguracion(d: D) {
  async function guardarGeneral(datos: unknown): Promise<Configuracion> {
    const v = validar(datosConfiguracionSchema, datos);
    const actual = await d.configuracion.obtener();
    const nueva = { ...actual, ...v };
    await d.configuracion.guardar(nueva);
    await marcarCambioCatalogo(d);
    return nueva;
  }

  async function guardarTV(datos: unknown): Promise<Configuracion> {
    const v = validar(ajustesTVSchema, datos);
    const existentes = new Set((await d.revistas.listar()).map((r) => r.id));
    const revistaIds = [...new Set(v.revistaIds)].filter((id) => existentes.has(id));
    const actual = await d.configuracion.obtener();
    const nueva = { ...actual, tv: { ...v, revistaIds } };
    await d.configuracion.guardar(nueva);
    await marcarCambioCatalogo(d);
    return nueva;
  }

  return { guardarGeneral, guardarTV };
}
