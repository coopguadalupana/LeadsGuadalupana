import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const agentes = await query<{
    id: number;
    nombre: string;
    rol: string;
  }>(
    `SELECT id, nombre, rol FROM lg_usuarios
     WHERE agencia_id = @agenciaId
     ORDER BY nombre`,
    { agenciaId: auth.user.agencia_id }
  );

  return NextResponse.json(agentes);
}
