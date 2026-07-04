import { query, execute } from "@/lib/db";
import {
  matchTrigger,
  createInitialState,
  executeFlow,
  isWaitingForAnswer,
  handleAnswer,
} from "@/lib/flows/engine";
import type { Flow, FlowState } from "@/lib/flows/types";

function parseFlow(raw: Record<string, unknown>): Flow {
  function parseJson(val: unknown): unknown {
    if (typeof val !== "string") return val;
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    } catch {
      return val;
    }
  }

  return {
    ...raw,
    trigger: parseJson(raw.trigger),
    pasos: parseJson(raw.pasos),
  } as unknown as Flow;
}

export async function processMessage(
  conversacionId: number,
  agenciaId: number,
  waId: string,
  mensajeTexto: string
): Promise<void> {
  const convs = await query<{ estado: string; flow_state: string | null }>(
    `SELECT estado, flow_state FROM lg_conversaciones WHERE id = @id`,
    { id: conversacionId }
  );

  if (convs.length === 0) return;
  const conv = convs[0]!;

  if (conv.estado === "en_espera" || conv.estado === "en_curso") return;

  let currentState: FlowState | null = conv.flow_state
    ? JSON.parse(conv.flow_state)
    : null;

  // Si hay un flow activo, continuar ejecutandolo
  if (currentState) {
    const raw = await query<Record<string, unknown>>(
      `SELECT * FROM lg_flows WHERE id = @flowId AND activo = 1`,
      { flowId: currentState.flowId }
    );

    if (raw.length > 0) {
      const flow = parseFlow(raw[0]!);

      if (isWaitingForAnswer(currentState)) {
        currentState = handleAnswer(currentState, flow, mensajeTexto);
      }

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
    // Flow ya no existe o esta inactivo, continuar a buscar nuevo flow
    currentState = null;
  }

  // Sin flow activo: buscar flow que coincida con el trigger
  const raw = await query<Record<string, unknown>>(
    `SELECT * FROM lg_flows WHERE agencia_id = @agenciaId AND activo = 1
     ORDER BY version DESC`,
    { agenciaId }
  );

  console.log("processMessage: buscando flows activos para agencia", agenciaId, "mensaje:", mensajeTexto);
  console.log("processMessage: flows encontrados:", raw.length);

  for (const row of raw) {
    const flow = parseFlow(row);
    const match = matchTrigger(flow, mensajeTexto);
    console.log("processMessage: evaluando flow", flow.nombre, "match:", match);
    if (match) {
      console.log("processMessage: flow disparado!", flow.nombre);
      currentState = createInitialState(flow);
      const { newState, finalizado } = await executeFlow(
        flow,
        currentState,
        conversacionId,
        waId,
        mensajeTexto
      );
      console.log("processMessage: ejecucion completada, finalizado:", finalizado);
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
