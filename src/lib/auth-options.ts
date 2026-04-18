import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorize called with credentials:", credentials?.email);
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) {
          console.log("Missing email or password");
          return null;
        }

        try {
          console.log("Connecting to database...");
          const user = await prisma.pmjnUsuario.findUnique({
            where: { email },
          });
          console.log("User found:", user ? "yes" : "no");
          if (!user) {
            console.log("User not found for email:", email);
            return null;
          }

          const ok = await bcrypt.compare(password, user.passwordHash);
          console.log("Password match:", ok);
          if (!ok) {
            console.log("Password incorrect");
            return null;
          }

          console.log("Login successful for:", email);
          return {
            id: user.id,
            email: user.email,
            name: user.nome,
            role: user.papel,
          };
        } catch (error) {
          console.error("Database error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "GESTOR" | "AUDITOR") ?? "AUDITOR";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
