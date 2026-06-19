import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { toDocIdFilter } from '@/lib/mongo-id';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_COLLECTIONS = new Set([
  'areas', 'hormones', 'variables', 'events', 'transactions',
  'interactions', 'relations', 'financialAccounts', 'debts', 'skills',
  'systems', 'habits', 'milestones', 'protocols', 'states',
  'impactMatrix', 'notifications', 'computed_global_state',
  'computed_areas', 'computed_hormones', 'computed_daily_score',
  'playerProfile', 'settings', 'chatHistory', 'dashboardConfig',
  'dailyBriefing', 'userProfile', 'dailyCheckins',
]);

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

type Params = { params: Promise<{ collection: string; docId: string }> };

// PUT — upsert completo (reemplaza setDoc con merge)
export async function PUT(req: NextRequest, { params }: Params) {
  const { collection: col, docId } = await params;
  if (!ALLOWED_COLLECTIONS.has(col)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { merge: _merge, ...body } = await req.json();
  const db = await getDb();

  await db.collection(col).updateOne(
    { _id: toDocIdFilter(docId) as any, userId },
    { $set: { ...body, userId } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

// PATCH — actualización parcial (reemplaza updateDoc)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { collection: col, docId } = await params;
  if (!ALLOWED_COLLECTIONS.has(col)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = await getDb();

  await db.collection(col).updateOne(
    { _id: toDocIdFilter(docId) as any, userId },
    { $set: body }
  );
  return NextResponse.json({ ok: true });
}

// DELETE — borrar documento
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { collection: col, docId } = await params;
  if (!ALLOWED_COLLECTIONS.has(col)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  await db.collection(col).deleteOne({ _id: toDocIdFilter(docId) as any, userId });
  return NextResponse.json({ ok: true });
}
