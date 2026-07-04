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
  cliente_nombre?: string | null;
  cliente_dpi?: string | null;
  etiquetas?: string | null;
  contacto_id?: number | null;
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
  const [agentes, setAgentes] = useState<Array<{ id: number; nombre: string; rol: string; agencia_nombre?: string; agencia_id: number }>>([]);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [busquedaAgente, setBusquedaAgente] = useState("");
  const [filtroAgencia, setFiltroAgencia] = useState("");
  const [mostrarCerrar, setMostrarCerrar] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDpi, setClienteDpi] = useState("");
  const [clienteTags, setClienteTags] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [busquedaMensaje, setBusquedaMensaje] = useState("");
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
    apiGet<Array<{ id: number; nombre: string; rol: string; agencia_nombre?: string; agencia_id: number }>>("/agency/agents").then(setAgentes).catch(() => {});
  }, []);

  function mostrarDetallesContacto() {
    if (!conv) return;
    setClienteNombre(conv.cliente_nombre ?? "");
    setClienteDpi(conv.cliente_dpi ?? "");
    setClienteTags(conv.etiquetas ?? "");
    setMostrarDetalles(true);
  }

  async function guardarContacto() {
    if (!conv || guardandoContacto) return;
    setGuardandoContacto(true);
    try {
      const tags = clienteTags.split(",").map(t => t.trim()).filter(Boolean);
      await apiPatch("/contacts", {
        telefono: conv.contacto_externo_id,
        nombre: clienteNombre || null,
        dpi: clienteDpi || null,
        etiquetas: tags.length ? JSON.stringify(tags) : null,
      });
      setMostrarDetalles(false);
      await fetchConv();
    } catch {
      setErrorMsg("Error al guardar contacto");
    } finally {
      setGuardandoContacto(false);
    }
  }

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
            <button
              onClick={mostrarDetallesContacto}
              aria-label="Detalles del contacto"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: "#e8f0fe", color: "#0e5bb0" }}
            >
              Detalles
            </button>
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
            <button
              onClick={() => setMostrarTransferir(true)}
              aria-label="Transferir conversacion"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: "#f0f0f0", color: "#464646" }}
            >
              Transferir
            </button>
        </div>
      </div>
      </div>
      {/* End header */}

      {/* Modal de transferencia */}
      {mostrarTransferir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "#003160" }}>Transferir conversacion</h3>
              <button onClick={() => { setMostrarTransferir(false); setBusquedaAgente(""); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={busquedaAgente}
                onChange={(e) => setBusquedaAgente(e.target.value)}
                placeholder="Buscar por nombre..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}
                autoFocus
              />
              {agentes.some(a => a.agencia_nombre) && (
                <select
                  value={filtroAgencia}
                  onChange={(e) => setFiltroAgencia(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ borderColor: "#e5e5e5", color: "#464646" }}
                >
                  <option value="">Todas</option>
                  {Array.from(new Set(agentes.filter(a => a.agencia_nombre).map(a => a.agencia_nombre!))).map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {agentes
                .filter(a => a.id !== Number(authUserId))
                .filter(a => !busquedaAgente || a.nombre.toLowerCase().includes(busquedaAgente.toLowerCase()))
                .filter(a => !filtroAgencia || a.agencia_nombre === filtroAgencia)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => transferir(a.id)}
                    disabled={transfiriendo}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ color: "#464646" }}
                  >
                    <span className="font-medium">{a.nombre}</span>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>
                      {a.rol.replace("_", " ")}
                      {a.agencia_nombre && ` · ${a.agencia_nombre}`}
                    </span>
                  </button>
                ))}
              {agentes.filter(a => a.id !== Number(authUserId))
                .filter(a => !busquedaAgente || a.nombre.toLowerCase().includes(busquedaAgente.toLowerCase()))
                .filter(a => !filtroAgencia || a.agencia_nombre === filtroAgencia).length === 0 && (
                <p className="py-4 text-center text-sm" style={{ color: "#9ca3af" }}>No se encontraron agentes</p>
              )}
            </div>

            <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: "#e5e5e5", color: "#9ca3af" }}>
              Mostrando {agentes.filter(a => a.id !== Number(authUserId))
                .filter(a => !busquedaAgente || a.nombre.toLowerCase().includes(busquedaAgente.toLowerCase()))
                .filter(a => !filtroAgencia || a.agencia_nombre === filtroAgencia).length} de {agentes.length - 1} agentes disponibles
            </div>
          </div>
        </div>
      )}

      {/* Barra de busqueda de mensajes */}
      <div className="border-b pb-2" style={{ borderColor: "#e5e5e5" }}>
        <input
          type="text"
          value={busquedaMensaje}
          onChange={(e) => setBusquedaMensaje(e.target.value)}
          placeholder="Buscar en mensajes..."
          className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
          style={{ borderColor: "#e5e5e5", color: "#464646" }}
        />
      </div>

      {/* Modal de detalles del contacto */}
      {mostrarDetalles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "#003160" }}>Detalles del contacto</h3>
              <button onClick={() => setMostrarDetalles(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Telefono</label>
              <p className="text-sm font-medium" style={{ color: "#464646" }}>{conv?.contacto_externo_id}</p>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Nombre del cliente</label>
              <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="Nombre completo" />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>DPI</label>
              <input type="text" value={clienteDpi} onChange={(e) => setClienteDpi(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="0000 00000 0000" />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Etiquetas</label>
              <input type="text" value={clienteTags} onChange={(e) => setClienteTags(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="vip, credito, seguimiento" />
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Separadas por coma</p>
            </div>

            <button onClick={guardarContacto} disabled={guardandoContacto}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#0e5bb0" }}>
              {guardandoContacto ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

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
        {conv.mensajes.filter((msg) => {
          if (!busquedaMensaje) return true;
          try {
            const c = typeof msg.contenido === "string" ? JSON.parse(msg.contenido) : msg.contenido;
            const texto = c.text ?? c.image_caption ?? c.body ?? "";
            return texto.toLowerCase().includes(busquedaMensaje.toLowerCase());
          } catch { return false; }
        }).map((msg) => {
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
                  {new Date(msg.recibido).toLocaleTimeString("es-GT", { timeZone: "America/Guatemala" })}
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
