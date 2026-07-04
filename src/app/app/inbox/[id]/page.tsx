"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client-api";

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
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
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
    if (conv && conv.mensajes.length > prevLen.current) {
      msgEnd.current?.scrollIntoView({ behavior: "smooth" });
      prevLen.current = conv.mensajes.length;
    }
  }, [conv?.mensajes]);

  async function sendMessage() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await apiPost(`/conversations/${id}/send`, { texto });
      setTexto("");
      await fetchConv();
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
      const res = await fetch(`/leads/api/conversations/${id}/send`, {
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
        <button
          onClick={() => router.push("/app/inbox")}
          className="mb-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "#cf2e2e" }}
        >
          &larr; Volver
        </button>
        <h2 className="text-lg font-bold" style={{ color: "#003160" }}>{conv.contacto_externo_id}</h2>
        <p className="text-xs" style={{ color: "#9ca3af" }}>
          {conv.plataforma} &middot; {conv.estado.replace("_", " ")}
        </p>
      </div>

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
            className="rounded-xl px-3 py-2.5 text-sm transition-opacity disabled:opacity-50"
            style={{ background: "#f0f0f0", color: "#464646" }}
            title="Adjuntar imagen"
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
