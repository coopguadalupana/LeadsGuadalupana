"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client-api";

interface Conversacion {
  id: number;
  plataforma: string;
  contacto_externo_id: string;
  estado: string;
  ad_id: string | null;
  creado: string;
  actualizado: string;
  asignado_nombre: string | null;
  ultimo_mensaje: string | null;
  msgs_no_leidos: number;
}

export default function InboxPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const estado = sp.get("estado") ?? "todas";
  const q = sp.get("q") ?? "";
  const activeRef = useRef(true);

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);

  useEffect(() => {
    activeRef.current = true;
    const controller = new AbortController();

    async function fetchData() {
      const params = new URLSearchParams();
      if (estado !== "todas") params.set("estado", estado);
      if (q) params.set("q", q);
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
  }, [estado, q]);

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
            if (est !== "auto_respondiendo") p.set("estado", est);
            if (busq) p.set("q", busq);
            router.push(`/app/inbox?${p}`);
          }}
          className="flex gap-2"
        >
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
                  <p className="truncate font-semibold" style={{ color: "#003160" }}>{c.contacto_externo_id}</p>
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
                </div>
              </div>
              <div className="ml-4 shrink-0 text-right text-xs" style={{ color: "#9ca3af" }}>
                {new Date(c.actualizado).toLocaleDateString("es-GT", {
                  day: "2-digit", month: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
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
