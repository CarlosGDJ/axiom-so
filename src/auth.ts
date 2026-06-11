import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import { clientPromise, getDb } from '@/lib/mongodb';
import { authConfig } from '@/auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise, { databaseName: 'axiom' }),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = await getDb();
        const user = await db.collection('users').findOne({ email: credentials.email as string });
        if (!user || !user.hashedPassword) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.hashedPassword as string);
        if (!valid) return null;
        return {
          id: user._id.toString(),
          email: user.email as string,
          name: user.name as string | null,
          image: user.image as string | null,
        };
      },
    }),
  ],
});
