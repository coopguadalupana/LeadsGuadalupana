"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/lib/client-api";
import type { Flow } from "@/lib/flows/types";

export default function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "nuevo";

  const [nombre, setNombre] = useState("");
  const [triggerJson, setTriggerJson] = useState('{\n  "keywords": []\n}');
  const [pasosJson, setPasosJson] = useState('[\n  {\n    "id": "paso1",\n    "tipo": "send_text",\n    "texto": "Hola, gracias por contactarnos"\n  }\n]');
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    if (isNew) return;
    apiGet<Flow[]>(`/flows`)
      .then((flows) => {
        const flow = flows.find((f) => String(f.id) === id);
        if (flow) {
          setNombre(flow.nombre);
          setTriggerJson(JSON.stringify(flow.trigger, null, 2));
          setPasosJson(JSON.stringify(flow.pasos, null, 2));
        }
      });
  }, [id, isNew]);

  async function save() {
    setParseError("");
    try {
      const trigger = JSON.parse(triggerJson);
      const pasos = JSON.parse(pasosJson);
      setSaving(true);
      if (isNew) {
        await apiPost("/flows", { nombre, trigger, pasos });
      } else {
        await apiPut(`/flows/${id}`, { nombre, trigger, pasos });
      }
      router.push("/app/flows");
    } catch {
      setParseError("JSON invalido — revisa la sintaxis");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button onClick={() => router.push("/app/flows")} className="mb-4 text-sm text-blue-600">&larr; Volver</button>
      <h1 className="mb-6 text-2xl font-bold">{isNew ? "Nuevo flujo" : "Editar flujo"}</h1>
      {parseError && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{parseError}</p>}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Trigger (JSON)</label>
          <textarea value={triggerJson} onChange={(e) => setTriggerJson(e.target.value)} rows={5} className="w-full rounded border px-3 py-2 font-mono text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Pasos (JSON)</label>
          <textarea value={pasosJson} onChange={(e) => setPasosJson(e.target.value)} rows={12} className="w-full rounded border px-3 py-2 font-mono text-xs" />
        </div>
        <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-6 py-2 text-sm text-white disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
