"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const estado = sp.get("estado") ?? "auto_respondiendo";
  const q = sp.get("q") ?? "";

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);

  useEffect(() => {
    async function fetchData() {
      const params = new URLSearchParams();
      if (estado !== "todas") params.set("estado", estado);
      if (q) params.set("q", q);
      const data = await apiGet<Conversacion[]>(`/conversations?${params}`);
      setConversaciones(data);
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
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
        <h1 className="text-2xl font-bold">Inbox</h1>
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
          <select name="estado" defaultValue={estado} className="rounded border px-3 py-1 text-sm">
            <option value="auto_respondiendo">Auto-respuesta</option>
            <option value="en_espera">En espera</option>
            <option value="en_curso">En curso</option>
            <option value="cerrada">Cerradas</option>
            <option value="todas">Todas</option>
          </select>
          <input type="text" name="q" defaultValue={q} placeholder="Buscar por numero..." className="rounded border px-3 py-1 text-sm" />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Filtrar</button>
        </form>
      </div>

      <div className="space-y-2">
        {conversaciones.map((c) => {
          const pv = preview(c);
          return (
            <Link
              key={c.id}
              href={`/app/inbox/${c.id}`}
              className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{c.contacto_externo_id}</p>
                  {c.msgs_no_leidos > 0 && (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      {c.msgs_no_leidos}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-gray-500">{pv || "..."}</p>
                <p className="text-xs text-gray-400">
                  {c.plataforma}
                  {c.estado !== "auto_respondiendo" && ` · ${c.estado.replace("_", " ")}`}
                  {c.asignado_nombre && ` · ${c.asignado_nombre}`}
                </p>
              </div>
              <div className="ml-4 shrink-0 text-right text-xs text-gray-400">
                {new Date(c.actualizado).toLocaleDateString("es-GT", {
                  day: "2-digit", month: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </Link>
          );
        })}
        {conversaciones.length === 0 && (
          <p className="py-8 text-center text-gray-400">No hay conversaciones</p>
        )}
      </div>
    </div>
  );
}
