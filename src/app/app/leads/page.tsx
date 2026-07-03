import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { query } from "@/lib/db";
import Link from "next/link";

interface Lead {
  id: number;
  conversacion_id: number;
  nombre: string | null;
  telefono: string | null;
  calificacion: string | null;
  asignado_nombre: string | null;
  notas: string | null;
  creado: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ calificacion?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as unknown as { agencia_id: number } | undefined;
  const sp = await searchParams;

  const params: Record<string, unknown> = { agenciaId: user?.agencia_id ?? 0 };
  let sql = `SELECT l.*, u.nombre AS asignado_nombre
             FROM lg_leads l
             LEFT JOIN lg_usuarios u ON u.id = l.asignado_a
             WHERE l.agencia_id = @agenciaId`;

  if (sp.calificacion) {
    sql += ` AND l.calificacion = @calificacion`;
    params.calificacion = sp.calificacion;
  }

  sql += ` ORDER BY l.creado DESC`;
  const leads = await query<Lead>(sql, params);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <form>
          <select name="calificacion" defaultValue={sp.calificacion ?? ""} className="rounded border px-3 py-1 text-sm">
            <option value="">Todas</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Telefono</th>
              <th className="px-4 py-3 text-left font-medium">Calificacion</th>
              <th className="px-4 py-3 text-left font-medium">Asignado</th>
              <th className="px-4 py-3 text-left font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/app/inbox/${l.conversacion_id}`} className="text-blue-600 hover:underline">
                    {l.nombre ?? "(sin nombre)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{l.telefono}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.calificacion === "hot" ? "bg-red-100 text-red-700" :
                    l.calificacion === "warm" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {l.calificacion ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{l.asignado_nombre ?? "-"}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(l.creado).toLocaleDateString("es-GT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && <p className="py-8 text-center text-gray-400">No hay leads</p>}
      </div>
    </div>
  );
}
