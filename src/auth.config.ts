import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Minimal config for Edge Runtime (middleware) — no database adapter
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/onboarding');
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      if (user?.name) token.name = user.name;
      if (user?.email) token.email = user.email;
      if (user?.image) token.picture = user.image;
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
};
