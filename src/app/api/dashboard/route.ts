import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const agenciaFilter = "WHERE l.agencia_id = @agenciaId";
  const params = { agenciaId: auth.user.agencia_id };

  const resumen = await query<Record<string, unknown>>(
    `SELECT
       (SELECT COUNT(*) FROM lg_conversaciones ${agenciaFilter}) AS total_conversaciones,
       (SELECT COUNT(*) FROM lg_mensajes m
        JOIN lg_conversaciones c ON c.id = m.conversacion_id
        WHERE c.agencia_id = @agenciaId AND m.recibido >= DATEADD(day, -7, GETDATE())) AS mensajes_semana,
       (SELECT COUNT(*) FROM lg_mensajes m
        JOIN lg_conversaciones c ON c.id = m.conversacion_id
        WHERE c.agencia_id = @agenciaId) AS total_mensajes,
       (SELECT COUNT(*) FROM lg_leads ${agenciaFilter}) AS total_leads,
       (SELECT COUNT(*) FROM lg_leads WHERE agencia_id = @agenciaId AND etapa = 'convertido') AS leads_convertidos`,
    params
  );

  const etapaCounts = await query<{ etapa: string; total: number }>(
    `SELECT COALESCE(l.etapa, 'nuevo') AS etapa, COUNT(*) AS total
     FROM lg_leads l
     WHERE l.agencia_id = @agenciaId
     GROUP BY l.etapa
     ORDER BY CASE COALESCE(l.etapa, 'nuevo')
       WHEN 'nuevo' THEN 0 WHEN 'contactado' THEN 1 WHEN 'calificado' THEN 2
       WHEN 'convertido' THEN 3 WHEN 'seguimiento' THEN 4 WHEN 'perdido' THEN 5 ELSE 6 END`,
    params
  );

  const adsPerformance = await query<Record<string, unknown>>(
    `SELECT
       COALESCE(c.ad_id, 'sin_atribuir') AS ad_id,
       COUNT(DISTINCT c.id) AS conversaciones,
       COUNT(m.id) AS mensajes,
       COUNT(DISTINCT l.id) AS leads,
       COUNT(DISTINCT CASE WHEN l.etapa = 'convertido' THEN l.id END) AS convertidos
     FROM lg_conversaciones c
     LEFT JOIN lg_mensajes m ON m.conversacion_id = c.id
     LEFT JOIN lg_leads l ON l.conversacion_id = c.id
     WHERE c.agencia_id = @agenciaId
     GROUP BY COALESCE(c.ad_id, 'sin_atribuir')
     ORDER BY COUNT(DISTINCT c.id) DESC`,
    params
  );

  const mensajesPorDia = await query<{ dia: string; total: number }>(
    `SELECT CAST(m.recibido AS DATE) AS dia, COUNT(*) AS total
     FROM lg_mensajes m
     JOIN lg_conversaciones c ON c.id = m.conversacion_id
     WHERE c.agencia_id = @agenciaId AND m.recibido >= DATEADD(day, -14, GETDATE())
     GROUP BY CAST(m.recibido AS DATE)
     ORDER BY dia`,
    params
  );

  const recientes = await query<{ id: number; contacto_externo_id: string; estado: string; ultimo_mensaje: string; creado: string }>(
    `SELECT c.id, c.contacto_externo_id, c.estado,
            (SELECT TOP 1 m.contenido FROM lg_mensajes m WHERE m.conversacion_id = c.id ORDER BY m.recibido DESC) AS ultimo_mensaje,
            c.creado
     FROM lg_conversaciones c
     WHERE c.agencia_id = @agenciaId
     ORDER BY c.actualizado DESC`,
    params
  );

  const calificaciones = await query(
    "SELECT id, nombre, color_fondo, color_texto, orden FROM lg_calificaciones WHERE activo = 1 ORDER BY orden"
  );

  return NextResponse.json({
    resumen: resumen[0],
    etapaCounts,
    adsPerformance,
    mensajesPorDia,
    recientes: recientes.slice(0, 10),
    calificaciones,
  });
}
