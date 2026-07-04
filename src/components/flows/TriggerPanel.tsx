"use client";

import { useState } from "react";
import type { FlowTrigger } from "@/lib/flows/types";

interface TriggerPanelProps {
  trigger: FlowTrigger;
  onChange: (trigger: FlowTrigger) => void;
  onClose: () => void;
}

export function TriggerPanel({ trigger, onChange, onClose }: TriggerPanelProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [regexInput, setRegexInput] = useState("");

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw) return;
    if ((trigger.keywords ?? []).includes(kw)) return;
    onChange({ ...trigger, keywords: [...(trigger.keywords ?? []), kw] });
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    onChange({ ...trigger, keywords: trigger.keywords?.filter((k) => k !== kw) });
  }

  function addRegex() {
    const r = regexInput.trim();
    if (!r) return;
    onChange({ ...trigger, regex: [...(trigger.regex ?? []), r] });
    setRegexInput("");
  }

  function removeRegex(r: string) {
    onChange({ ...trigger, regex: trigger.regex?.filter((x) => x !== r) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "#003160" }}>Configurar Trigger</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-5">
          {/* Keywords */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "#464646" }}>Palabras clave</label>
            <p className="mb-2 text-xs" style={{ color: "#9ca3af" }}>
              El flujo se activara cuando el mensaje del cliente contenga estas palabras
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                placeholder="ej: hola, credito, ayuda"
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}
              />
              <button
                onClick={addKeyword}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "#0e5bb0" }}
              >
                Agregar
              </button>
            </div>
            {trigger.keywords && trigger.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {trigger.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ background: "#003160" }}
                  >
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-white/70">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Regex */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "#464646" }}>Expresiones regulares</label>
            <p className="mb-2 text-xs" style={{ color: "#9ca3af" }}>
              Patrones avanzados para coincidencia de texto
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={regexInput}
                onChange={(e) => setRegexInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRegex())}
                placeholder="ej: \\d{4}-\\d{4}"
                className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}
              />
              <button
                onClick={addRegex}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "#0e5bb0" }}
              >
                Agregar
              </button>
            </div>
            {trigger.regex && trigger.regex.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {trigger.regex.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono font-medium"
                    style={{ background: "#f0f0f0", color: "#464646" }}
                  >
                    {r}
                    <button onClick={() => removeRegex(r)} className="ml-0.5 hover:text-gray-500">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule info */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "#464646" }}>Horario (opcional)</label>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Si se requiere, se agregara en una version futura. Por ahora el flujo responde 24/7.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          style={{ background: "#cf2e2e" }}
        >
          Listo
        </button>
      </div>
    </div>
  );
}
