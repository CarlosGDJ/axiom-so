import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ error: 'Este correo ya está registrado.' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await db.collection('users').insertOne({
    _id: new ObjectId() as any,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    emailVerified: null,
    image: null,
    hashedPassword,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
