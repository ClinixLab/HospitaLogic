// lib/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) return null;

        const user = await prisma.login.findUnique({ where: { username } });
        if (!user) return null;

        const ok = await compare(password, user.hashed_password);
        if (!ok) return null;

        return {
          id: String(user.user_id),
          username: user.username,
          role: user.role,               // "PATIENT" | "DOCTOR"
          patient_id: user.patient_id ?? null,
          doctor_id: user.doctor_id ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.patient_id = (user as any).patient_id;
        token.doctor_id = (user as any).doctor_id;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).username = token.username;
      (session.user as any).role = token.role;
      (session.user as any).patient_id = (token as any).patient_id;
      (session.user as any).doctor_id = (token as any).doctor_id;
      return session;
    },
  },

  pages: { signIn: "/login" },
};
