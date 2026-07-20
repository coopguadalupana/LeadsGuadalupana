import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (auth.user.rol === "agent") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const agenciaFiltro = body.agencia_id ? Number(body.agencia_id) : null;

  // Obtener agencias y sus configs
  let agencias: { id: number; config: string | null }[];
  if (agenciaFiltro) {
    agencias = await query<{ id: number; config: string | null }>(
      "SELECT id, config FROM lg_agencias WHERE id = @id AND activa = 1",
      { id: agenciaFiltro }
    );
  } else if (await canViewAllConversations(auth.user.rol_id)) {
    agencias = await query<{ id: number; config: string | null }>(
      "SELECT id, config FROM lg_agencias WHERE activa = 1"
    );
  } else {
    agencias = await query<{ id: number; config: string | null }>(
      "SELECT id, config FROM lg_agencias WHERE id = @id AND activa = 1",
      { id: auth.user.agencia_id }
    );
  }

  const resultados: { agencia_id: number; asignados: number }[] = [];

  for (const agencia of agencias) {
    if (!agencia.config) continue;

    let configJson: Record<string, unknown>;
    try {
      configJson = JSON.parse(agencia.config);
    } catch {
      continue;
    }

    const autoAsignacion = configJson.auto_asignacion as Record<string, unknown> | undefined;
    if (!autoAsignacion?.activado) continue;

    const horas = Number(autoAsignacion.horas_sin_respuesta) || 0;
    if (horas <= 0) continue;

    const usuarioId = Number(autoAsignacion.usuario_id);
    if (!usuarioId) continue;

    // Buscar conversaciones en espera cuyo último mensaje del cliente
    // supere el umbral de horas sin respuesta
    const pendientes = await query<{ id: number }>(
      `WITH ultimo_mensaje AS (
          SELECT conversacion_id, MAX(recibido) AS ultimo_recibido
          FROM lg_mensajes
          WHERE role = 'cliente'
          GROUP BY conversacion_id
        )
        SELECT c.id
        FROM lg_conversaciones c
        JOIN ultimo_mensaje um ON um.conversacion_id = c.id
        WHERE c.estado = 'en_espera'
          AND c.agencia_id = @agenciaId
          AND (c.asignado_a IS NULL OR c.asignado_a != @usuarioId)
          AND DATEDIFF(HOUR, um.ultimo_recibido, GETUTCDATE()) >= @horas`,
      { agenciaId: agencia.id, usuarioId, horas }
    );

    if (pendientes.length === 0) continue;

    const ids = pendientes.map((p) => p.id);

    // Asignar en lotes para evitar SQL injection con IN
    for (const convId of ids) {
      await execute(
        `UPDATE lg_conversaciones SET asignado_a = @usuarioId, actualizado = GETUTCDATE() WHERE id = @id`,
        { usuarioId, id: convId }
      );
    }

    resultados.push({ agencia_id: agencia.id, asignados: ids.length });
  }

  return NextResponse.json({
    success: true,
    asignados: resultados.reduce((sum, r) => sum + r.asignados, 0),
    detalle: resultados,
  });
}
