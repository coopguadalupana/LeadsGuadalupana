import { query, execute } from "@/lib/db";
import { canViewAllConversations } from "@/lib/auth/permissions";

// Cache de transiciones permitidas
let transiciones: Array<{ estado_origen: string; estado_destino: string; evento: string }> | null = null;

async function getTransiciones() {
  if (!transiciones) {
    transiciones = await query<{ estado_origen: string; estado_destino: string; evento: string }>(
      "SELECT estado_origen, estado_destino, evento FROM lg_estados_transiciones WHERE activo = 1"
    );
  }
  return transiciones;
}

// Invalidar cache (para tests o cambios en caliente)
export function resetTransiciones() {
  transiciones = null;
}

/**
 * Valida y ejecuta una transicion de estado.
 * Busca la transicion en lg_estados_transiciones y actualiza la BD.
 * Si no encuentra la transicion, lanza un error.
 */
export async function transitionState(
  conversacionId: number,
  evento: string,
  extras?: { motivo_cierre?: string }
): Promise<void> {
  // Obtener estado actual
  const convs = await query<{ id: number; estado: string }>(
    "SELECT id, estado FROM lg_conversaciones WHERE id = @id",
    { id: conversacionId }
  );
  if (convs.length === 0) throw new Error(`Conversacion ${conversacionId} no encontrada`);

  const estadoActual = convs[0]!.estado;
  const allTransiciones = await getTransiciones();

  // Buscar transicion valida
  const match = allTransiciones.find(
    (t) => t.estado_origen === estadoActual && t.evento === evento
  );

  if (!match) {
    throw new Error(
      `Transicion invalida: '${estadoActual}' → '${evento}' no permitida`
    );
  }

  // Ejecutar transicion
  const updates = [`estado = '${match.estado_destino}'`, "actualizado = GETUTCDATE()"];
  if (extras?.motivo_cierre) updates.push(`motivo_cierre = '${extras.motivo_cierre.replace(/'/g, "''")}'`);
  if (match.estado_origen === "cerrada" || match.estado_destino === "en_espera") {
    updates.push("motivo_cierre = NULL");
  }

  await execute(
    `UPDATE lg_conversaciones SET ${updates.join(", ")} WHERE id = @id`,
    { id: conversacionId }
  );
}
