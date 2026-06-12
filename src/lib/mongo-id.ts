import { ObjectId } from 'mongodb';

/**
 * Construye el valor de `_id` para una query a partir de un docId string.
 *
 * Los documentos creados por POST tienen `_id` de tipo ObjectId (autogenerado);
 * GET lo serializa como string hex de 24 chars. Otros documentos usan docIds
 * string personalizados (p.ej. 'main-profile', 'OK', 'notifications').
 *
 * Si `docId` es la representación hex de un ObjectId (round-trip exacto), se
 * devuelve como ObjectId para que matchee el documento real. En caso contrario
 * (string personalizado, incluido cualquier 12-char que NO sea hex de ObjectId)
 * se devuelve tal cual. Esto arregla el bug por el que editar/borrar entidades
 * creadas por POST fallaba en silencio (string !== ObjectId en Mongo).
 */
export function toDocIdFilter(docId: string): ObjectId | string {
  if (ObjectId.isValid(docId) && new ObjectId(docId).toString() === docId) {
    return new ObjectId(docId);
  }
  return docId;
}
