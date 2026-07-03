export type FlowStepType =
  | "send_text"
  | "ask_question"
  | "save_lead_field"
  | "qualify_lead"
  | "escalate_to_human"
  | "end_flow"
  | "conditional";

export interface FlowTrigger {
  keywords?: string[];
  regex?: string[];
  horarios?: { dias?: number[]; hora_inicio?: string; hora_fin?: string };
}

export interface FlowStep {
  id: string;
  tipo: FlowStepType;
  texto?: string;
  campo?: string;
  siguiente?: string;
  si_contiene?: string[];
  calificacion?: "hot" | "warm" | "cold";
  condicion?: {
    campo: string;
    operador: "contiene" | "igual" | "no_vacio";
    valor?: string;
    paso_si: string;
    paso_no: string;
  };
}

export interface Flow {
  id?: number;
  agencia_id: number;
  nombre: string;
  activo: boolean;
  trigger: FlowTrigger;
  pasos: FlowStep[];
  version: number;
}

export interface FlowState {
  flowId: number;
  pasoActual: string;
  variables: Record<string, string>;
  historial: Array<{ pasoId: string; accion: string }>;
  intentos: number;
}
