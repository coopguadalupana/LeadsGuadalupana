import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencia_id: number;
      rol: string;
      rol_id: number;
    } & DefaultSession["user"];
  }

  interface User {
    agencia_id: number;
    rol: string;
    rol_id: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    agencia_id: number;
    rol: string;
    rol_id: number;
  }
}
