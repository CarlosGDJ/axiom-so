import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const COMPUTED_COLLECTIONS = new Set([
  'computed_global_state',
  'computed_areas',
  'computed_hormones',
  'computed_daily_score',
  'playerProfile',
  'dashboardConfig',
]);

interface WriteOp {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { writes } = (await req.json()) as { writes: WriteOp[] };
  if (!Array.isArray(writes) || writes.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const filtered = writes.filter((w) => COMPUTED_COLLECTIONS.has(w.collection));

  await Promise.all(
    filtered.map((w) =>
      db.collection(w.collection).updateOne(
        { _id: w.docId as any, userId },
        { $set: { ...w.data, userId, _id: w.docId } },
        { upsert: true }
      )
    )
  );

  return NextResponse.json({ ok: true });
}
