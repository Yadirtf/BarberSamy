'use client';

import { useSyncExternalStore } from 'react';
import type { Disponibilidad } from '@/domain/catalogo/producto';

/**
 * Carrito guardado en el celular del cliente (localStorage), sin cuenta ni registro.
 * Se guarda lo justo para pintar el carrito sin consultar al servidor; al abrirlo se
 * verifica contra el catálogo por si algún producto salió de la campaña.
 */
export interface ItemCatalogo {
  tipo: 'producto';
  productoId: string;
  slug: string;
  nombre: string;
  codigo: string;
  revistaId: string;
  revistaNombre: string;
  imagen: string | null;
  disponibilidad: Disponibilidad;
  cantidad: number;
}

/** Producto pedido escribiendo revista + código (lo que no está cargado en la tienda). */
export interface ItemPorCodigo {
  tipo: 'codigo';
  clave: string;
  revistaId: string;
  revistaNombre: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
}

export type ItemCarrito = ItemCatalogo | ItemPorCodigo;

export interface EstadoCarrito {
  items: ItemCarrito[];
  nota: string;
  nombre: string;
  telefono: string;
}

const CLAVE = 'tienda-samy:carrito:v1';
const VACIO: EstadoCarrito = { items: [], nota: '', nombre: '', telefono: '' };

let estado: EstadoCarrito = VACIO;
let cargado = false;
const oyentes = new Set<() => void>();

function cargar() {
  if (cargado || typeof window === 'undefined') return;
  cargado = true;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (crudo) estado = { ...VACIO, ...JSON.parse(crudo) };
  } catch {
    estado = VACIO;
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE) return;
    cargado = false;
    cargar();
    oyentes.forEach((f) => f());
  });
}

function guardar(nuevo: EstadoCarrito) {
  estado = nuevo;
  try { window.localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* modo privado: queda en memoria */ }
  oyentes.forEach((f) => f());
}

const claveDe = (i: ItemCarrito) => (i.tipo === 'producto' ? i.productoId : i.clave);

export const carrito = {
  obtener: () => { cargar(); return estado; },
  suscribir(f: () => void) { cargar(); oyentes.add(f); return () => { oyentes.delete(f); }; },
  agregar(item: ItemCarrito) {
    const s = carrito.obtener();
    const existente = s.items.find((i) => claveDe(i) === claveDe(item));
    const items = existente
      ? s.items.map((i) => (i === existente ? { ...i, cantidad: Math.min(99, i.cantidad + item.cantidad) } : i))
      : [...s.items, item];
    guardar({ ...s, items });
  },
  cambiarCantidad(clave: string, cantidad: number) {
    const s = carrito.obtener();
    guardar({ ...s, items: s.items.map((i) => (claveDe(i) === clave ? { ...i, cantidad: Math.max(1, Math.min(99, cantidad)) } : i)) });
  },
  quitar(clave: string) {
    const s = carrito.obtener();
    guardar({ ...s, items: s.items.filter((i) => claveDe(i) !== clave) });
  },
  actualizarDatos(datos: Partial<Pick<EstadoCarrito, 'nota' | 'nombre' | 'telefono'>>) {
    guardar({ ...carrito.obtener(), ...datos });
  },
  /** Vacía los productos pero recuerda nombre y teléfono para el próximo pedido. */
  vaciar() {
    const s = carrito.obtener();
    guardar({ ...s, items: [], nota: '' });
  },
  claveDe,
};

export function useCarrito(): EstadoCarrito {
  return useSyncExternalStore(carrito.suscribir, carrito.obtener, () => VACIO);
}

export function useUnidades(): number {
  return useCarrito().items.reduce((s, i) => s + i.cantidad, 0);
}

/** Si el cliente llegó desde el QR del TV, el pedido queda marcado con origen "tv". */
const CLAVE_ORIGEN = 'tienda-samy:origen';
export function marcarOrigenTV() {
  try { window.sessionStorage.setItem(CLAVE_ORIGEN, 'tv'); } catch { /* sin almacenamiento */ }
}
export function origenPedido(): 'web' | 'tv' {
  try { return window.sessionStorage.getItem(CLAVE_ORIGEN) === 'tv' ? 'tv' : 'web'; } catch { return 'web'; }
}
