"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  const msgEnd = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  const fetchConv = useCallback(async () => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConv(data);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConv();
    const interval = setInterval(fetchConv, 5000);
    return () => clearInterval(interval);
  }, [fetchConv]);

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
      await fetch(`/api/conversations/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      setTexto("");
      await fetchConv();
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <p className="p-6">Cargando...</p>;
  if (!conv) return <p className="p-6">Conversacion no encontrada</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b pb-4">
        <button
          onClick={() => router.push("/app/inbox")}
          className="mb-2 text-sm text-blue-600"
        >
          &larr; Volver
        </button>
        <h2 className="text-lg font-bold">{conv.contacto_externo_id}</h2>
        <p className="text-xs text-gray-500">
          {conv.plataforma} &middot; {conv.estado.replace("_", " ")}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {conv.mensajes.map((msg) => {
          const contenido =
            typeof msg.contenido === "string"
              ? JSON.parse(msg.contenido)
              : msg.contenido;

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "cliente" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === "cliente"
                    ? "bg-gray-100 text-gray-800"
                    : msg.role === "bot"
                      ? "bg-blue-50 text-blue-800"
                      : "bg-blue-600 text-white"
                }`}
              >
                {msg.tipo === "imagen" && contenido.image_caption ? (
                  <>
                    <p className="mb-1 text-xs opacity-60">📷 Imagen</p>
                    <p>{contenido.image_caption}</p>
                  </>
                ) : (
                  <p>{contenido.text ?? contenido.body ?? "(media)"}</p>
                )}
                <p className="mt-1 text-xs opacity-70">
                  {new Date(msg.recibido).toLocaleTimeString("es-GT")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={msgEnd} />
      </div>

      <div className="flex gap-2 border-t pt-4">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Escribir mensaje..."
          className="flex-1 rounded-lg border px-4 py-2 text-sm"
          disabled={enviando}
        />
        <button
          onClick={sendMessage}
          disabled={enviando || !texto.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
