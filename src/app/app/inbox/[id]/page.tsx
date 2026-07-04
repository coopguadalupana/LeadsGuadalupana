"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiGet, apiPost, apiPatch, apiUrl } from "@/lib/client-api";

interface Mensaje {
  id: number;
  role: string;
  tipo: string;
  contenido: string;
  recibido: string;
}

interface Conversacion {
  id: number;
  contacto_externo_id: string;
  plataforma: string;
  estado: string;
  mensajes: Mensaje[];
  motivo_cierre?: string | null;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const authUserId = Number(session?.user?.id ?? 0);
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [agentes, setAgentes] = useState<Array<{ id: number; nombre: string }>>([]);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [mostrarCerrar, setMostrarCerrar] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const msgEnd = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  const fetchConv = useCallback(async () => {
    try {
      const data = await apiGet<Conversacion>(`/conversations/${id}`);
      setConv(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConv();
    const interval = setInterval(fetchConv, 5000);
    return () => clearInterval(interval);
  }, [fetchConv]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      apiPost(`/conversations/${id}/read`, {}).catch(() => {});
    }, 1000);
    return () => clearTimeout(timeout);
  }, [id]);

  useEffect(() => {
    apiGet<Array<{ id: number; nombre: string }>>("/agency/agents").then(setAgentes).catch(() => {});
  }, []);

  async function cerrarConversacion() {
    if (!motivoCierre.trim() || cerrando) return;
    setCerrando(true);
    try {
      await apiPatch(`/conversations/${id}`, { estado: "cerrada", motivo_cierre: motivoCierre });
      setMostrarCerrar(false);
      setMotivoCierre("");
      await fetchConv();
    } finally {
      setCerrando(false);
    }
  }

  async function transferir(agenteId: number) {
    setTransfiriendo(true);
    try {
      await apiPatch(`/conversations/${id}/assign`, { agente_id: agenteId });
      setMostrarTransferir(false);
    } finally {
      setTransfiriendo(false);
    }
  }

  useEffect(() => {
    if (conv && conv.mensajes.length > prevLen.current) {
      msgEnd.current?.scrollIntoView({ behavior: "smooth" });
      prevLen.current = conv.mensajes.length;
    }
  }, [conv?.mensajes]);

  async function sendMessage() {
    if (!texto.trim() || enviando) return;
    setErrorMsg("");
    setEnviando(true);
    try {
      await apiPost(`/conversations/${id}/send`, { texto });
      setTexto("");
      await fetchConv();
    } catch (e) {
      setErrorMsg("Error al enviar: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setEnviando(false);
    }
  }

  async function sendMedia() {
    const file = fileInput.current?.files?.[0];
    if (!file || subiendoImg) return;
    setSubiendoImg(true);
    try {
      const formData = new FormData();
      formData.append("media", file);
      const res = await fetch(apiUrl(`/conversations/${id}/send`), {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        if (fileInput.current) fileInput.current.value = "";
        await fetchConv();
      }
    } finally {
      setSubiendoImg(false);
    }
  }

  if (loading) return <p className="p-6" style={{ color: "#6b7280" }}>Cargando...</p>;
  if (!conv) return <p className="p-6" style={{ color: "#6b7280" }}>Conversacion no encontrada</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b pb-4" style={{ borderColor: "#e5e5e5" }}>
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/app/inbox")}
              className="mb-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#cf2e2e" }}
            >
              &larr; Volver
            </button>
            <h2 className="text-lg font-bold" style={{ color: "#003160" }}>{conv.contacto_externo_id}</h2>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#9ca3af" }}>
              <span>{conv.plataforma}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                conv.estado === "auto_respondiendo" ? "bg-green-100 text-green-700" :
                conv.estado === "en_espera" ? "bg-yellow-100 text-yellow-700" :
                conv.estado === "en_curso" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {conv.estado.replace("_", " ")}
              </span>
              {conv.motivo_cierre && <span className="italic">Cerrado: {conv.motivo_cierre}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conv.estado !== "cerrada" && (
              <button
                onClick={() => setMostrarCerrar(true)}
                aria-label="Cerrar conversacion"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: "#fce4ec", color: "#c62828" }}
              >
                Cerrar
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setMostrarTransferir(!mostrarTransferir)}
                aria-label="Transferir conversacion"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: "#f0f0f0", color: "#464646" }}
              >
                Transferir
              </button>
              {mostrarTransferir && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg" style={{ borderColor: "#e5e5e5" }}>
                <p className="px-3 py-1.5 text-xs font-medium" style={{ color: "#9ca3af" }}>Transferir a:</p>
                {agentes.filter(a => a.id !== Number(authUserId)).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => transferir(a.id)}
                    disabled={transfiriendo}
                    className="block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-50"
                    style={{ color: "#464646" }}
                  >
                    {a.nombre}
                  </button>
                ))}
                {agentes.length <= 1 && (
                  <p className="px-3 py-1.5 text-xs" style={{ color: "#9ca3af" }}>No hay otros agentes</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      {/* End header */}

      {/* Dialogo de cierre */}
      {mostrarCerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold" style={{ color: "#003160" }}>Cerrar conversacion</h3>
            <p className="mb-4 text-sm" style={{ color: "#6b7280" }}>Indica el motivo del cierre:</p>
            <textarea
              value={motivoCierre}
              onChange={(e) => setMotivoCierre(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ borderColor: "#e5e5e5", color: "#464646" }}
              rows={3}
              placeholder="Cliente atentido, informacion proporcionada..."
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setMostrarCerrar(false)} className="flex-1 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: "#f0f0f0", color: "#464646" }}>
                Cancelar
              </button>
              <button onClick={cerrarConversacion} disabled={cerrando || !motivoCierre.trim()} className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: "#cf2e2e" }}>
                {cerrando ? "Cerrando..." : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {conv.mensajes.map((msg) => {
          const c =
            typeof msg.contenido === "string"
              ? JSON.parse(msg.contenido)
              : msg.contenido;

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "cliente" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "cliente"
                    ? "text-gray-800"
                    : msg.role === "bot"
                      ? "text-brand-blue-dark"
                      : "text-white"
                }`}
                style={
                  msg.role === "cliente"
                    ? { background: "#f0f0f0" }
                    : msg.role === "bot"
                      ? { background: "#e8f0fe" }
                      : { background: "#cf2e2e" }
                }
              >
                {msg.tipo === "imagen" && c.image_id ? (
                  <>
                    <img
                      src={`/leads/api/media/${c.image_id}`}
                      alt={c.image_caption ?? "Imagen"}
                      className="max-w-full rounded-lg"
                      loading="lazy"
                    />
                    {c.image_caption && (
                      <p className="mt-1 text-sm" style={{ color: msg.role === "agente" ? "#fff" : "#464646" }}>
                        {c.image_caption}
                      </p>
                    )}
                  </>
                ) : msg.tipo === "imagen" ? (
                  <p className="italic opacity-60">📷 Imagen</p>
                ) : msg.tipo === "video" && c.video_id ? (
                  <video
                    controls
                    className="max-w-full rounded-lg"
                    preload="metadata"
                  >
                    <source src={`/leads/api/media/${c.video_id}`} type={c.video_mime_type ?? "video/mp4"} />
                  </video>
                ) : msg.tipo === "audio" && c.audio_id ? (
                  <audio controls className="max-w-full">
                    <source src={`/leads/api/media/${c.audio_id}`} type={c.audio_mime_type ?? "audio/ogg"} />
                  </audio>
                ) : msg.tipo === "documento" && c.document_id ? (
                  <a
                    href={`/leads/api/media/${c.document_id}`}
                    target="_blank"
                    className="flex items-center gap-2 underline"
                    style={{ color: msg.role === "agente" ? "#fff" : "#0e5bb0" }}
                  >
                    📎 {c.document_filename ?? "Documento"}
                  </a>
                ) : (
                  <p style={{ color: msg.role === "agente" ? "#ffffff" : "#464646" }}>
                    {c.text ?? c.body ?? "(media)"}
                  </p>
                )}
                <p className="mt-1 text-right text-xs opacity-60" style={{ color: msg.role === "agente" ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>
                  {new Date(msg.recibido).toLocaleTimeString("es-GT")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={msgEnd} />
      </div>

      {errorMsg && (
        <div className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: "#cf2e2e" }}>
          {errorMsg}
        </div>
      )}
      <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: "#e5e5e5" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Escribir mensaje..."
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            disabled={enviando || subiendoImg}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={subiendoImg}
            aria-label="Adjuntar imagen o video"
            className="rounded-xl px-3 py-2.5 text-sm transition-opacity disabled:opacity-50"
            style={{ background: "#f0f0f0", color: "#464646" }}
          >
            📎
          </button>
          <button
            onClick={sendMessage}
            disabled={enviando || !texto.trim() || subiendoImg}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "#cf2e2e" }}
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setTexto(file.name);
              sendMedia();
            }
          }}
        />
        {subiendoImg && <p className="text-xs" style={{ color: "#6b7280" }}>Subiendo archivo...</p>}
      </div>
    </div>
  );
}
