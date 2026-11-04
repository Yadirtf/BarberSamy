'use client';

import Link from 'next/link';
import { useState } from 'react';
import { carrito, type ItemCatalogo, useCarrito } from './carrito';

export function BotonAgregar({ item }: { item: Omit<ItemCatalogo, 'cantidad' | 'tipo'> }) {
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const enCarrito = useCarrito().items.find((i) => i.tipo === 'producto' && i.productoId === item.productoId);

  if (item.disponibilidad === 'agotado') {
    return <p className="aviso">Este producto está agotado por ahora.</p>;
  }

  return (
    <div className="pila">
      <div className="fila">
        <div className="cantidad" aria-label="Cantidad">
          <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Menos">−</button>
          <span aria-live="polite">{cantidad}</span>
          <button type="button" onClick={() => setCantidad((c) => Math.min(99, c + 1))} aria-label="Más">+</button>
        </div>
        <button
          type="button"
          className="btn btn-oro"
          style={{ flex: 1 }}
          onClick={() => {
            carrito.agregar({ ...item, tipo: 'producto', cantidad });
            setAgregado(true);
            setCantidad(1);
          }}
        >
          Agregar al pedido
        </button>
      </div>
      {(agregado || enCarrito) && (
        <p className="aviso aviso-ok fila entre" role="status">
          <span>{enCarrito ? `Tienes ${enCarrito.cantidad} en tu pedido.` : 'Agregado.'}</span>
          <Link href="/carrito" className="btn btn-chico">Ver pedido</Link>
        </p>
      )}
    </div>
  );
}
