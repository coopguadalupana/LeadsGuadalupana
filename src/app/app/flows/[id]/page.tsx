"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/lib/client-api";
import type { Flow, FlowStep, FlowTrigger } from "@/lib/flows/types";
import FlowBuilder from "@/components/flows/FlowBuilder";

export default function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "nuevo";

  const [nombre, setNombre] = useState("");
  const [trigger, setTrigger] = useState<FlowTrigger>({ keywords: [] });
  const [pasos, setPasos] = useState<FlowStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    apiGet<Flow[]>("/flows")
      .then((flows) => {
        const flow = flows.find((f) => String(f.id) === id);
        if (flow) {
          setNombre(flow.nombre);
          setTrigger(flow.trigger);
          setPasos(flow.pasos);
        }
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSave(data: { nombre: string; trigger: FlowTrigger; pasos: FlowStep[] }) {
    setSaving(true);
    try {
      if (isNew) {
        await apiPost("/flows", data);
      } else {
        await apiPut(`/flows/${id}`, data);
      }
      router.push("/app/flows");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6" style={{ color: "#6b7280" }}>Cargando...</p>;

  return (
    <div className="flex h-full flex-col">
      <button onClick={() => router.push("/app/flows")} className="mb-4 text-sm font-medium" style={{ color: "#cf2e2e" }}>
        &larr; Volver
      </button>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: "#003160" }}>
        {isNew ? "Nuevo flujo" : "Editar flujo"}
      </h1>
      <div className="flex-1">
        <FlowBuilder
          initialNombre={nombre}
          initialTrigger={trigger}
          initialPasos={pasos}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
