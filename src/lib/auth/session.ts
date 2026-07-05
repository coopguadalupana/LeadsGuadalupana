import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  agencia_id: number;
  rol: string;
  rol_id: number;
  name?: string | null;
}

export async function getAuthSession(): Promise<{
  user: SessionUser;
  response: null;
} | { user: null; response: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const user = session.user as unknown as SessionUser;

  if (!user.agencia_id || !user.rol_id) {
    return {
      user: null,
      response: NextResponse.json({ error: "Agencia o rol no encontrado" }, { status: 403 }),
    };
  }

  return { user, response: null };
}
