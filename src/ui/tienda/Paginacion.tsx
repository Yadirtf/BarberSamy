import Link from 'next/link';

export function Paginacion({ pagina, total, porPagina, href }: { pagina: number; total: number; porPagina: number; href: (p: number) => string }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Páginas">
      {pagina > 1 ? <Link className="btn btn-chico" href={href(pagina - 1)}>← Anterior</Link> : <span />}
      <span className="suave pequeno">Página {pagina} de {paginas}</span>
      {pagina < paginas ? <Link className="btn btn-chico" href={href(pagina + 1)}>Siguiente →</Link> : <span />}
    </nav>
  );
}
