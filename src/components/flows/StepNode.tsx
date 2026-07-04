"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export const StepNode = memo(function StepNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const hasCondition = d.tipo === "conditional" || Boolean(d.condicion);

  return (
    <div
      className={`rounded-xl border-2 bg-white px-4 py-3 shadow-sm transition-shadow min-w-[180px] ${
        selected ? "shadow-md" : ""
      }`}
      style={{ borderColor: selected ? (d.color as string) ?? "#e5e5e5" : "#e5e5e5" }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#6b7280" }} />

      <div className="flex items-center gap-2">
        <span>{d.icon as string}</span>
        <div>
          <p className="text-sm font-medium" style={{ color: (d.color as string) ?? "#6b7280" }}>
            {d.label as string}
          </p>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            {d.tipo === "send_text" && d.texto
              ? `${(d.texto as string).slice(0, 40)}...`
              : d.tipo === "ask_question"
                ? `❓ ${(d.texto as string)?.slice(0, 30)}...`
                : d.tipo === "conditional"
                  ? `🔀 ${(d.condicion as Record<string, string>)?.campo ?? "sin configurar"}`
                  : d.tipo === "save_lead_field"
                    ? `💾 ${(d.campo as string) ?? "sin campo"}`
                    : d.tipo === "qualify_lead"
                      ? `🏷️ ${(d.calificacion as string) ?? "sin calificar"}`
                      : d.tipo === "escalate_to_human"
                        ? "👤 Escalar a agente"
                        : "⏹️ Finalizar"}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: "#6b7280" }} />
      {hasCondition && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="si"
            style={{ background: "#27a536", top: "60%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="no"
            style={{ background: "#cf2e2e", top: "60%" }}
          />
        </>
      )}
    </div>
  );
});
