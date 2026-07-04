"use client";

import type { Node } from "@xyflow/react";

interface NodeEditorProps {
  node: Node;
  onUpdate: (updated: Node) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const d = (node.data ?? {}) as Record<string, unknown>;
  const tipo = d.tipo as string;

  function set(key: string, value: unknown) {
    onUpdate({ ...node, data: { ...node.data, [key]: value } });
  }

  return (
    <div
      className="w-72 shrink-0 rounded-lg border bg-white p-4 shadow-lg"
      style={{ borderColor: "#e5e5e5" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm" style={{ color: (d.color as string) ?? "#6b7280" }}>
          Editar: {d.label as string}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {tipo === "send_text" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Texto a enviar</label>
          <textarea
            value={(d.texto as string) ?? ""}
            onChange={(e) => set("texto", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            rows={3}
            placeholder="Escribe el mensaje..."
          />
        </div>
      )}

      {tipo === "send_template" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Nombre de la plantilla</label>
          <input
            type="text"
            value={(d.template_name as string) ?? ""}
            onChange={(e) => set("template_name", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            placeholder="ej: bienvenida_whatsapp"
          />
          <label className="mt-2 mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Parametros (JSON, opcional)</label>
          <textarea
            value={(d.template_params as string) ?? "[]"}
            onChange={(e) => set("template_params", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            rows={3}
            placeholder='[{"type":"text","text":"{{nombre}}"}]'
          />
        </div>
      )}

      {tipo === "send_interactive" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Texto del mensaje</label>
          <textarea
            value={(d.texto as string) ?? ""}
            onChange={(e) => set("texto", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            rows={2}
            placeholder="Mensaje con botones..."
          />
          <label className="mt-2 mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Botones (uno por linea)</label>
          <textarea
            value={((d.botones as string[]) ?? []).join("\n")}
            onChange={(e) => set("botones", e.target.value.split("\n").filter(Boolean))}
            className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            rows={4}
            placeholder={`Opcion 1\nOpcion 2\nOpcion 3`}
          />
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Maximo 3 botones. Cada linea es una opcion.</p>
        </div>
      )}

      {tipo === "ask_question" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Pregunta</label>
          <textarea
            value={(d.texto as string) ?? ""}
            onChange={(e) => set("texto", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            rows={2}
            placeholder="¿Que deseas saber?"
          />
          <label className="mt-2 mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Campo a guardar</label>
          <input
            type="text"
            value={(d.campo as string) ?? ""}
            onChange={(e) => set("campo", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            placeholder="ej: nombre, telefono, email"
          />
        </div>
      )}

      {tipo === "conditional" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Campo a evaluar</label>
          <input
            type="text"
            value={((d.condicion as Record<string, unknown>)?.campo as string) ?? ""}
            onChange={(e) => set("condicion", { campo: e.target.value, operador: (d.condicion as Record<string, unknown>)?.operador ?? "contiene", paso_si: (d.condicion as Record<string, unknown>)?.paso_si ?? "", paso_no: (d.condicion as Record<string, unknown>)?.paso_no ?? "" })}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            placeholder="ej: nombre, calificacion"
          />
          <label className="mt-2 mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Operador</label>
          <select
            value={((d.condicion as Record<string, unknown>)?.operador as string) ?? "contiene"}
            onChange={(e) => set("condicion", { campo: (d.condicion as Record<string, unknown>)?.campo ?? "", operador: e.target.value, paso_si: (d.condicion as Record<string, unknown>)?.paso_si ?? "", paso_no: (d.condicion as Record<string, unknown>)?.paso_no ?? "" })}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="contiene">Contiene</option>
            <option value="igual">Igual a</option>
            <option value="no_vacio">No vacio</option>
          </select>
          {(d.condicion as Record<string, unknown>)?.operador !== "no_vacio" && (
            <>
              <label className="mt-2 mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Valor</label>
              <input
                type="text"
                value={((d.condicion as Record<string, unknown>)?.valor as string) ?? ""}
                onChange={(e) => set("condicion", { campo: (d.condicion as Record<string, unknown>)?.campo ?? "", operador: (d.condicion as Record<string, unknown>)?.operador ?? "contiene", valor: e.target.value, paso_si: (d.condicion as Record<string, unknown>)?.paso_si ?? "", paso_no: (d.condicion as Record<string, unknown>)?.paso_no ?? "" })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}
              />
            </>
          )}
          <p className="mt-2 text-xs" style={{ color: "#9ca3af" }}>
            Conecta los handles laterales (✅ verde = Si, ❌ rojo = No)
          </p>
        </div>
      )}

      {tipo === "save_lead_field" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Campo</label>
          <input
            type="text"
            value={(d.campo as string) ?? ""}
            onChange={(e) => set("campo", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            placeholder="nombre, telefono, email..."
          />
        </div>
      )}

      {tipo === "qualify_lead" && (
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Calificacion</label>
          <select
            value={(d.calificacion as string) ?? "warm"}
            onChange={(e) => set("calificacion", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="hot">🔥 Hot</option>
            <option value="warm">🟡 Warm</option>
            <option value="cold">🔵 Cold</option>
          </select>
        </div>
      )}

      {tipo === "escalate_to_human" && (
        <p className="text-sm" style={{ color: "#6b7280" }}>
          La conversacion pasara a estado <strong>en espera</strong> y un agente la tomara.
        </p>
      )}

      {tipo === "end_flow" && (
        <p className="text-sm" style={{ color: "#6b7280" }}>
          El flujo finaliza aqui. No se requiere configuracion adicional.
        </p>
      )}
    </div>
  );
}
