import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(req.url);
  const calificacion = searchParams.get("calificacion");
  const asignado = searchParams.get("asignado");

  let sql = `SELECT l.*, u.nombre AS asignado_nombre, c.plataforma
             FROM lg_leads l
             LEFT JOIN lg_usuarios u ON u.id = l.asignado_a
             LEFT JOIN lg_conversaciones c ON c.id = l.conversacion_id
             WHERE l.agencia_id = @agenciaId`;
  const params: Record<string, unknown> = { agenciaId: auth.user.agencia_id };

  if (calificacion) {
    sql += ` AND l.calificacion = @calificacion`;
    params.calificacion = calificacion;
  }
  if (asignado === "me") {
    sql += ` AND l.asignado_a = @userId`;
    params.userId = Number(auth.user.id);
  }

  sql += ` ORDER BY l.creado DESC`;

  const leads = await query(sql, params);
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const body = await req.json();

  const result = await execute(
    `INSERT INTO lg_leads (conversacion_id, agencia_id, nombre, telefono, email)
     OUTPUT INSERTED.id
     VALUES (@convId, @agenciaId, @nombre, @telefono, @email)`,
    {
      convId: body.conversacion_id,
      agenciaId: auth.user.agencia_id,
      nombre: body.nombre ?? null,
      telefono: body.telefono ?? null,
      email: body.email ?? null,
    }
  );

  const inserted = result.recordset as Array<{ id: number }>;
  return NextResponse.json({ id: inserted[0]!.id }, { status: 201 });
}
