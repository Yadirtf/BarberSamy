import { describe, expect, it } from 'vitest';
import { casosInstalacion, REVISTAS_BASE } from '@/application/instalacion';
import { CATEGORIAS_BASE } from '@/domain/catalogo/categoria';
import { dependenciasEnMemoria } from './memoria';

const CODIGO = 'x'.repeat(40);
const datos = { codigo: CODIGO, nombre: 'Yadir', email: 'Admin@Tienda.co', clave: 'una-clave-larga', confirmacion: 'una-clave-larga' };

describe('instalación inicial', () => {
  it('crea el administrador, las categorías y las revistas base', async () => {
    const d = dependenciasEnMemoria();
    const i = casosInstalacion(d);
    expect(await i.pendiente()).toBe(true);
    const s = await i.instalar(datos, CODIGO);
    expect(s).toMatchObject({ email: 'admin@tienda.co', rol: 'admin' });
    expect(await i.pendiente()).toBe(false);
    expect((await d.categorias.listar()).length).toBe(CATEGORIAS_BASE.length);
    const revistas = await d.revistas.listar();
    expect(revistas.length).toBe(REVISTAS_BASE.length);
    expect(revistas.find((r) => r.nombre === 'Naprolap')?.avisoSalud).toBe(true);
  });

  it('no deja crear un segundo administrador', async () => {
    const d = dependenciasEnMemoria();
    const i = casosInstalacion(d);
    await i.instalar(datos, CODIGO);
    await expect(i.instalar({ ...datos, email: 'otro@tienda.co' }, CODIGO)).rejects.toThrow('ya tiene administrador');
  });

  it('exige el código correcto y un secreto configurado', async () => {
    const i = casosInstalacion(dependenciasEnMemoria());
    await expect(i.instalar({ ...datos, codigo: 'y'.repeat(40) }, CODIGO)).rejects.toThrow('código');
    await expect(i.instalar(datos, 'corto')).rejects.toThrow('SESSION_SECRET');
    await expect(i.instalar({ ...datos, confirmacion: 'otra-clave-larga' }, CODIGO)).rejects.toThrow('no coinciden');
    expect(await i.pendiente()).toBe(true);
  });

  it('sembrar el catálogo base se puede repetir sin duplicar', async () => {
    const d = dependenciasEnMemoria();
    const i = casosInstalacion(d);
    await i.sembrarCatalogoBase();
    expect(await i.sembrarCatalogoBase()).toEqual({ categorias: 0, revistas: 0 });
  });
});
