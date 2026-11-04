export const ROLES = ['admin', 'editor'] as const;
export type Rol = (typeof ROLES)[number];

/** Persona con acceso al panel. editor: catálogo y pedidos. admin: además configuración y usuarios. */
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  hashClave: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
}

export interface Sesion {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: Rol;
}
