import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations } from "@/lib/auth/permissions";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  // Solo supervisor+ puede ver reportes de todas las agencias
  if (!await canViewAllConversations(auth.user.rol_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Parámetros desde y hasta requeridos" }, { status: 400 });
  }

  // Validar formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(desde) || !dateRegex.test(hasta)) {
    return NextResponse.json({ error: "Formato de fecha inválido (YYYY-MM-DD)" }, { status: 400 });
  }

  const sql = `
    WITH convs AS (
        SELECT c.id, c.creado, c.agencia_id
        FROM lg_conversaciones c
        WHERE c.creado >= @desde
          AND c.creado < DATEADD(day, 1, CAST(@hasta AS DATE))
    ),
    primer_resp AS (
        SELECT m.conversacion_id, MIN(m.recibido) AS ts
        FROM lg_mensajes m
        INNER JOIN convs cv ON cv.id = m.conversacion_id
        WHERE m.role = 'agente'
        GROUP BY m.conversacion_id
    )
    SELECT
        a.id      AS agencia_id,
        a.nombre  AS agencia,
        COUNT(DISTINCT cv.id)     AS leads_recibidos,
        COUNT(pr.conversacion_id) AS leads_respondidos,
        AVG(CAST(
            CASE WHEN pr.ts > cv.creado
                 THEN DATEDIFF(minute, cv.creado, pr.ts)
            END AS FLOAT
        )) AS promedio_respuesta_min
    FROM convs cv
    JOIN lg_agencias a ON a.id = cv.agencia_id
    LEFT JOIN primer_resp pr ON pr.conversacion_id = cv.id
    GROUP BY a.id, a.nombre
    ORDER BY leads_recibidos DESC;
  `;

  const data = await query(sql, { desde, hasta });
  return NextResponse.json(data);
}
