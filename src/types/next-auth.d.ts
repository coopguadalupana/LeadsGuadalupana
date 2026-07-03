import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      agencia_id: number;
      rol: string;
    } & DefaultSession["user"];
  }

  interface User {
    agencia_id: number;
    rol: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    agencia_id: number;
    rol: string;
  }
}
