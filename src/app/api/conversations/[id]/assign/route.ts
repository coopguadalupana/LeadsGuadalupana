import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { execute } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const { agente_id } = await req.json();

  await execute(
    `UPDATE lg_conversaciones SET asignado_a = @agenteId, actualizado = SYSUTCDATETIME()
     WHERE id = @id AND agencia_id = @agenciaId`,
    { id: Number(id), agenciaId: auth.user.agencia_id, agenteId: agente_id ?? auth.user.id }
  );

  return NextResponse.json({ success: true });
}
