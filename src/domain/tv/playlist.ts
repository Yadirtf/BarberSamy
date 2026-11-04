/**
 * Lo que el televisor descarga. Es un JSON plano y ya resuelto (URLs listas, sin ids
 * internos innecesarios) para que el motor del TV, escrito en ES5, no tenga que pensar.
 */
export interface PlaylistTV {
  version: number;
  generado: string;
  ajustes: {
    negocio: string;
    eslogan: string;
    mensajeMarca: string;
    whatsapp: string;
    urlTienda: string;
    segundosPorProducto: number;
    segundosPortada: number;
    mostrarMarcaCada: number;
    maxPorRevista: number;
    modoLiviano: 'auto' | 'siempre' | 'nunca';
    ajustePantalla: number;
  };
  revistas: RevistaTV[];
}

export interface RevistaTV {
  slug: string;
  nombre: string;
  color: string;
  logo: string | null;
  campana: string | null;
  productos: ProductoTV[];
}

export interface ProductoTV {
  slug: string;
  nombre: string;
  linea: string | null;
  categoria: string | null;
  codigo: string;
  descripcion: string | null;
  caracteristicas: string[];
  contenido: string | null;
  etiqueta: string | null;
  color: string;
  imagen: string | null;
  video: string | null;
  pasos: string[];
  advertencias: string | null;
  vitrina: boolean;
  url: string;
}
