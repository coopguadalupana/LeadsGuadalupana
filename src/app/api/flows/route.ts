import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canViewAllConversations, canManageFlows } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function GET() {
  try {
    const auth = await getAuthSession();
    if (!auth.user) return auth.response;

    let sql: string;
    const params: Record<string, unknown> = {};

    if (await canViewAllConversations(auth.user.rol_id)) {
      sql = `SELECT f.id, f.agencia_id, f.nombre, f.activo, f.[trigger], f.pasos, f.version, f.creado, f.actualizado,
                    a.nombre AS agencia_nombre
             FROM lg_flows f
             JOIN lg_agencias a ON a.id = f.agencia_id
             ORDER BY a.nombre, f.nombre`;
    } else {
      sql = `SELECT f.id, f.agencia_id, f.nombre, f.activo, f.[trigger], f.pasos, f.version, f.creado, f.actualizado,
                    a.nombre AS agencia_nombre
             FROM lg_flows f
             JOIN lg_agencias a ON a.id = f.agencia_id
             WHERE f.agencia_id = @agenciaId
             ORDER BY f.nombre`;
      params.agenciaId = auth.user.agencia_id;
    }

    const rows = await query<Record<string, unknown>>(sql, params);
    const flows = rows.map((r) => ({
      ...r,
      trigger: typeof r.trigger === "string" ? JSON.parse(r.trigger) : r.trigger,
      pasos: typeof r.pasos === "string" ? JSON.parse(r.pasos) : r.pasos,
    }));
    return NextResponse.json(flows);
  } catch (e) {
    console.error("GET flows error:", e);
    return NextResponse.json({ error: "Error al obtener flujos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthSession();
    if (!auth.user) return auth.response;
    if (!await canManageFlows(auth.user.rol_id)) {
      return NextResponse.json({ error: "No tienes permiso para crear flujos" }, { status: 403 });
    }

    const body = await req.json();

    const result = await execute(
      `INSERT INTO lg_flows (agencia_id, nombre, activo, [trigger], pasos)
       OUTPUT INSERTED.id
       VALUES (@agenciaId, @nombre, @activo, @trigger, @pasos)`,
      {
        agenciaId: auth.user.agencia_id,
        nombre: body.nombre,
        activo: body.activo ?? false,
        trigger: JSON.stringify(body.trigger ?? {}),
        pasos: JSON.stringify(body.pasos ?? []),
      }
    );

    const inserted = result.recordset as Array<{ id: number }>;
    return NextResponse.json({ id: inserted[0]!.id }, { status: 201 });
  } catch (e) {
    console.error("POST flows error:", e);
    return NextResponse.json({ error: "Error al crear flujo" }, { status: 500 });
  }
}
