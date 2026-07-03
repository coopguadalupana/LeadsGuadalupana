import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;

  const conversaciones = await query<{
    id: number;
    plataforma: string;
    contacto_externo_id: string;
    estado: string;
    ad_id: string | null;
    campaign_id: string | null;
    asignado_a: number | null;
    creado: string;
  }>(
    `SELECT id, plataforma, contacto_externo_id, estado, ad_id, campaign_id,
            asignado_a, creado
     FROM lg_conversaciones
     WHERE id = @id AND agencia_id = @agenciaId`,
    { id: Number(id), agenciaId: auth.user.agencia_id }
  );

  if (conversaciones.length === 0) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const mensajes = await query(
    `SELECT id, role, tipo, contenido, metadata, recibido
     FROM lg_mensajes
     WHERE conversacion_id = @convId
     ORDER BY recibido ASC`,
    { convId: Number(id) }
  );

  return NextResponse.json({ ...conversaciones[0], mensajes });
}
