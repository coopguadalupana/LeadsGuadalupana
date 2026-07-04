import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations, canChangeConversationAgency } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;

  let sql: string;
  let sqlParams: Record<string, unknown>;

  if (canViewAllConversations(auth.user.rol)) {
    sql = `SELECT c.id, c.agencia_id, c.plataforma, c.contacto_externo_id, c.estado,
                  c.ad_id, c.campaign_id, c.asignado_a, c.creado, a.nombre AS agencia_nombre
           FROM lg_conversaciones c
           JOIN lg_agencias a ON a.id = c.agencia_id
           WHERE c.id = @id`;
    sqlParams = { id: Number(id) };
  } else {
    sql = `SELECT c.id, c.agencia_id, c.plataforma, c.contacto_externo_id, c.estado,
                  c.ad_id, c.campaign_id, c.asignado_a, c.creado, a.nombre AS agencia_nombre
           FROM lg_conversaciones c
           JOIN lg_agencias a ON a.id = c.agencia_id
           WHERE c.id = @id AND c.agencia_id = @agenciaId`;
    sqlParams = { id: Number(id), agenciaId: auth.user.agencia_id };
  }

  const conversaciones = await query<Record<string, unknown>>(sql, sqlParams);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const body = await req.json();

  // Verify the conversation exists and the user has access
  const convs = await query<{ id: number; agencia_id: number }>(
    `SELECT id, agencia_id FROM lg_conversaciones WHERE id = @id`,
    { id: Number(id) }
  );

  if (convs.length === 0) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const conv = convs[0]!;
  const isOwnAgency = conv.agencia_id === auth.user.agencia_id;

  // Agents can only update their own agency conversations
  if (!canViewAllConversations(auth.user.rol) && !isOwnAgency) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const updates: string[] = [];
  const paramsObj: Record<string, unknown> = { id: Number(id) };

  if (body.estado !== undefined) {
    updates.push("estado = @estado");
    paramsObj.estado = body.estado;
    if (body.estado === "cerrada" && body.motivo_cierre !== undefined) {
      updates.push("motivo_cierre = @motivoCierre");
      paramsObj.motivoCierre = body.motivo_cierre;
    }
  }

  if (body.agencia_id !== undefined) {
    if (!canChangeConversationAgency(auth.user.rol)) {
      return NextResponse.json({ error: "No tienes permiso para cambiar la agencia" }, { status: 403 });
    }
    updates.push("agencia_id = @nuevaAgencia");
    paramsObj.nuevaAgencia = Number(body.agencia_id);
  }

  if (body.asignado_a !== undefined) {
    updates.push("asignado_a = @asignadoA");
    paramsObj.asignadoA = body.asignado_a;
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  updates.push("actualizado = SYSUTCDATETIME()");

  await execute(
    `UPDATE lg_conversaciones SET ${updates.join(", ")}
     WHERE id = @id`,
    paramsObj
  );

  return NextResponse.json({ success: true });
}
