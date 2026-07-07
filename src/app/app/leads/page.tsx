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
  nombre: string;
  color_fondo: string;
  color_texto: string;
  orden: number;
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

  useEffect(() => {
    apiGet<Calificacion[]>("/leads/calificaciones")
      .then(setCalificaciones)
      .catch(() => setCalificaciones([
        { nombre: "hot", color_fondo: "#fce4ec", color_texto: "#c62828", orden: 0 },
        { nombre: "warm", color_fondo: "#fff8e1", color_texto: "#f57f17", orden: 1 },
        { nombre: "cold", color_fondo: "#f5f5f5", color_texto: "#757575", orden: 2 },
      ]));
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
      await apiPatch(`/leads/${id}`, { calificacion: valor });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, calificacion: valor } : l))
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

  function actualizarFiltros(cal: string, etapa: string) {
    const p = new URLSearchParams();
    if (cal) p.set("calificacion", cal);
    if (etapa) p.set("etapa", etapa);
    router.push(`/app/leads?${p}`);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Leads</h1>
        <div className="flex gap-2">
          <select
            value={filtroCal}
            onChange={(e) => actualizarFiltros(e.target.value, filtroEtapa)}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          >
            <option value="">Todas calificaciones</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <select
            value={filtroEtapa}
            onChange={(e) => actualizarFiltros(filtroCal, e.target.value)}
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
              <th className="px-4 py-3 text-left font-medium text-white">Asignado</th>
              <th className="px-4 py-3 text-left font-medium text-white">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const cal = calificaciones.find(c => c.nombre === l.calificacion);
              const etCol = etapaColores[l.etapa ?? "nuevo"] ?? { bg: "#f5f5f5", text: "#464646" };
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
                      {calificaciones.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
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
