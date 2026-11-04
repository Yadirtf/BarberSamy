'use client';

import { useState } from 'react';

export function Galeria({ fotos, nombre, fondo }: { fotos: { grande: string; mini: string }[]; nombre: string; fondo: React.CSSProperties }) {
  const [i, setI] = useState(0);
  if (!fotos.length) {
    return <div className="galeria-principal" style={fondo}><span className="sin-foto" style={{ fontFamily: 'Hombros', fontSize: '5rem', opacity: .3 }}>{nombre.slice(0, 1)}</span></div>;
  }
  return (
    <div>
      <div className="galeria-principal" style={fondo}>
        <img src={fotos[i].grande} alt={nombre} width={900} height={900} />
      </div>
      {fotos.length > 1 && (
        <div className="galeria-miniaturas">
          {fotos.map((f, k) => (
            <button key={f.mini} type="button" className={k === i ? 'activo' : ''} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`}>
              <img src={f.mini} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
