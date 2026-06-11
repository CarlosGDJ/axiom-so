import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

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
