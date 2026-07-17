"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/client-api";

interface AgenciaMetric {
  agencia_id: number;
  agencia: string;
  leads_recibidos: number;
  leads_respondidos: number;
  promedio_respuesta_min: number | null;
}

type Periodo = "hoy" | "semana" | "mes" | "personalizado";

function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getRango(periodo: Periodo, desdeCustom: string, hastaCustom: string) {
  const now = new Date();
  switch (periodo) {
    case "hoy":
      return { desde: toISO(now), hasta: toISO(now) };
    case "semana": {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const lunes = new Date(now);
      lunes.setDate(now.getDate() + diff);
      return { desde: toISO(lunes), hasta: toISO(now) };
    }
    case "mes": {
      const primero = new Date(now.getFullYear(), now.getMonth(), 1);
      return { desde: toISO(primero), hasta: toISO(now) };
    }
    case "personalizado":
      return { desde: desdeCustom, hasta: hastaCustom };
  }
}

function formatMin(min: number | null): string {
  if (min === null || min < 0) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function pctColor(pct: number): string {
  if (pct >= 80) return "#27a536";
  if (pct >= 50) return "#d97706";
  return "#cf2e2e";
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mes" },
  { key: "personalizado", label: "Personalizado" },
];

export default function ReportesPage() {
  const [data, setData] = useState<AgenciaMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [desdeCustom, setDesdeCustom] = useState(toISO(new Date()));
  const [hastaCustom, setHastaCustom] = useState(toISO(new Date()));

  const cargar = useCallback(async (p: Periodo, dc: string, hc: string) => {
    const { desde, hasta } = getRango(p, dc, hc);
    if (!desde || !hasta) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiGet<AgenciaMetric[]>(
        `/reportes/agencias?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
      );
      setData(result);
    } catch (e) {
      setError("Error al cargar los datos");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (periodo !== "personalizado") {
      cargar(periodo, desdeCustom, hastaCustom);
    }
  }, [periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  const totales = data.reduce(
    (s, r) => ({ recibidos: s.recibidos + r.leads_recibidos, respondidos: s.respondidos + r.leads_respondidos }),
    { recibidos: 0, respondidos: 0 }
  );
  const totalPct = totales.recibidos > 0
    ? Math.round((totales.respondidos / totales.recibidos) * 100)
    : 0;
  const promedioGeneral = (() => {
    const con = data.filter(r => r.promedio_respuesta_min !== null && r.promedio_respuesta_min >= 0);
    if (con.length === 0) return null;
    return con.reduce((s, r) => s + (r.promedio_respuesta_min ?? 0), 0) / con.length;
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>
            Reportes por Agencia
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
            Leads recibidos y atendidos por período
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                periodo === key
                  ? { background: "#003160", color: "#fff" }
                  : { background: "#f5f5f5", color: "#464646" }
              }
            >
              {label}
            </button>
          ))}

          {periodo === "personalizado" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={desdeCustom}
                onChange={(e) => setDesdeCustom(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-sm"
                style={{ borderColor: "#e5e5e5" }}
              />
              <span className="text-sm" style={{ color: "#6b7280" }}>–</span>
              <input
                type="date"
                value={hastaCustom}
                onChange={(e) => setHastaCustom(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-sm"
                style={{ borderColor: "#e5e5e5" }}
              />
              <button
                onClick={() => cargar("personalizado", desdeCustom, hastaCustom)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "#cf2e2e" }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Leads recibidos",
            value: loading ? "…" : totales.recibidos.toLocaleString(),
            color: "#003160",
          },
          {
            label: "Respondidos",
            value: loading ? "…" : totales.respondidos.toLocaleString(),
            color: "#27a536",
          },
          {
            label: "% Respuesta",
            value: loading ? "…" : `${totalPct}%`,
            color: pctColor(totalPct),
          },
          {
            label: "Tiempo 1ª respuesta",
            value: loading ? "…" : formatMin(promedioGeneral),
            color: "#003160",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#6b7280" }}
            >
              {label}
            </p>
            <p className="text-3xl font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p
          className="mb-4 rounded-lg p-3 text-sm font-medium text-white"
          style={{ background: "#cf2e2e" }}
        >
          {error}
        </p>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#003160" }}>
              {["Agencia", "Recibidos", "Respondidos", "% Respuesta", "Tiempo 1ª resp."].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "#6b7280" }}>
                  Cargando datos…
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "#6b7280" }}>
                  Sin datos para el período seleccionado
                </td>
              </tr>
            )}
            {!loading &&
              data.map((row) => {
                const pct =
                  row.leads_recibidos > 0
                    ? Math.round((row.leads_respondidos / row.leads_recibidos) * 100)
                    : 0;
                return (
                  <tr
                    key={row.agencia_id}
                    className="border-b last:border-0 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "#003160" }}>
                      {row.agencia}
                    </td>
                    <td className="px-4 py-3 text-right">{row.leads_recibidos}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "#27a536" }}>
                      {row.leads_respondidos}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ background: pctColor(pct) }}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "#6b7280" }}>
                      {formatMin(row.promedio_respuesta_min)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
          {!loading && data.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f5f5f5" }}>
                <td className="px-4 py-3 font-bold" style={{ color: "#003160" }}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-bold">{totales.recibidos}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "#27a536" }}>
                  {totales.respondidos}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: pctColor(totalPct) }}
                  >
                    {totalPct}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: "#6b7280" }}>
                  {formatMin(promedioGeneral)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
