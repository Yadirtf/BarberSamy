'use client';

/** Comparte la ficha del producto por WhatsApp (o con el menú del celular si existe). */
export function Compartir({ titulo, url }: { titulo: string; url: string }) {
  return (
    <button
      type="button"
      className="btn btn-chico"
      onClick={async () => {
        const enlace = url.startsWith('http') ? url : window.location.origin + url;
        if (navigator.share) {
          try { await navigator.share({ title: titulo, url: enlace }); return; } catch { /* cancelado */ }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo} ${enlace}`)}`, '_blank', 'noopener');
      }}
    >
      Compartir
    </button>
  );
}
