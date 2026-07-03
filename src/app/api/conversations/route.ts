import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const plataforma = searchParams.get("plataforma");
  const search = searchParams.get("q");

  let sql = `SELECT c.id, c.plataforma, c.contacto_externo_id, c.estado,
                    c.ad_id, c.campaign_id, c.creado, c.actualizado,
                    u.nombre AS asignado_nombre,
                    (SELECT TOP 1 contenido FROM lg_mensajes WHERE conversacion_id = c.id ORDER BY recibido DESC) AS ultimo_mensaje,
                    (SELECT COUNT(*) FROM lg_mensajes WHERE conversacion_id = c.id AND role = 'cliente') AS msgs_no_leidos
             FROM lg_conversaciones c
             LEFT JOIN lg_usuarios u ON u.id = c.asignado_a
             WHERE c.agencia_id = @agenciaId`;
  const params: Record<string, unknown> = { agenciaId: auth.user.agencia_id };

  if (estado) {
    sql += ` AND c.estado = @estado`;
    params.estado = estado;
  }
  if (plataforma) {
    sql += ` AND c.plataforma = @plataforma`;
    params.plataforma = plataforma;
  }
  if (search) {
    sql += ` AND (c.contacto_externo_id LIKE @search OR c.ultimo_mensaje LIKE @search)`;
    params.search = `%${search}%`;
  }

  sql += ` ORDER BY c.actualizado DESC`;

  const conversaciones = await query(sql, params);
  return NextResponse.json(conversaciones);
}
