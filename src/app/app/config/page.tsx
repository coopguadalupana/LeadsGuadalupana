"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/client-api";

interface Calificacion {
  id: number;
  nombre: string;
  color_fondo: string;
  color_texto: string;
  orden: number;
  activo: boolean;
}

export default function ConfigPage() {
  const [config, setConfig] = useState("");
  const [saving, setSaving] = useState(false);

  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [editCal, setEditCal] = useState<Calificacion | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoFondo, setNuevoFondo] = useState("#f5f5f5");
  const [nuevoTexto, setNuevoTexto] = useState("#464646");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    apiGet<{ config: Record<string, unknown> }>("/agency/config")
      .then((data) => setConfig(JSON.stringify(data.config ?? {}, null, 2)))
      .catch(() => {});
    apiGet<Calificacion[]>("/leads/calificaciones")
      .then(setCalificaciones)
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiPatch("/agency/config", JSON.parse(config));
    } catch {
      alert("Error al guardar");
    }
    setSaving(false);
  }

  async function crearCalificacion() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    try {
      await apiPost("/leads/calificaciones", {
        nombre: nuevoNombre.trim().toLowerCase().replace(/\s+/g, "_"),
        color_fondo: nuevoFondo,
        color_texto: nuevoTexto,
      });
      setNuevoNombre("");
      setNuevoFondo("#f5f5f5");
      setNuevoTexto("#464646");
      const updated = await apiGet<Calificacion[]>("/leads/calificaciones");
      setCalificaciones(updated);
    } catch {
      alert("Error al crear etiqueta");
    }
    setCreando(false);
  }

  async function actualizarCalificacion(cal: Calificacion) {
    try {
      await apiPatch(`/leads/calificaciones/${cal.id}`, {
        nombre: cal.nombre,
        color_fondo: cal.color_fondo,
        color_texto: cal.color_texto,
        orden: cal.orden,
      });
      setEditCal(null);
      const updated = await apiGet<Calificacion[]>("/leads/calificaciones");
      setCalificaciones(updated);
    } catch {
      alert("Error al actualizar etiqueta");
    }
  }

  async function eliminarCalificacion(id: number) {
    if (!confirm("Eliminar esta etiqueta? Los leads con esta etiqueta quedaran sin calificacion.")) return;
    try {
      await apiDelete(`/leads/calificaciones/${id}`);
      const updated = await apiGet<Calificacion[]>("/leads/calificaciones");
      setCalificaciones(updated);
    } catch {
      alert("Error al eliminar etiqueta");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: "#003160" }}>Configuracion</h1>
        <div className="rounded-lg border bg-white p-4" style={{ borderColor: "#e5e5e5" }}>
          <label className="mb-2 block text-sm font-medium" style={{ color: "#464646" }}>Configuracion (JSON)</label>
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            rows={15}
            className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5" }}
          />
          <button
            onClick={save}
            disabled={saving}
            className="mt-4 rounded-lg px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#0e5bb0" }}
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold" style={{ color: "#003160" }}>Etiquetas / Calificaciones</h2>
        <p className="mb-4 text-sm" style={{ color: "#6b7280" }}>
          Administra las etiquetas para clasificar leads (ej. cliente_potencial, registrado, perdido). Se muestran como calificacion en la tabla de leads y en el chat.
        </p>

        <div className="mb-6 rounded-lg border bg-white p-4" style={{ borderColor: "#e5e5e5" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "#464646" }}>Crear nueva etiqueta</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Nombre (ID interno, se usara en snake_case)</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="ej. cliente_potencial"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: "#e5e5e5", color: "#464646" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Fondo</label>
              <input
                type="color"
                value={nuevoFondo}
                onChange={(e) => setNuevoFondo(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border"
                style={{ borderColor: "#e5e5e5" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Texto</label>
              <input
                type="color"
                value={nuevoTexto}
                onChange={(e) => setNuevoTexto(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border"
                style={{ borderColor: "#e5e5e5" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#6b7280" }}>Vista previa</label>
              <span
                className="inline-block rounded-lg px-3 py-2 text-xs font-medium"
                style={{ background: nuevoFondo, color: nuevoTexto }}
              >
                {nuevoNombre || "preview"}
              </span>
            </div>
            <button
              onClick={crearCalificacion}
              disabled={creando || !nuevoNombre.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#27a536" }}
            >
              {creando ? "Creando..." : "+ Crear"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "#e5e5e5" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#003160" }}>
                <th className="px-4 py-3 text-left font-medium text-white">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-white">Vista previa</th>
                <th className="px-4 py-3 text-left font-medium text-white">Orden</th>
                <th className="px-4 py-3 text-left font-medium text-white">Activo</th>
                <th className="px-4 py-3 text-left font-medium text-white">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {calificaciones.map((cal) => (
                <tr key={cal.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: "#f0f0f0" }}>
                  {editCal?.id === cal.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editCal.nombre}
                          onChange={(e) => setEditCal({ ...editCal, nombre: e.target.value })}
                          className="w-full rounded border px-2 py-1 text-xs"
                          style={{ borderColor: "#e5e5e5" }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editCal.color_fondo}
                            onChange={(e) => setEditCal({ ...editCal, color_fondo: e.target.value })}
                            className="h-8 w-12 cursor-pointer rounded border"
                            style={{ borderColor: "#e5e5e5" }}
                          />
                          <input
                            type="color"
                            value={editCal.color_texto}
                            onChange={(e) => setEditCal({ ...editCal, color_texto: e.target.value })}
                            className="h-8 w-12 cursor-pointer rounded border"
                            style={{ borderColor: "#e5e5e5" }}
                          />
                          <span
                            className="rounded px-2 py-1 text-xs font-medium"
                            style={{ background: editCal.color_fondo, color: editCal.color_texto }}
                          >
                            {editCal.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editCal.orden}
                          onChange={(e) => setEditCal({ ...editCal, orden: Number(e.target.value) })}
                          className="w-16 rounded border px-2 py-1 text-xs"
                          style={{ borderColor: "#e5e5e5" }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={editCal.activo}
                          onChange={(e) => setEditCal({ ...editCal, activo: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => actualizarCalificacion(editCal)}
                            className="rounded px-3 py-1 text-xs font-medium text-white"
                            style={{ background: "#0e5bb0" }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditCal(null)}
                            className="rounded px-3 py-1 text-xs font-medium"
                            style={{ background: "#f0f0f0", color: "#464646" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium" style={{ color: "#464646" }}>{cal.nombre}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-lg px-3 py-1 text-xs font-medium"
                          style={{ background: cal.color_fondo, color: cal.color_texto }}
                        >
                          {cal.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "#6b7280" }}>{cal.orden}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: cal.activo ? "#e8f5e9" : "#fce4ec",
                            color: cal.activo ? "#2e7d32" : "#c62828",
                          }}
                        >
                          {cal.activo ? "Si" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditCal({ ...cal })}
                            className="rounded px-3 py-1 text-xs font-medium"
                            style={{ background: "#e8f0fe", color: "#0e5bb0" }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarCalificacion(cal.id)}
                            className="rounded px-3 py-1 text-xs font-medium text-white"
                            style={{ background: "#cf2e2e" }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {calificaciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "#9ca3af" }}>
                    No hay etiquetas. Crea una nueva arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
