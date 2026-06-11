import { revalidateCollection } from '@/hooks/use-mongo-collection';

function handleError(op: string, collection: string, err: unknown) {
  console.error(`[api-writes] ${op} ${collection}:`, err);
}

export function addDocumentNonBlocking(
  collection: string,
  data: Record<string, unknown>,
  opts?: { revalidate?: boolean }
) {
  fetch(`/api/data/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(() => {
      if (opts?.revalidate !== false) revalidateCollection(collection);
    })
    .catch((err) => handleError('addDocument', collection, err));
}

export function setDocumentNonBlocking(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  opts?: { merge?: boolean; revalidate?: boolean }
) {
  fetch(`/api/data/${collection}/${encodeURIComponent(docId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, merge: opts?.merge }),
  })
    .then(() => {
      if (opts?.revalidate !== false) revalidateCollection(collection);
    })
    .catch((err) => handleError('setDocument', collection, err));
}

export function updateDocumentNonBlocking(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  opts?: { revalidate?: boolean }
) {
  fetch(`/api/data/${collection}/${encodeURIComponent(docId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(() => {
      if (opts?.revalidate !== false) revalidateCollection(collection);
    })
    .catch((err) => handleError('updateDocument', collection, err));
}

export function deleteDocumentNonBlocking(
  collection: string,
  docId: string,
  opts?: { revalidate?: boolean }
) {
  fetch(`/api/data/${collection}/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  })
    .then(() => {
      if (opts?.revalidate !== false) revalidateCollection(collection);
    })
    .catch((err) => handleError('deleteDocument', collection, err));
}
