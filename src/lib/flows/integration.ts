import { query, execute } from "@/lib/db";
import {
  matchTrigger,
  createInitialState,
  executeFlow,
  isWaitingForAnswer,
  handleAnswer,
} from "@/lib/flows/engine";
import type { Flow, FlowState } from "@/lib/flows/types";

export async function processMessage(
  conversacionId: number,
  agenciaId: number,
  waId: string,
  mensajeTexto: string
): Promise<void> {
  // Cargar estado actual de la conversacion
  const convs = await query<{ estado: string; flow_state: string | null }>(
    `SELECT estado, flow_state FROM lg_conversaciones WHERE id = @id`,
    { id: conversacionId }
  );

  if (convs.length === 0) return;
  const conv = convs[0]!;

  // Si la conversacion ya esta en_espera o en_curso, no procesar con flow
  if (conv.estado === "en_espera" || conv.estado === "en_curso") return;

  let currentState: FlowState | null = conv.flow_state
    ? JSON.parse(conv.flow_state)
    : null;

  // Si estamos esperando respuesta, procesarla
  if (currentState && isWaitingForAnswer(currentState)) {
    // Cargar el flow activo
    const flows = await query<Flow>(
      `SELECT * FROM lg_flows WHERE id = @flowId AND activo = 1`,
      { flowId: currentState.flowId }
    );

    if (flows.length === 0) {
      currentState = null;
    } else {
      currentState = handleAnswer(currentState, flows[0]!, mensajeTexto);
      const { newState, finalizado } = await executeFlow(
        flows[0]!,
        currentState,
        conversacionId,
        waId,
        mensajeTexto
      );
      currentState = newState;

      if (finalizado) {
        currentState = null;
      }

      await saveState(conversacionId, currentState);
      return;
    }
  }

  // Buscar flow activo de la agencia
  const flows = await query<Flow>(
    `SELECT * FROM lg_flows WHERE agencia_id = @agenciaId AND activo = 1
     ORDER BY version DESC`,
    { agenciaId }
  );

  for (const flow of flows) {
    if (matchTrigger(flow, mensajeTexto)) {
      currentState = createInitialState(flow);
      const { newState, finalizado } = await executeFlow(
        flow,
        currentState,
        conversacionId,
        waId,
        mensajeTexto
      );
      currentState = finalizado ? null : newState;
      await saveState(conversacionId, currentState);
      return;
    }
  }
}

async function saveState(
  conversacionId: number,
  state: FlowState | null
): Promise<void> {
  await execute(
    `UPDATE lg_conversaciones
     SET flow_state = @flowState, actualizado = GETDATE()
     WHERE id = @id`,
    {
      flowState: state ? JSON.stringify(state) : null,
      id: conversacionId,
    }
  );
}
