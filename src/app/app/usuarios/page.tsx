"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/client-api";

interface Usuario {
  id: number;
  ldap_sam: string;
  nombre: string;
  email: string | null;
  rol: string;
  agencia_id: number;
  agencia_nombre: string;
  activo: boolean;
  ultimo_sync: string | null;
}

const ROLES = ["agent", "supervisor", "admin", "flow_admin", "superadmin"];
const ROL_COLORS: Record<string, string> = {
  agent: "#e3f2fd",
  supervisor: "#fff3e0",
  flow_admin: "#e8f5e9",
  admin: "#fce4ec",
  superadmin: "#f3e5f5",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  useEffect(() => {
    apiGet<Usuario[]>("/agency/users").then(setUsuarios).catch(() => {});
  }, []);

  async function toggleActivo(u: Usuario) {
    await apiPatch("/agency/users", { id: u.id, activo: !u.activo });
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, activo: !x.activo } : x)));
  }

  async function cambiarRol(u: Usuario, rol: string) {
    await apiPatch("/agency/users", { id: u.id, rol });
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, rol } : x)));
  }

  async function sincronizar() {
    setSincronizando(true);
    setSyncResult("");
    try {
      const res = await fetch("/leads/api/agency/sync-ldap", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSyncResult(`✓ ${data.creados} creados, ${data.actualizados} actualizados, ${data.total} en LDAP`);
        const users = await apiGet<Usuario[]>("/agency/users");
        setUsuarios(users);
      } else {
        const err = await res.json().catch(() => ({}));
        setSyncResult(`Error: ${err.error || res.status}`);
      }
    } catch {
      setSyncResult("Error de conexion");
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>Usuarios</h1>
        <button
          onClick={sincronizar}
          disabled={sincronizando}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "#0e5bb0" }}
        >
          {sincronizando ? "Sincronizando..." : "Sincronizar desde LDAP"}
        </button>
      </div>

      {syncResult && (
        <div className="mb-4 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: syncResult.startsWith("✓") ? "#e8f5e9" : "#fce4ec", color: syncResult.startsWith("✓") ? "#27a536" : "#c62828" }}>
          {syncResult}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "#e5e5e5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#003160" }}>
              <th className="px-4 py-3 text-left font-medium text-white">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-white">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-white">Agencia</th>
              <th className="px-4 py-3 text-left font-medium text-white">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-white">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-white">Ultimo Sync</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: "#f0f0f0", opacity: u.activo ? 1 : 0.5 }}>
                <td className="px-4 py-3 font-medium" style={{ color: "#464646" }}>{u.nombre}</td>
                <td className="px-4 py-3" style={{ color: "#6b7280" }}>{u.ldap_sam}</td>
                <td className="px-4 py-3" style={{ color: "#6b7280" }}>{u.agencia_nombre}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.rol}
                    onChange={(e) => cambiarRol(u, e.target.value)}
                    className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
                    style={{ background: ROL_COLORS[u.rol] ?? "#f5f5f5", color: "#464646", border: "none" }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(u)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#9ca3af" }}>
                  {u.ultimo_sync ? new Date(u.ultimo_sync).toLocaleString("es-GT", { timeZone: "America/Guatemala" }) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
