import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateLDAP } from "@/lib/auth/ldap-provider";
import { query } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "ldap",
      name: "LDAP",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const ldapUser = await authenticateLDAP(
          credentials.username,
          credentials.password
        );
        if (!ldapUser) return null;

        const usuarios = await query<{
          id: number;
          agencia_id: number;
          rol: string;
          nombre: string;
        }>(
          `SELECT u.id, u.agencia_id, u.rol, u.nombre
           FROM lg_usuarios u
           JOIN lg_agencias a ON a.id = u.agencia_id
           WHERE u.ldap_sam = @sam AND a.subou_ldap = @subou AND a.activa = 1`,
          { sam: ldapUser.sAMAccountName, subou: ldapUser.subou_agencia }
        );

        if (usuarios.length === 0) return null;

        return {
          id: String(usuarios[0]!.id),
          name: usuarios[0]!.nombre,
          email: ldapUser.mail ?? null,
          agencia_id: usuarios[0]!.agencia_id,
          rol: usuarios[0]!.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.agencia_id = user.agencia_id;
        token.rol = user.rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.agencia_id = token.agencia_id;
        session.user.rol = token.rol;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
