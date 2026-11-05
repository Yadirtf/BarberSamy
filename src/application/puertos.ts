/**
 * Puertos: lo que los casos de uso necesitan del mundo exterior, sin saber cómo se hace.
 * La infraestructura (Mongo, Cloudinary, WebCrypto) implementa estas interfaces y el
 * contenedor las conecta. Así se puede cambiar de base de datos o probar con memoria.
 */
import type { Campana } from '@/domain/catalogo/campana';
import type { Categoria } from '@/domain/catalogo/categoria';
import type { Disponibilidad, Producto } from '@/domain/catalogo/producto';
import type { Revista } from '@/domain/catalogo/revista';
import type { Configuracion } from '@/domain/configuracion';
import type { EstadoPedido, } from '@/domain/pedidos/estados';
import type { Pedido } from '@/domain/pedidos/pedido';
import type { Usuario } from '@/domain/usuarios/usuario';

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RevistaRepositorio {
  listar(opciones?: { soloActivas?: boolean }): Promise<Revista[]>;
  porId(id: string): Promise<Revista | null>;
  porSlug(slug: string): Promise<Revista | null>;
  porIds(ids: string[]): Promise<Revista[]>;
  existeSlug(slug: string, excluirId?: string): Promise<boolean>;
  guardar(revista: Revista): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface CampanaRepositorio {
  listarPorRevista(revistaId: string): Promise<Campana[]>;
  porId(id: string): Promise<Campana | null>;
  porIds(ids: string[]): Promise<Campana[]>;
  porCodigo(revistaId: string, codigo: string): Promise<Campana | null>;
  guardar(campana: Campana): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface CategoriaRepositorio {
  listar(): Promise<Categoria[]>;
  porId(id: string): Promise<Categoria | null>;
  porSlug(slug: string): Promise<Categoria | null>;
  existeSlug(slug: string, excluirId?: string): Promise<boolean>;
  guardar(categoria: Categoria): Promise<void>;
  eliminar(id: string): Promise<void>;
  contarHijas(id: string): Promise<number>;
}

export interface FiltroProductos {
  revistaId?: string;
  categoriaIds?: string[];
  disponibilidad?: Disponibilidad;
  texto?: string;
  soloVisiblesTienda?: boolean;
  soloVisiblesTV?: boolean;
  /** Excluir productos de revistas desactivadas. */
  revistaIdsActivas?: string[];
}

export type OrdenProductos = 'recientes' | 'nombre' | 'tv';

export interface ResumenProducto { id: string; codigo: string; nombre: string; pagina: number | null; fotos: number; visibleTienda: boolean }

export interface ProductoRepositorio {
  buscar(filtro: FiltroProductos, pagina: number, porPagina: number, orden?: OrdenProductos): Promise<Pagina<Producto>>;
  porId(id: string): Promise<Producto | null>;
  porSlug(slug: string): Promise<Producto | null>;
  porIds(ids: string[]): Promise<Producto[]>;
  porCodigo(revistaId: string, codigo: string): Promise<Producto | null>;
  porCodigos(revistaId: string, codigos: string[]): Promise<Producto[]>;
  listarPorRevista(revistaId: string): Promise<Producto[]>;
  /** Datos mínimos de todos los productos de una revista (consulta liviana, sin descripciones). */
  resumenPorRevista(revistaId: string): Promise<ResumenProducto[]>;
  existeSlug(slug: string, excluirId?: string): Promise<boolean>;
  guardar(producto: Producto): Promise<void>;
  guardarVarios(productos: Producto[]): Promise<void>;
  eliminar(id: string): Promise<void>;
  actualizarOrdenTV(idsEnOrden: string[]): Promise<void>;
  ocultar(ids: string[]): Promise<number>;
  contarPorRevista(revistaId: string): Promise<number>;
  contarPorCategoria(categoriaId: string): Promise<number>;
  contarPorCampana(campanaId: string): Promise<number>;
  todos(): Promise<Producto[]>;
}

export interface FiltroPedidos {
  estado?: EstadoPedido;
  desde?: Date;
  hasta?: Date;
  numero?: number;
}

export interface PedidoRepositorio {
  crear(pedido: Pedido): Promise<void>;
  guardar(pedido: Pedido): Promise<void>;
  porId(id: string): Promise<Pedido | null>;
  listar(filtro: FiltroPedidos, pagina: number, porPagina: number): Promise<Pagina<Pedido>>;
  listarPorEstado(estado: EstadoPedido): Promise<Pedido[]>;
  contarPorEstado(): Promise<Partial<Record<EstadoPedido, number>>>;
  todos(): Promise<Pedido[]>;
  /** Pedidos creados desde una fecha (para métricas). */
  creadosDesde(desde: Date): Promise<Pedido[]>;
}

export interface ConfiguracionRepositorio {
  obtener(): Promise<Configuracion>;
  guardar(config: Configuracion): Promise<void>;
}

export interface UsuarioRepositorio {
  porEmail(email: string): Promise<Usuario | null>;
  porId(id: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  guardar(usuario: Usuario): Promise<void>;
  contar(): Promise<number>;
}

/** Secuencias atómicas (número de pedido) y versión del catálogo para el TV. */
export interface Contadores {
  siguiente(nombre: string): Promise<number>;
  actual(nombre: string): Promise<number>;
}

/** Limita peticiones por clave (IP) en una ventana de tiempo, para frenar el spam de pedidos. */
export interface Limitador {
  permitir(clave: string, maximo: number, ventanaSegundos: number): Promise<boolean>;
}

export interface Reloj {
  ahora(): Date;
}

export interface GeneradorIds {
  nuevo(): string;
}

export interface HashClaves {
  hash(clave: string): Promise<string>;
  verificar(clave: string, hash: string): Promise<boolean>;
}

export interface FirmaMedios {
  firmarSubida(carpeta: string): Promise<{ cloudName: string; apiKey: string; timestamp: number; firma: string; carpeta: string }>;
}

/** Construye URLs públicas de medios a un ancho dado. */
export interface UrlsMedios {
  imagen(media: import('@/domain/media').Media | null | undefined, ancho: number): string | null;
  video(media: import('@/domain/media').Media | null | undefined, ancho: number): string | null;
}

export interface Dependencias {
  revistas: RevistaRepositorio;
  campanas: CampanaRepositorio;
  categorias: CategoriaRepositorio;
  productos: ProductoRepositorio;
  pedidos: PedidoRepositorio;
  configuracion: ConfiguracionRepositorio;
  usuarios: UsuarioRepositorio;
  contadores: Contadores;
  limitador: Limitador;
  reloj: Reloj;
  ids: GeneradorIds;
  hash: HashClaves;
  urls: UrlsMedios;
}
