import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const USER_COLLECTIONS = [
  'areas', 'hormones', 'variables', 'events', 'transactions', 'interactions',
  'relations', 'accounts', 'debts', 'skills', 'systems', 'habits', 'milestones',
  'protocols', 'states', 'impactMatrix', 'notifications', 'computed_global_state',
  'computed_areas', 'computed_hormones', 'computed_daily_score', 'playerProfile',
  'settings', 'chatHistory', 'dashboardConfig',
];

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  if (!user) return NextResponse.json(null);
  const { _id, ...rest } = user;
  return NextResponse.json({ ...rest, id: _id.toString() });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = await getDb();
  await db.collection('users').updateOne(
    { _id: userId as any },
    { $set: { ...body, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  // Delete all user data across every collection
  await Promise.all(
    USER_COLLECTIONS.map(col => db.collection(col).deleteMany({ userId }))
  );

  // Delete NextAuth adapter records (accounts already deleted via USER_COLLECTIONS loop above)
  await Promise.all([
    db.collection('users').deleteOne({ _id: userId as any }),
    db.collection('sessions').deleteMany({ userId }),
  ]);

  return NextResponse.json({ ok: true });
}
