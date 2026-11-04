import { ObjectId } from 'mongodb';
import type { GeneradorIds, Reloj } from '@/application/puertos';

/** Ids con formato ObjectId (ordenables por fecha) guardados como texto. */
export const idsObjectId: GeneradorIds = { nuevo: () => new ObjectId().toHexString() };
export const relojSistema: Reloj = { ahora: () => new Date() };
