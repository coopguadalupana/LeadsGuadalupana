"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiGet } from "@/lib/client-api";
import { formatGtDate } from "@/lib/format-date";
import { canViewAllConversationsSync } from "@/lib/auth/permissions-client";

interface Conversacion {
  id: number;
  agencia_id: number;
  agencia_nombre?: string;
  plataforma: string;
  contacto_externo_id: string;
  estado: string;
  ad_id: string | null;
  creado: string;
  actualizado: string;
  asignado_nombre: string | null;
  ultimo_mensaje: string | null;
  msgs_no_leidos: number;
  cliente_nombre?: string | null;
  etiquetas?: string | null;
}

interface Agencia {
  id: number;
  nombre: string;
}

export default function InboxPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session } = useSession();
  const rol = session?.user?.rol ?? "";
  const puedeVerTodas = canViewAllConversationsSync(rol);
  const estado = sp.get("estado") ?? "todas";
  const q = sp.get("q") ?? "";
  const agenciaFiltro = sp.get("agencia_id") ?? "";
  const activeRef = useRef(true);

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  useEffect(() => {
    if (puedeVerTodas) {
      apiGet<Agencia[]>("/agency/list").then(setAgencias).catch(() => {});
    }
  }, [puedeVerTodas]);

  useEffect(() => {
    activeRef.current = true;
    const controller = new AbortController();

    async function fetchData() {
      const params = new URLSearchParams();
      if (estado !== "todas") params.set("estado", estado);
      if (q) params.set("q", q);
      if (agenciaFiltro) params.set("agencia_id", agenciaFiltro);
      try {
        const data = await apiGet<Conversacion[]>(`/conversations?${params}`);
        if (activeRef.current) setConversaciones(data);
      } catch {
        // Silently ignore fetch errors during polling
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      activeRef.current = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [estado, q, agenciaFiltro]);

  function preview(c: Conversacion) {
    try {
      const parsed = JSON.parse(c.ultimo_mensaje ?? "{}");
      return parsed.text ?? parsed.image_caption ?? parsed.interactive_reply?.title ?? "📷 Imagen";
    } catch {
      return "";
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Inbox</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = new URLSearchParams();
            const est = f.get("estado") as string;
            const busq = f.get("q") as string;
            const agId = f.get("agencia_id") as string;
            if (est !== "todas") p.set("estado", est);
            if (busq) p.set("q", busq);
            if (agId) p.set("agencia_id", agId);
            router.push(`/app/inbox?${p}`);
          }}
          className="flex flex-wrap gap-2"
        >
          {puedeVerTodas && agencias.length > 0 && (
            <select name="agencia_id" defaultValue={agenciaFiltro} className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" style={{ borderColor: "#e5e5e5", color: "#464646" }}>
              <option value="">Todas las agencias</option>
              {agencias.map(a => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
            </select>
          )}
          <select name="estado" defaultValue={estado} className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" style={{ borderColor: "#e5e5e5", color: "#464646" }}>
            <option value="auto_respondiendo">Auto-respuesta</option>
            <option value="en_espera">En espera</option>
            <option value="en_curso">En curso</option>
            <option value="cerrada">Cerradas</option>
            <option value="todas">Todas</option>
          </select>
          <input type="text" name="q" defaultValue={q} placeholder="Buscar por numero..." className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" style={{ borderColor: "#e5e5e5", color: "#464646" }} />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#cf2e2e" }}>
            Filtrar
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {conversaciones.map((c) => {
          const pv = preview(c);
          const estadoStyle = c.estado === "auto_respondiendo" ? { background: "#e8f5e9", color: "#27a536" }
            : c.estado === "en_espera" ? { background: "#fff3e0", color: "#e65100" }
            : c.estado === "en_curso" ? { background: "#e3f2fd", color: "#0e5bb0" }
            : { background: "#f5f5f5", color: "#9e9e9e" };
          return (
            <Link
              key={c.id}
              href={`/app/inbox/${c.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-md" style={{ borderColor: "#e5e5e5" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold" style={{ color: "#003160" }}>
                    {c.cliente_nombre || c.contacto_externo_id}
                  </p>
                  {c.msgs_no_leidos > 0 && (
                    <span className="inline-flex size-5 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: "#cf2e2e" }}>
                      {c.msgs_no_leidos}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm" aria-label="Ultimo mensaje" style={{ color: "#6b7280" }}>{pv || "..."}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={estadoStyle}>
                    {c.estado.replace("_", " ")}
                  </span>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>
                    {c.asignado_nombre ? `Asignado: ${c.asignado_nombre}` : c.plataforma}
                  </span>
                  {c.agencia_nombre && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium" style={{ color: "#0e5bb0" }}>
                      {c.agencia_nombre}
                    </span>
                  )}
                  {c.etiquetas && (() => {
                    try { return JSON.parse(c.etiquetas).map((t: string) => (
                      <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs" style={{ color: "#6b7280" }}>{t}</span>
                    )); } catch { return null; }
                  })()}
                </div>
              </div>
              <div className="ml-4 shrink-0 text-right text-xs" style={{ color: "#9ca3af" }}>
                {formatGtDate(c.actualizado)}
              </div>
            </Link>
          );
        })}
        {conversaciones.length === 0 && (
          <p className="py-8 text-center" style={{ color: "#9ca3af" }}>No hay conversaciones</p>
        )}
      </div>
    </div>
  );
}
