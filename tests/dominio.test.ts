import { describe, expect, it } from 'vitest';
import { disponibilidadSegunStock } from '@/domain/catalogo/producto';
import { esFinal, puedeTransicionar } from '@/domain/pedidos/estados';
import { leerCsv, escribirCsv } from '@/domain/shared/csv';
import { formatearNumeroPedido, slugificar } from '@/domain/shared/texto';
import { hashPbkdf2 } from '@/infrastructure/auth/hash';
import { firmarSesion, leerSesion } from '@/infrastructure/auth/token';
import { mediaDesdeColumna } from '@/application/catalogo/importacion';

describe('texto', () => {
  it('slug sin tildes ni símbolos', () => {
    expect(slugificar('Ésika — Perfumería & Más!')).toBe('esika-perfumeria-mas');
    expect(formatearNumeroPedido(42)).toBe('0042');
  });
});

describe('csv', () => {
  it('lee comas, punto y coma, comillas y saltos de línea', () => {
    expect(leerCsv('a,b\n1,"x, ""y"""\n')).toEqual([{ a: '1', b: 'x, "y"' }]);
    expect(leerCsv('﻿A;B\r\n1;"dos\nlíneas"\r\n\r\n')).toEqual([{ a: '1', b: 'dos\nlíneas' }]);
  });
  it('escribe y vuelve a leer igual', () => {
    const csv = escribirCsv(['a', 'b'], [{ a: 'uno; dos', b: 'con "comillas"' }]);
    expect(leerCsv(csv)).toEqual([{ a: 'uno; dos', b: 'con "comillas"' }]);
  });
});

describe('estados', () => {
  it('un pedido de vitrina puede entregarse sin pasar por el proveedor', () => {
    expect(puedeTransicionar('confirmado', 'entregado')).toBe(true);
    expect(puedeTransicionar('nuevo', 'llego')).toBe(false);
    expect(esFinal('cancelado')).toBe(true);
  });
});

describe('producto', () => {
  it('sin stock de vitrina pasa a por pedido', () => {
    expect(disponibilidadSegunStock({ disponibilidad: 'vitrina', stockVitrina: 0 })).toBe('pedido');
    expect(disponibilidadSegunStock({ disponibilidad: 'vitrina', stockVitrina: null })).toBe('vitrina');
  });
  it('la columna imagen del CSV apunta a la carpeta de productos en Cloudinary', () => {
    expect(mediaDesdeColumna('yanbal-12345.webp')).toEqual({ proveedor: 'cloudinary', ref: 'tienda/productos/yanbal-12345', tipo: 'imagen' });
    expect(mediaDesdeColumna('https://x.com/a.png')?.proveedor).toBe('url');
    expect(mediaDesdeColumna('')).toBeNull();
  });
});

describe('seguridad', () => {
  it('hash de contraseñas con PBKDF2', async () => {
    const h = await hashPbkdf2.hash('clave-muy-segura');
    expect(h).toMatch(/^pbkdf2\$100000\$/);
    expect(await hashPbkdf2.verificar('clave-muy-segura', h)).toBe(true);
    expect(await hashPbkdf2.verificar('otra', h)).toBe(false);
  });
  it('sesión firmada: rechaza tokens alterados o con otro secreto', async () => {
    const secreto = 'x'.repeat(40);
    const t = await firmarSesion({ usuarioId: 'u1', email: 'a@b.co', nombre: 'A', rol: 'admin' }, secreto);
    expect(await leerSesion(t, secreto)).toMatchObject({ usuarioId: 'u1', rol: 'admin' });
    expect(await leerSesion(t, 'y'.repeat(40))).toBeNull();
    expect(await leerSesion(t.slice(0, -2) + 'aa', secreto)).toBeNull();
  });
});
