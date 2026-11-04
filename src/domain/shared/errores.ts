/**
 * Errores de negocio. La capa de presentación los traduce a mensajes o códigos HTTP;
 * el dominio y los casos de uso nunca conocen HTTP.
 */
export class ErrorDominio extends Error {
  constructor(
    public readonly codigo: 'validacion' | 'no_encontrado' | 'conflicto' | 'no_autorizado' | 'limite',
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}

export const noEncontrado = (que: string) => new ErrorDominio('no_encontrado', `${que} no existe`);
export const conflicto = (mensaje: string, detalles?: unknown) => new ErrorDominio('conflicto', mensaje, detalles);
export const invalido = (mensaje: string, detalles?: unknown) => new ErrorDominio('validacion', mensaje, detalles);
