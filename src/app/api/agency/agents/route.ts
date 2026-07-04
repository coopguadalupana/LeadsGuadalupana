import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations } from "@/lib/auth/permissions";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  // Supervisors+ can see all agents; agents only see their own agency
  if (canViewAllConversations(auth.user.rol)) {
    const agentes = await query<{ id: number; nombre: string; rol: string; agencia_id: number }>(
      `SELECT u.id, u.nombre, u.rol, u.agencia_id, a.nombre AS agencia_nombre
       FROM lg_usuarios u
       JOIN lg_agencias a ON a.id = u.agencia_id
       ORDER BY a.nombre, u.nombre`
    );
    return NextResponse.json(agentes);
  }

  const agentes = await query<{ id: number; nombre: string; rol: string; agencia_id: number }>(
    `SELECT id, nombre, rol, agencia_id FROM lg_usuarios
     WHERE agencia_id = @agenciaId
     ORDER BY nombre`,
    { agenciaId: auth.user.agencia_id }
  );

  return NextResponse.json(agentes);
}
