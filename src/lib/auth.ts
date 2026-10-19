import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { getPasswordResetVersion, isPasswordSessionCurrent } from "@/lib/auth-session";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordResetVersion = await getPasswordResetVersion(user.id);

        const passwordMatches = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        // A reset during bcrypt verification must not authenticate the old password.
        const current = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
        if (current?.passwordHash !== user.passwordHash) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          passwordResetVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? "CUSTOMER";
        token.passwordResetVersion = user.passwordResetVersion ?? 0;
      }

      // NextAuth v4 clears the session cookie when the JWT callback rejects it.
      if (!(await isPasswordSessionCurrent(token))) throw new Error("Password changed. Please sign in again.");
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole | undefined) ?? "CUSTOMER";
      }

      return session;
    },
  },
};

export function getCurrentSession() {
  return getServerSession(authOptions);
}
