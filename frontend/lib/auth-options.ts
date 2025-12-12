import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
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
  id: user.user_id,             // string UUID
  username: user.username,
  role: user.role,              // PATIENT | DOCTOR
  patient_id: user.role === "PATIENT" ? user.user_id : null,
  doctor_id: user.role === "DOCTOR" ? user.user_id : null,
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
      }
      return token;
    },
    session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).username = token.username;
      (session.user as any).role = token.role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
