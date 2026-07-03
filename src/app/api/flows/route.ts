import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const flows = await query(
    `SELECT id, nombre, activo, trigger, pasos, version, creado, actualizado
     FROM lg_flows
     WHERE agencia_id = @agenciaId
     ORDER BY nombre ASC`,
    { agenciaId: auth.user.agencia_id }
  );

  return NextResponse.json(flows);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const body = await req.json();

  const result = await execute(
    `INSERT INTO lg_flows (agencia_id, nombre, activo, trigger, pasos)
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
}
