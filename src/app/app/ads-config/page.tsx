"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client-api";

interface AdMapping {
  ad_id: string;
  campaign_id: string;
  campaign_name: string | null;
  ad_name: string | null;
  agency_id: number | null;
  agencia_nombre: string | null;
  es_manual: boolean;
  ultima_actualizacion: string;
}

interface Agencia {
  id: number;
  nombre: string;
}

export default function AdsConfigPage() {
  const [ads, setAds] = useState<AdMapping[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoAdId, setNuevoAdId] = useState("");
  const [nuevaAgenciaId, setNuevaAgenciaId] = useState("");
  const [nuevoCampaignName, setNuevoCampaignName] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<AdMapping[]>("/agency/ads").then(setAds).catch(() => {});
    apiGet<Agencia[]>("/agency/agents")
      .then((agentes) => {
        const unique = new Map<number, string>();
        agentes.forEach((a: any) => unique.set(a.agencia_id, a.agencia_nombre));
        setAgencias(Array.from(unique.entries()).map(([id, nombre]) => ({ id, nombre })));
      })
      .catch(() => {});
  }, []);

  async function agregar() {
    if (!nuevoAdId || !nuevaAgenciaId) return;
    setGuardando(true);
    setError("");
    try {
      await apiPost("/agency/ads", {
        ad_id: nuevoAdId.trim(),
        agency_id: Number(nuevaAgenciaId),
        campaign_name: nuevoCampaignName.trim() || null,
      });
      setMostrarModal(false);
      setNuevoAdId("");
      setNuevaAgenciaId("");
      setNuevoCampaignName("");
      const updated = await apiGet<AdMapping[]>("/agency/ads");
      setAds(updated);
    } catch {
      setError("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(adId: string) {
    if (!confirm(`Eliminar mapping del anuncio "${adId}"?`)) return;
    try {
      await fetch(`/leads/api/agency/ads/${adId}`, { method: "DELETE" });
      setAds((prev) => prev.filter((a) => a.ad_id !== adId));
    } catch {
      setError("Error al eliminar");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Anuncios por Agencia</h1>
        <button onClick={() => setMostrarModal(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: "#cf2e2e" }}>
          + Agregar anuncio
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "#e5e5e5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#003160" }}>
              <th className="px-4 py-3 text-left font-medium text-white">Ad ID</th>
              <th className="px-4 py-3 text-left font-medium text-white">Agencia</th>
              <th className="px-4 py-3 text-left font-medium text-white">Campaña</th>
              <th className="px-4 py-3 text-left font-medium text-white">Fuente</th>
              <th className="px-4 py-3 text-left font-medium text-white">Actualizado</th>
              <th className="px-4 py-3 text-left font-medium text-white">Acción</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.ad_id} className="border-b hover:bg-gray-50" style={{ borderColor: "#f0f0f0" }}>
                <td className="px-4 py-3 font-mono text-xs font-medium">{a.ad_id}</td>
                <td className="px-4 py-3" style={{ color: "#464646" }}>{a.agencia_nombre ?? "-"}</td>
                <td className="px-4 py-3" style={{ color: "#6b7280" }}>{a.campaign_name ?? a.campaign_id ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.es_manual ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {a.es_manual ? "Manual" : "Meta API"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#9ca3af" }}>
                  {new Date(a.ultima_actualizacion).toLocaleString("es-GT", { timeZone: "America/Guatemala" })}
                </td>
                <td className="px-4 py-3">
                  {a.es_manual && (
                    <button onClick={() => eliminar(a.ad_id)} className="text-xs text-red-500 hover:text-red-700">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ads.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm" style={{ color: "#9ca3af" }}>Sin anuncios configurados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "#003160" }}>Agregar anuncio</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Ad ID</label>
              <input type="text" value={nuevoAdId} onChange={(e) => setNuevoAdId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="ej: ad_123456789" />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Agencia</label>
              <select value={nuevaAgenciaId} onChange={(e) => setNuevaAgenciaId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}>
                <option value="">Seleccionar...</option>
                {agencias.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((ag) => (
                  <option key={ag.id} value={ag.id}>{ag.nombre}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Campaign Name (opcional)</label>
              <input type="text" value={nuevoCampaignName} onChange={(e) => setNuevoCampaignName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="ej: Campana Meta Ads" />
            </div>
            <button onClick={agregar} disabled={guardando || !nuevoAdId || !nuevaAgenciaId}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#cf2e2e" }}>
              {guardando ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
