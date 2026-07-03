"use client";

import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [config, setConfig] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/agency/config")
      .then((r) => r.json())
      .then((data) => setConfig(JSON.stringify(data.config ?? {}, null, 2)));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/agency/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: config,
      });
    } catch {
      alert("Error al guardar");
    }
    setSaving(false);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Configuracion</h1>
      <div className="rounded-lg border bg-white p-4">
        <label className="mb-2 block text-sm font-medium">Configuracion (JSON)</label>
        <textarea value={config} onChange={(e) => setConfig(e.target.value)} rows={20} className="w-full rounded border px-3 py-2 font-mono text-xs" />
        <button onClick={save} disabled={saving} className="mt-4 rounded bg-blue-600 px-6 py-2 text-sm text-white disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar configuracion"}
        </button>
      </div>
    </div>
  );
}
