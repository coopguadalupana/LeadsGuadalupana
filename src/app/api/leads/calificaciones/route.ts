import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const calificaciones = await query(
    "SELECT id, nombre, color_fondo, color_texto, orden, activo FROM lg_calificaciones ORDER BY orden"
  );
  return NextResponse.json(calificaciones);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const body = await req.json();
  if (!body.nombre) {
    return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
  }

  const maxOrden = await query(
    "SELECT MAX(orden) AS max FROM lg_calificaciones"
  ) as Array<{ max: number | null }>;

  const result = await execute(
    `INSERT INTO lg_calificaciones (nombre, color_fondo, color_texto, orden, activo)
     OUTPUT INSERTED.id
     VALUES (@nombre, @colorFondo, @colorTexto, @orden, 1)`,
    {
      nombre: body.nombre,
      colorFondo: body.color_fondo ?? "#f5f5f5",
      colorTexto: body.color_texto ?? "#464646",
      orden: body.orden ?? (maxOrden[0]?.max ?? -1) + 1,
    }
  );

  const inserted = result.recordset as Array<{ id: number }>;
  return NextResponse.json({ id: inserted[0]?.id }, { status: 201 });
}
