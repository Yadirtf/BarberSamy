/** Brillo de color detrás de la foto del producto (el mismo recurso visual de la vitrina del TV). */
export function fondoProducto(color: string): React.CSSProperties {
  const h = /^#[0-9a-f]{6}$/i.test(color) ? color : '#d81b60';
  return { background: `radial-gradient(closest-side, ${h}55, ${h}10 70%, transparent), #ffffff` };
}
