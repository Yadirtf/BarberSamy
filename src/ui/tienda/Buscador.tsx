export function Buscador({ valor = '', autoFocus = false }: { valor?: string; autoFocus?: boolean }) {
  return (
    <form action="/productos" className="buscador" role="search">
      <label htmlFor="q" className="sr">Buscar productos</label>
      <input id="q" type="search" name="q" defaultValue={valor} placeholder="Buscar por nombre o código" autoFocus={autoFocus} enterKeyHint="search" />
      <button className="btn" type="submit" aria-label="Buscar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
    </form>
  );
}
