"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/client-api";
import { formatGtDate } from "@/lib/format-date";

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

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  hot: { bg: "#fce4ec", text: "#c62828" },
  warm: { bg: "#fff8e1", text: "#f57f17" },
  cold: { bg: "#f5f5f5", text: "#757575" },
};

export default function LeadsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const filtro = sp.get("calificacion") ?? "";
  const activeRef = useRef(true);

  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    activeRef.current = true;

    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (filtro) params.set("calificacion", filtro);
        const data = await apiGet<Lead[]>(`/leads?${params}`);
        if (activeRef.current) setLeads(data);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      activeRef.current = false;
      clearInterval(interval);
    };
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
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Leads</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = new URLSearchParams();
            if (f.get("calificacion")) p.set("calificacion", f.get("calificacion") as string);
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
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="">Todas</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "#e5e5e5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#003160" }}>
              <th className="px-4 py-3 text-left font-medium text-white">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-white">Telefono</th>
              <th className="px-4 py-3 text-left font-medium text-white">Calificacion</th>
              <th className="px-4 py-3 text-left font-medium text-white">Asignado</th>
              <th className="px-4 py-3 text-left font-medium text-white">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const badge = BADGE_COLORS[l.calificacion ?? ""] ?? { bg: "#f5f5f5", text: "#757575" };
              return (
                <tr key={l.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: "#f0f0f0" }}>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/app/inbox/${l.conversacion_id}`}
                      className="transition-colors hover:underline"
                      style={{ color: "#0e5bb0" }}
                    >
                      {l.nombre ?? "(sin nombre)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#464646" }}>{l.telefono}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.calificacion ?? ""}
                      onChange={(e) => cambiarCalificacion(l.id, e.target.value)}
                      className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
                      aria-label="Cambiar calificacion"
                      style={{ background: badge.bg, color: badge.text, border: "none" }}
                    >
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="cold">Cold</option>
                    </select>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#6b7280" }}>{l.asignado_nombre ?? "-"}</td>
                  <td className="px-4 py-3" style={{ color: "#9ca3af" }}>
                    {formatGtDate(l.creado)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {leads.length === 0 && (
          <p className="py-8 text-center" style={{ color: "#9ca3af" }}>No hay leads</p>
        )}
      </div>
    </div>
  );
}
