/**
 * Conversión entre entidades del dominio ({ id }) y documentos de Mongo ({ _id }).
 * Los ids son strings (hex de ObjectId generado por la app), así el dominio no depende de Mongo.
 */
export type ConId = { id: string };
export type Doc<T extends ConId> = Omit<T, 'id'> & { _id: string };

export function aDoc<T extends ConId>(entidad: T): Doc<T> {
  const { id, ...resto } = entidad;
  return { _id: id, ...resto } as Doc<T>;
}

export function deDoc<T extends ConId>(doc: Doc<T> | null | undefined, extras: string[] = []): T | null {
  if (!doc) return null;
  const { _id, ...resto } = doc as Record<string, unknown> & { _id: string };
  for (const k of extras) delete resto[k];
  return { id: _id, ...resto } as unknown as T;
}

/** Escapa un texto para usarlo dentro de una expresión regular. */
export function escaparRegex(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
