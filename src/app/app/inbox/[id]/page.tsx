"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiGet, apiPost, apiPatch, apiUrl } from "@/lib/client-api";
import { formatGtTime } from "@/lib/format-date";

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
  cerrado_por?: number | null;
  cerrado_por_nombre?: string | null;
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
  const [clienteTagsArray, setClienteTagsArray] = useState<string[]>([]);
  const [nuevoTag, setNuevoTag] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [busquedaMensaje, setBusquedaMensaje] = useState("");
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string; mime?: string; caption?: string } | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [leadEtapa, setLeadEtapa] = useState<string>("nuevo");
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

  useEffect(() => {
    apiGet<Array<{ id: number; etapa: string | null }>>(`/leads?conversacion_id=${id}`)
      .then((leads: Array<{ id: number; etapa: string | null }>) => {
        if (leads.length > 0) {
          const lead = leads[0]!;
          setLeadId(lead.id);
          setLeadEtapa(lead.etapa ?? "nuevo");
        }
      })
      .catch(() => {});
  }, [id]);

  async function cambiarEtapa(valor: string) {
    if (!leadId) return;
    try {
      await apiPatch(`/leads/${leadId}`, { etapa: valor });
      setLeadEtapa(valor);
    } catch {}
  }

  function mostrarDetallesContacto() {
    if (!conv) return;
    setClienteNombre(conv.cliente_nombre ?? "");
    setClienteDpi(conv.cliente_dpi ?? "");
    try { setClienteTagsArray(JSON.parse(conv.etiquetas ?? "[]")); } catch { setClienteTagsArray([]); }
    setNuevoTag("");
    setMostrarDetalles(true);
  }

  function agregarTag() {
    const tag = nuevoTag.trim().toLowerCase();
    if (!tag || clienteTagsArray.includes(tag)) return;
    setClienteTagsArray([...clienteTagsArray, tag]);
    setNuevoTag("");
  }

  function eliminarTag(tag: string) {
    setClienteTagsArray(clienteTagsArray.filter(t => t !== tag));
  }

  async function guardarContacto() {
    if (!conv || guardandoContacto) return;
    setGuardandoContacto(true);
    try {
      await apiPatch("/contacts", {
        telefono: conv.contacto_externo_id,
        nombre: clienteNombre || null,
        dpi: clienteDpi || null,
        etiquetas: clienteTagsArray.length ? JSON.stringify(clienteTagsArray) : null,
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
    const msgTexto = texto;
    setErrorMsg("");
    setEnviando(true);
    setTexto("");
    try {
      const res = await fetch(apiUrl(`/conversations/${id}/send`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: msgTexto }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mensajes) setConv(data as Conversacion);
      } else {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setErrorMsg(err.error || `Error ${res.status}`);
        await fetchConv();
      }
    } catch (e) {
      setErrorMsg("Error de red al enviar");
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
      const res = await fetch(apiUrl(`/conversations/${id}/send`), {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        if (fileInput.current) fileInput.current.value = "";
        setTexto("");
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
              {conv.motivo_cierre && <span className="italic">Cerrado por {conv.cerrado_por_nombre ?? "desconocido"}: {conv.motivo_cierre}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {leadId && (
              <select
                value={leadEtapa}
                onChange={(e) => cambiarEtapa(e.target.value)}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize focus:outline-none"
                aria-label="Cambiar etapa"
                style={{
                  background: leadEtapa === "nuevo" ? "#e3f2fd" : leadEtapa === "contactado" ? "#fff3e0" : leadEtapa === "calificado" ? "#f3e5f5" : leadEtapa === "convertido" ? "#e8f5e9" : leadEtapa === "seguimiento" ? "#fce4ec" : "#eeeeee",
                  color: leadEtapa === "nuevo" ? "#1565c0" : leadEtapa === "contactado" ? "#e65100" : leadEtapa === "calificado" ? "#7b1fa2" : leadEtapa === "convertido" ? "#2e7d32" : leadEtapa === "seguimiento" ? "#c62828" : "#616161",
                  border: "none",
                }}
              >
                <option value="nuevo">Nuevo</option>
                <option value="contactado">Contactado</option>
                <option value="calificado">Calificado</option>
                <option value="convertido">Convertido</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="perdido">Perdido</option>
              </select>
            )}
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
              <div className="mb-2 flex flex-wrap gap-1.5">
                {clienteTagsArray.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: "#e8f0fe", color: "#0e5bb0" }}>
                    {tag}
                    <button onClick={() => eliminarTag(tag)} className="ml-0.5 hover:opacity-70">✕</button>
                  </span>
                ))}
                {clienteTagsArray.length === 0 && (
                  <span className="text-xs" style={{ color: "#9ca3af" }}>Sin etiquetas</span>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={nuevoTag} onChange={(e) => setNuevoTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarTag())}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ borderColor: "#e5e5e5", color: "#464646" }} placeholder="Nueva etiqueta..." />
                <button onClick={agregarTag} disabled={!nuevoTag.trim()}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: "#0e5bb0" }}>
                  + Agregar
                </button>
              </div>
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

      {/* Modal de previsualizacion multimedia */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={() => setPreviewMedia(null)}>
          <div className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-10 right-0 flex gap-2">
              <a
                href={previewMedia.url}
                download
                className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                ⬇ Descargar
              </a>
              <button
                onClick={() => setPreviewMedia(null)}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                ✕ Cerrar
              </button>
            </div>
            {previewMedia.type === "image" ? (
              <img src={previewMedia.url} alt={previewMedia.caption ?? "Imagen"} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            ) : previewMedia.type === "video" ? (
              <video controls autoPlay className="max-h-[85vh] max-w-full rounded-lg">
                <source src={previewMedia.url} type={previewMedia.mime ?? "video/mp4"} />
              </video>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8">
                <audio controls autoPlay className="w-80">
                  <source src={previewMedia.url} type={previewMedia.mime ?? "audio/ogg"} />
                </audio>
                <a href={previewMedia.url} download className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: "#0e5bb0" }}>
                  ⬇ Descargar audio
                </a>
              </div>
            )}
            {previewMedia.caption && (
              <p className="mt-2 max-w-lg text-center text-sm text-white/80">{previewMedia.caption}</p>
            )}
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

          if (msg.tipo === "system_cierre") {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="flex max-w-[85%] items-center gap-2 rounded-lg px-4 py-2 text-xs"
                  style={{ background: "#fef3e2", color: "#92400e" }}>
                  <span>🔒</span>
                  <span className="font-medium">{c.text}</span>
                  {c.motivo_cierre && <span className="opacity-75">— {c.motivo_cierre}</span>}
                  <span className="ml-1 opacity-60">{formatGtTime(msg.recibido)}</span>
                </div>
              </div>
            );
          }

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
                      className="max-w-60 w-auto h-auto max-h-72 rounded-lg object-cover cursor-pointer transition-opacity hover:opacity-90"
                      loading="lazy"
                      onClick={() => setPreviewMedia({ url: `/leads/api/media/${c.image_id}`, type: "image", mime: c.image_mime_type, caption: c.image_caption })}
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
                    className="max-w-72 w-auto h-auto max-h-72 rounded-lg cursor-pointer"
                    preload="metadata"
                    onClick={() => setPreviewMedia({ url: `/leads/api/media/${c.video_id}`, type: "video", mime: c.video_mime_type })}
                  >
                    <source src={`/leads/api/media/${c.video_id}`} type={c.video_mime_type ?? "video/mp4"} />
                  </video>
                ) : msg.tipo === "audio" && c.audio_id ? (
                  <audio
                    controls
                    className="max-w-full cursor-pointer"
                    onClick={() => setPreviewMedia({ url: `/leads/api/media/${c.audio_id}`, type: "audio", mime: c.audio_mime_type })}
                  >
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
                  {formatGtTime(msg.recibido)}
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
            if (file) sendMedia();
          }}
        />
        {subiendoImg && <p className="text-xs" style={{ color: "#6b7280" }}>Subiendo archivo...</p>}
      </div>
    </div>
  );
}
