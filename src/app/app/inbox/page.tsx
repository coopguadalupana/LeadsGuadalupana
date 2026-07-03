import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { query } from "@/lib/db";

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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as unknown as { agencia_id: number } | undefined;
  const agenciaId = user?.agencia_id ?? 0;

  const sp = await searchParams;
  const estado = sp.estado ?? "auto_respondiendo";
  const q = sp.q ?? "";

  let sql = `SELECT c.id, c.plataforma, c.contacto_externo_id, c.estado,
                    c.ad_id, c.creado, c.actualizado,
                    u.nombre AS asignado_nombre, '' AS ultimo_mensaje, 0 AS msgs_no_leidos
             FROM lg_conversaciones c
             LEFT JOIN lg_usuarios u ON u.id = c.asignado_a
             WHERE c.agencia_id = @agenciaId`;
  const params: Record<string, unknown> = { agenciaId };

  if (estado !== "todas") {
    sql += ` AND c.estado = @estado`;
    params.estado = estado;
  }
  if (q) {
    sql += ` AND c.contacto_externo_id LIKE @q`;
    params.q = `%${q}%`;
  }

  sql += ` ORDER BY c.actualizado DESC`;

  const conversaciones = await query<Conversacion>(sql, params);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <form className="flex gap-2">
          <select
            name="estado"
            defaultValue={estado}
            className="rounded border px-3 py-1 text-sm"
          >
            <option value="auto_respondiendo">Auto-respuesta</option>
            <option value="en_espera">En espera</option>
            <option value="en_curso">En curso</option>
            <option value="cerrada">Cerradas</option>
            <option value="todas">Todas</option>
          </select>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por numero..."
            className="rounded border px-3 py-1 text-sm"
          />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
            Filtrar
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {conversaciones.map((c) => (
          <Link
            key={c.id}
            href={`/app/inbox/${c.id}`}
            className="flex items-center justify-between rounded-lg border bg-white p-4 hover:shadow-sm"
          >
            <div>
              <p className="font-medium">{c.contacto_externo_id}</p>
              <p className="text-xs text-gray-500">
                {c.plataforma} · {c.estado.replace("_", " ")}
                {c.asignado_nombre && ` · ${c.asignado_nombre}`}
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              {new Date(c.actualizado).toLocaleDateString("es-GT")}
            </div>
          </Link>
        ))}

        {conversaciones.length === 0 && (
          <p className="py-8 text-center text-gray-400">
            No hay conversaciones
          </p>
        )}
      </div>
    </div>
  );
}
