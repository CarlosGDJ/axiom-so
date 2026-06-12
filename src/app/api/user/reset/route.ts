import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

const USER_COLLECTIONS = [
  'areas', 'hormones', 'variables', 'events', 'transactions', 'interactions',
  'relations', 'financialAccounts', 'debts', 'skills', 'systems', 'habits', 'milestones',
  'protocols', 'states', 'impactMatrix', 'notifications', 'computed_global_state',
  'computed_areas', 'computed_hormones', 'computed_daily_score', 'playerProfile',
  'settings', 'chatHistory', 'dashboardConfig',
];

// Deletes all user data but keeps the auth account — redirects to onboarding
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  await Promise.all(
    USER_COLLECTIONS.map(col => db.collection(col).deleteMany({ userId }))
  );

  return NextResponse.json({ ok: true });
}
