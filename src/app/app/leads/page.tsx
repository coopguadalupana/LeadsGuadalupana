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
  etapa: string | null;
  asignado_nombre: string | null;
  notas: string | null;
  creado: string;
}

interface Calificacion {
  id: number;
  nombre: string;
  color_fondo: string;
  color_texto: string;
  orden: number;
  activo: boolean;
}

const etapaColores: Record<string, { bg: string; text: string }> = {
  nuevo: { bg: "#e3f2fd", text: "#1565c0" },
  contactado: { bg: "#fff3e0", text: "#e65100" },
  calificado: { bg: "#f3e5f5", text: "#7b1fa2" },
  convertido: { bg: "#e8f5e9", text: "#2e7d32" },
  seguimiento: { bg: "#fce4ec", text: "#c62828" },
  perdido: { bg: "#eeeeee", text: "#616161" },
};

const etapas = ["nuevo", "contactado", "calificado", "convertido", "seguimiento", "perdido"];

export default function LeadsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const filtroCal = sp.get("calificacion") ?? "";
  const filtroEtapa = sp.get("etapa") ?? "";
  const activeRef = useRef(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [editNotasId, setEditNotasId] = useState<number | null>(null);
  const [editNotasVal, setEditNotasVal] = useState("");

  useEffect(() => {
    apiGet<Calificacion[]>("/leads/calificaciones")
      .then(setCalificaciones)
      .catch(() => setCalificaciones([]));
  }, []);

  useEffect(() => {
    activeRef.current = true;

    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (filtroCal) params.set("calificacion", filtroCal);
        if (filtroEtapa) params.set("etapa", filtroEtapa);
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
  }, [filtroCal, filtroEtapa]);

  async function cambiarCalificacion(id: number, valor: string) {
    try {
      await apiPatch(`/leads/${id}`, { calificacion: valor || null });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, calificacion: valor || null } : l))
      );
    } catch {}
  }

  async function cambiarEtapa(id: number, valor: string) {
    try {
      await apiPatch(`/leads/${id}`, { etapa: valor });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, etapa: valor } : l))
      );
    } catch {}
  }

  async function guardarNotas(id: number) {
    try {
      await apiPatch(`/leads/${id}`, { notas: editNotasVal });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, notas: editNotasVal } : l))
      );
      setEditNotasId(null);
    } catch {}
  }

  const calificacionesActivas = calificaciones.filter(c => c.activo);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Leads</h1>
        <div className="flex gap-2">
          <select
            value={filtroCal}
            onChange={(e) => {
              const p = new URLSearchParams();
              if (e.target.value) p.set("calificacion", e.target.value);
              if (filtroEtapa) p.set("etapa", filtroEtapa);
              router.push(`/app/leads?${p}`);
            }}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="">Todas calificaciones</option>
            {calificacionesActivas.map(c => (
              <option key={c.nombre} value={c.nombre}>{c.nombre.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filtroEtapa}
            onChange={(e) => {
              const p = new URLSearchParams();
              if (filtroCal) p.set("calificacion", filtroCal);
              if (e.target.value) p.set("etapa", e.target.value);
              router.push(`/app/leads?${p}`);
            }}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="">Todas etapas</option>
            {etapas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "#e5e5e5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#003160" }}>
              <th className="px-4 py-3 text-left font-medium text-white">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-white">Telefono</th>
              <th className="px-4 py-3 text-left font-medium text-white">Etapa</th>
              <th className="px-4 py-3 text-left font-medium text-white">Calificacion</th>
              <th className="px-4 py-3 text-left font-medium text-white">Notas</th>
              <th className="px-4 py-3 text-left font-medium text-white">Asignado</th>
              <th className="px-4 py-3 text-left font-medium text-white">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const cal = calificacionesActivas.find(c => c.nombre === l.calificacion);
              const etCol = etapaColores[l.etapa ?? "nuevo"] ?? { bg: "#f5f5f5", text: "#464646" };
              const editando = editNotasId === l.id;
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
                      value={l.etapa ?? "nuevo"}
                      onChange={(e) => cambiarEtapa(l.id, e.target.value)}
                      className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium capitalize focus:outline-none"
                      aria-label="Cambiar etapa"
                      style={{ background: etCol.bg, color: etCol.text, border: "none" }}
                    >
                      {etapas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.calificacion ?? ""}
                      onChange={(e) => cambiarCalificacion(l.id, e.target.value)}
                      className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
                      aria-label="Cambiar calificacion"
                      style={{ background: cal?.color_fondo ?? "#f5f5f5", color: cal?.color_texto ?? "#757575", border: "none" }}
                    >
                      <option value="">Sin calificacion</option>
                      {calificacionesActivas.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {editando ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editNotasVal}
                          onChange={(e) => setEditNotasVal(e.target.value)}
                          className="w-40 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                          style={{ borderColor: "#e5e5e5" }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") guardarNotas(l.id);
                            if (e.key === "Escape") setEditNotasId(null);
                          }}
                        />
                        <button
                          onClick={() => guardarNotas(l.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-white"
                          style={{ background: "#27a536" }}
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditNotasId(null)}
                          className="rounded px-2 py-1 text-xs font-medium"
                          style={{ background: "#f0f0f0", color: "#464646" }}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditNotasId(l.id); setEditNotasVal(l.notas ?? ""); }}
                        className="max-w-40 truncate rounded px-2 py-1 text-xs text-left transition-colors"
                        style={{ color: l.notas ? "#464646" : "#9ca3af", background: "#f9f9f9" }}
                        title={l.notas ?? ""}
                      >
                        {l.notas || "+ Agregar nota"}
                      </button>
                    )}
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
