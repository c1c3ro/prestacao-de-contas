import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "GESTOR" | "AUDITOR";
    };
  }

  interface User {
    role: "GESTOR" | "AUDITOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "GESTOR" | "AUDITOR";
  }
}
