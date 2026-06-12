import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
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
        // Normalizado a minúsculas: el registro guarda email.toLowerCase().trim(),
        // así un login con mayúsculas (Foo@Bar.com) antes no encontraba al usuario.
        const email = (credentials.email as string).toLowerCase().trim();
        const user = await db.collection('users').findOne({ email });
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
  callbacks: {
    authorized: authConfig.callbacks!.authorized!,
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.email = user.email;
        token.picture = user.image;
        if (user.name) token.name = user.name;
      }
      // One-time backfill: fetch name from DB for tokens that predate this fix
      if (!token.name && token.userId && !token._nameFetched) {
        token._nameFetched = true;
        try {
          const db = await getDb();
          const dbUser = await db.collection('users').findOne(
            { _id: new ObjectId(token.userId as string) },
            { projection: { name: 1 } }
          );
          if (dbUser?.name) token.name = dbUser.name as string;
        } catch {}
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.name) session.user.name = token.name as string;
      if (token.email) session.user.email = token.email as string;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
});
