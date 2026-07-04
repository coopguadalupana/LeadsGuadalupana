"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/client-api";

interface Lead {
  id: number;
  conversacion_id: number;
  nombre: string | null;
  telefono: string | null;
  calificacion: string | null;
  asignado_nombre: string | null;
  notas: string | null;
  creado: string;
}

const COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-yellow-100 text-yellow-700",
  cold: "bg-gray-100 text-gray-600",
};

export default function LeadsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const filtro = sp.get("calificacion") ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (filtro) params.set("calificacion", filtro);
        const data = await apiGet<Lead[]>(`/leads?${params}`);
        setLeads(data);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [filtro]);

  async function cambiarCalificacion(id: number, valor: string) {
    try {
      await apiPatch(`/leads/${id}`, { calificacion: valor });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, calificacion: valor } : l))
      );
    } catch {}
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const v = f.get("calificacion") as string;
            const p = new URLSearchParams();
            if (v) p.set("calificacion", v);
            router.push(`/app/leads?${p}`);
          }}
        >
          <select
            name="calificacion"
            defaultValue={filtro}
            onChange={(e) => {
              const p = new URLSearchParams();
              if (e.target.value) p.set("calificacion", e.target.value);
              router.push(`/app/leads?${p}`);
            }}
            className="rounded border px-3 py-1 text-sm"
          >
            <option value="">Todas</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Telefono</th>
              <th className="px-4 py-3 text-left font-medium">Calificacion</th>
              <th className="px-4 py-3 text-left font-medium">Asignado</th>
              <th className="px-4 py-3 text-left font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/app/inbox/${l.conversacion_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {l.nombre ?? "(sin nombre)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{l.telefono}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.calificacion ?? ""}
                    onChange={(e) => cambiarCalificacion(l.id, e.target.value)}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${COLORS[l.calificacion ?? ""] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {l.asignado_nombre ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(l.creado).toLocaleDateString("es-GT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && (
          <p className="py-8 text-center text-gray-400">No hay leads</p>
        )}
      </div>
    </div>
  );
}
