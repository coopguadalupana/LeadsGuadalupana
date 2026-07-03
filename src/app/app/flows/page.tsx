"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Flow } from "@/lib/flows/types";

export default function FlowsListPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flows")
      .then((r) => r.json())
      .then(setFlows)
      .finally(() => setLoading(false));
  }, []);

  async function toggleFlow(id: number, activo: boolean) {
    const flow = flows.find((f) => f.id === id);
    if (!flow) return;
    await fetch(`/api/flows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: flow.nombre, activo, trigger: flow.trigger, pasos: flow.pasos }),
    });
    setFlows(flows.map((f) => (f.id === id ? { ...f, activo } : f)));
  }

  async function deleteFlow(id: number) {
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
    setFlows(flows.filter((f) => f.id !== id));
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flujos de Auto-Respuesta</h1>
        <button onClick={() => router.push("/app/flows/nuevo")} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Nuevo flujo
        </button>
      </div>
      <div className="space-y-3">
        {flows.map((flow) => (
          <div key={flow.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div>
              <p className="font-medium">{flow.nombre}</p>
              <p className="text-xs text-gray-500">{flow.pasos?.length ?? 0} pasos · v{flow.version}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleFlow(flow.id!, !flow.activo)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${flow.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {flow.activo ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => router.push(`/app/flows/${flow.id}`)} className="text-sm text-blue-600">Editar</button>
              <button onClick={() => deleteFlow(flow.id!)} className="text-sm text-red-500">Eliminar</button>
            </div>
          </div>
        ))}
        {flows.length === 0 && <p className="py-8 text-center text-gray-400">No hay flujos configurados</p>}
      </div>
    </div>
  );
}
