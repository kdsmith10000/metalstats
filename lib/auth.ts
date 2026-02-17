import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { Pool } from '@neondatabase/serverless';
import NeonAdapter from '@auth/neon-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Discord from 'next-auth/providers/discord';
import Apple from 'next-auth/providers/apple';
import Reddit from 'next-auth/providers/reddit';
import MicrosoftEntraId from 'next-auth/providers/microsoft-entra-id';
import Twitter from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from './db';

const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    newUser: '/discuss',
    error: '/auth/login',
  },
  providers: [
    Google,
    GitHub,
    Discord,
    Apple,
    Reddit,
    MicrosoftEntraId,
    Twitter,
    Credentials({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const result = await sql`
          SELECT id, email, name, image, password_hash, display_name
          FROM users WHERE email = ${email} LIMIT 1
        `;

        if (result.length === 0) return null;

        const user = result[0];
        if (!user.password_hash) return null;

        const isValid = await bcrypt.compare(password, user.password_hash as string);
        if (!isValid) return null;

        return {
          id: user.id as string,
          email: user.email as string,
          name: (user.display_name || user.name) as string,
          image: user.image as string | null,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth sign-ins, set display_name from provider name if not already set
      if (account?.provider !== 'credentials' && user?.id && user?.name) {
        await sql`
          UPDATE users SET 
            display_name = COALESCE(display_name, ${user.name}),
            last_seen_at = NOW()
          WHERE id = ${user.id}
        `.catch(() => {});
      }
      return true;
    },
  },
  session: {
    strategy: 'database',
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return {
    ...authConfig,
    adapter: NeonAdapter(pool),
  };
});
