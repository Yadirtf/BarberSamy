'use client';

import { useFormStatus } from 'react-dom';
import type { EstadoAccion } from '@/servidor/respuestas';

export function BotonEnviar({ children, clase = 'btn btn-primario', pendiente = 'Guardando…', ...resto }: { children: React.ReactNode; clase?: string; pendiente?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button type="submit" className={clase} disabled={pending} {...resto}>{pending ? pendiente : children}</button>;
}

export function Mensaje({ estado }: { estado: EstadoAccion }) {
  if (!estado) return null;
  return <p className={`aviso ${estado.ok ? 'aviso-ok' : 'aviso-error'}`} role={estado.ok ? 'status' : 'alert'}>{estado.mensaje}</p>;
}

/** Pide confirmación antes de una acción que borra algo. */
export function BotonConfirmar({ children, mensaje, clase = 'btn btn-chico btn-peligro' }: { children: React.ReactNode; mensaje: string; clase?: string }) {
  return (
    <button type="submit" className={clase} onClick={(e) => { if (!window.confirm(mensaje)) e.preventDefault(); }}>{children}</button>
  );
}
