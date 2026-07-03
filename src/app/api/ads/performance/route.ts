import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const ads = await query(
    `SELECT
       COALESCE(c.ad_id, 'sin_atribuir') AS ad_id,
       COUNT(*) AS total_mensajes,
       COUNT(DISTINCT c.id) AS total_conversaciones,
       SUM(CASE WHEN l.calificacion = 'hot' THEN 1 ELSE 0 END) AS leads_hot,
       SUM(CASE WHEN l.calificacion = 'warm' THEN 1 ELSE 0 END) AS leads_warm,
       SUM(CASE WHEN l.calificacion = 'cold' THEN 1 ELSE 0 END) AS leads_cold
     FROM lg_conversaciones c
     LEFT JOIN lg_leads l ON l.conversacion_id = c.id
     WHERE c.agencia_id = @agenciaId
     GROUP BY c.ad_id
     ORDER BY total_conversaciones DESC`,
    { agenciaId: auth.user.agencia_id }
  );

  return NextResponse.json(ads);
}
