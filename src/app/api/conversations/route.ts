import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations } from "@/lib/auth/permissions";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const plataforma = searchParams.get("plataforma");
  const search = searchParams.get("q");
  const agenciaFiltro = searchParams.get("agencia_id");

  let sql = `SELECT c.id, c.agencia_id, c.plataforma, c.contacto_externo_id, c.estado,
                    c.ad_id, c.campaign_id, c.creado, c.actualizado,
                    c.ultima_lectura, c.leido_por,
                    u.nombre AS asignado_nombre,
                    r.nombre AS leido_por_nombre,
                    a.nombre AS agencia_nombre,
                    (SELECT TOP 1 contenido FROM lg_mensajes WHERE conversacion_id = c.id ORDER BY recibido DESC) AS ultimo_mensaje,
                    (SELECT COUNT(*) FROM lg_mensajes WHERE conversacion_id = c.id AND role IN ('cliente','bot')
                     AND (c.ultima_lectura IS NULL OR recibido > c.ultima_lectura)) AS msgs_no_leidos
             FROM lg_conversaciones c
             LEFT JOIN lg_usuarios u ON u.id = c.asignado_a
             LEFT JOIN lg_usuarios r ON r.id = c.leido_por
             JOIN lg_agencias a ON a.id = c.agencia_id`;

  const params: Record<string, unknown> = {};

  if (canViewAllConversations(auth.user.rol)) {
    // Supervisor+ can see all agencies, optionally filter by agency
    if (agenciaFiltro) {
      sql += ` WHERE c.agencia_id = @agenciaId`;
      params.agenciaId = Number(agenciaFiltro);
    }
  } else {
    // Agent only sees their own agency
    sql += ` WHERE c.agencia_id = @agenciaId`;
    params.agenciaId = auth.user.agencia_id;
  }

  if (estado) {
    sql += ` AND c.estado = @estado`;
    params.estado = estado;
  }
  if (plataforma) {
    sql += ` AND c.plataforma = @plataforma`;
    params.plataforma = plataforma;
  }
  if (search) {
    sql += ` AND (c.contacto_externo_id LIKE @search)`;
    params.search = `%${search}%`;
  }

  sql += ` ORDER BY c.actualizado DESC`;

  const conversaciones = await query(sql, params);
  return NextResponse.json(conversaciones);
}
