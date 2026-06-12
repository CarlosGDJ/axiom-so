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
  'dailyBriefing', 'userProfile',
]);

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

type Params = { params: Promise<{ collection: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { collection: col } = await params;
  if (!ALLOWED_COLLECTIONS.has(col)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const docId = searchParams.get('docId');
  // `limit` robusto: sin parámetro → 1000 (por defecto). Un valor inválido
  // (NaN/≤0) también cae a 1000 — antes Number(null)=0 se colaba como finito y
  // clampaba a 1, devolviendo ¡un solo documento! por colección.
  const limitParam = searchParams.get('limit');
  const limitNum = limitParam !== null ? Number(limitParam) : 1000;
  const limitVal = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.trunc(limitNum), 1000) : 1000;
  // `orderBy` validado: solo nombres de campo simples (evita sorts sobre paths
  // arbitrarios / no indexados que un cliente podría forzar).
  const orderByRaw = searchParams.get('orderBy');
  const orderByField = orderByRaw && /^[a-zA-Z0-9_]+$/.test(orderByRaw) ? orderByRaw : null;
  const direction = searchParams.get('direction') === 'asc' ? 1 : -1;

  const db = await getDb();

  if (docId) {
    const doc = await db.collection(col).findOne({ userId, _id: toDocIdFilter(docId) as any });
    if (!doc) return NextResponse.json(null);
    const { _id, ...rest } = doc;
    return NextResponse.json({ ...rest, id: _id.toString() });
  }

  let cursor = db.collection(col).find({ userId });
  if (orderByField) cursor = cursor.sort({ [orderByField]: direction });
  cursor = cursor.limit(limitVal);
  const docs = await cursor.toArray();
  const result = docs.map(({ _id, ...rest }) => ({ ...rest, id: _id.toString() }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { collection: col } = await params;
  if (!ALLOWED_COLLECTIONS.has(col)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = await getDb();
  const result = await db.collection(col).insertOne({
    ...body,
    userId,
    createdAt: body.createdAt ?? new Date().toISOString(),
  });
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}
