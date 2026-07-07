import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations } from "@/lib/auth/permissions";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  if (await canViewAllConversations(auth.user.rol_id)) {
    const agencias = await query<{ id: number; nombre: string }>(
      `SELECT id, nombre FROM lg_agencias ORDER BY nombre`
    );
    return NextResponse.json(agencias);
  }

  const agencias = await query<{ id: number; nombre: string }>(
    `SELECT id, nombre FROM lg_agencias WHERE id = @agenciaId ORDER BY nombre`,
    { agenciaId: auth.user.agencia_id }
  );
  return NextResponse.json(agencias);
}
