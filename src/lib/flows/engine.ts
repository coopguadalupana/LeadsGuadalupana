import { sendText, sendTemplate, sendInteractive } from "@/lib/whatsapp/send";
import { execute } from "@/lib/db";
import type { Flow, FlowState } from "@/lib/flows/types";

export async function executeFlow(
  flow: Flow,
  state: FlowState,
  conversacionId: number,
  waId: string,
  mensajeTexto: string
): Promise<{ newState: FlowState; finalizado: boolean }> {
  const pasoActual = flow.pasos.find((s) => s.id === state.pasoActual);
  if (!pasoActual) {
    return { newState: state, finalizado: true };
  }

  const currentState = { ...state };
  let finalizado = false;

  switch (pasoActual.tipo) {
    case "send_template": {
      await sendTemplate({
        to: waId,
        templateName: pasoActual.template_name ?? "default",
        components: pasoActual.template_params ? JSON.parse(pasoActual.template_params) : undefined,
      });
      currentState.historial.push({ pasoId: pasoActual.id, accion: "send_template" });
      if (pasoActual.siguiente) {
        currentState.pasoActual = pasoActual.siguiente;
      } else {
        finalizado = true;
      }
      break;
    }

    case "send_interactive": {
      const texto = interpolate(pasoActual.texto ?? "", currentState.variables);
      await sendInteractive({
        to: waId,
        type: "button",
        body: texto,
        buttons: (pasoActual.botones ?? []).map((b, i) => ({ id: `opt_${i}`, title: b })),
      });
      currentState.historial.push({ pasoId: pasoActual.id, accion: "send_interactive" });
      if (pasoActual.siguiente) {
        currentState.pasoActual = pasoActual.siguiente;
      } else {
        finalizado = true;
      }
      break;
    }

    case "send_text": {
      const texto = interpolate(pasoActual.texto ?? "", currentState.variables);
      await sendText({ to: waId, text: texto });

      currentState.historial.push({ pasoId: pasoActual.id, accion: "send_text" });

      if (pasoActual.siguiente) {
        currentState.pasoActual = pasoActual.siguiente;
      } else {
        finalizado = true;
      }
      break;
    }

    case "ask_question": {
      const texto = interpolate(pasoActual.texto ?? "", currentState.variables);
      await sendText({ to: waId, text: texto });

      currentState.historial.push({ pasoId: pasoActual.id, accion: "ask_question" });

      // Guardar que esperamos respuesta y que campo capturar
      currentState.pasoActual = pasoActual.id + ".wait";
      break;
    }

    case "save_lead_field": {
      if (pasoActual.campo) {
        currentState.variables[pasoActual.campo] = mensajeTexto;
      }

      currentState.historial.push({ pasoId: pasoActual.id, accion: "save_lead_field" });

      if (pasoActual.siguiente) {
        currentState.pasoActual = pasoActual.siguiente;
      } else {
        finalizado = true;
      }
      break;
    }

    case "qualify_lead": {
      let calificacion = pasoActual.calificacion ?? "cold";

      if (pasoActual.si_contiene) {
        const match = pasoActual.si_contiene.some((k) =>
          currentState.variables[pasoActual.campo ?? ""]?.toLowerCase().includes(k.toLowerCase())
        );
        if (!match) calificacion = "cold";
      }

      await execute(
        `UPDATE lg_leads SET calificacion = @calificacion, actualizado = GETUTCDATE()
         WHERE conversacion_id = @conversacionId`,
        { calificacion, conversacionId }
      );

      currentState.historial.push({ pasoId: pasoActual.id, accion: "qualify_lead" });

      if (pasoActual.siguiente) {
        currentState.pasoActual = pasoActual.siguiente;
      } else {
        finalizado = true;
      }
      break;
    }

    case "escalate_to_human": {
      await execute(
        `UPDATE lg_conversaciones SET estado = 'en_curso', actualizado = GETUTCDATE()
         WHERE id = @id`,
        { id: conversacionId }
      );

      currentState.historial.push({ pasoId: pasoActual.id, accion: "escalate_to_human" });
      finalizado = true;
      break;
    }

    case "end_flow": {
      finalizado = true;
      break;
    }

    case "conditional": {
      if (pasoActual.condicion) {
        const valorVar = currentState.variables[pasoActual.condicion.campo] ?? mensajeTexto;
        let cumple = false;

        switch (pasoActual.condicion.operador) {
          case "contiene":
            cumple = valorVar.toLowerCase().includes(
              (pasoActual.condicion.valor ?? "").toLowerCase()
            );
            break;
          case "igual":
            cumple = valorVar.toLowerCase() === (pasoActual.condicion.valor ?? "").toLowerCase();
            break;
          case "no_vacio":
            cumple = valorVar.trim().length > 0;
            break;
        }

        currentState.historial.push({ pasoId: pasoActual.id, accion: "conditional", detalle: `${cumple ? "Si" : "No"}: ${valorVar}` });
        currentState.pasoActual = cumple
          ? pasoActual.condicion.paso_si
          : pasoActual.condicion.paso_no;
      }
      break;
    }

    default:
      finalizado = true;
  }

  return { newState: currentState, finalizado };
}

export function matchTrigger(flow: Flow, texto: string): boolean {
  if (!flow.activo) return false;

  const trigger = flow.trigger;
  const lowerTexto = texto.toLowerCase();

  if (trigger.keywords) {
    for (const kw of trigger.keywords) {
      if (lowerTexto.includes(kw.toLowerCase())) return true;
    }
  }

  if (trigger.regex) {
    for (const rx of trigger.regex) {
      try {
        if (new RegExp(rx, "i").test(lowerTexto)) return true;
      } catch {
        // regex invalido, ignorar
      }
    }
  }

  return false;
}

export function createInitialState(flow: Flow): FlowState {
  const primerPaso = flow.pasos[0];
  return {
    flowId: flow.id ?? 0,
    pasoActual: primerPaso?.id ?? "end",
    variables: {},
    historial: [],
    intentos: 0,
  };
}

export function isWaitingForAnswer(state: FlowState): boolean {
  return state.pasoActual.endsWith(".wait");
}

export function handleAnswer(
  state: FlowState,
  flow: Flow,
  texto: string
): FlowState {
  const newState = { ...state };

  // Encontrar el paso padre del .wait
  const pasoId = state.pasoActual.replace(".wait", "");
  const paso = flow.pasos.find((s) => s.id === pasoId);

  if (paso?.campo) {
    newState.variables[paso.campo] = texto;
  }

  newState.historial.push({ pasoId, accion: "answer_received" });
  newState.pasoActual = paso?.siguiente ?? "end";
  newState.intentos = 0;

  return newState;
}

function interpolate(texto: string, variables: Record<string, string>): string {
  return texto.replace(/{{(\w+)}}/g, (_, key) => variables[key] ?? "");
}
