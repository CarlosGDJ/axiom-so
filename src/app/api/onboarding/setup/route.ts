import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

interface SetupDoc {
  collection: string;
  data: Record<string, unknown>;
}

const ONBOARDING_ALLOWED = new Set([
  'areas', 'hormones', 'variables', 'skills', 'systems',
  'habits', 'protocols', 'playerProfile',
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { documents } = (await req.json()) as { documents: SetupDoc[] };
  if (!Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const filtered = documents.filter((d) => ONBOARDING_ALLOWED.has(d.collection));

  // Group by collection for efficient bulkWrite
  const byCollection = new Map<string, Record<string, unknown>[]>();
  for (const { collection, data } of filtered) {
    if (!byCollection.has(collection)) byCollection.set(collection, []);
    byCollection.get(collection)!.push({ ...data, userId, createdAt: new Date().toISOString() });
  }

  await Promise.all(
    Array.from(byCollection.entries()).map(([col, docs]) =>
      db.collection(col).insertMany(docs, { ordered: false })
    )
  );

  return NextResponse.json({ ok: true });
}
