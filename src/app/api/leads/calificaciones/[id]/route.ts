import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { execute } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updates: string[] = [];
  const p: Record<string, unknown> = { id: Number(id) };

  if (body.nombre !== undefined) { updates.push("nombre = @nombre"); p.nombre = body.nombre; }
  if (body.color_fondo !== undefined) { updates.push("color_fondo = @colorFondo"); p.colorFondo = body.color_fondo; }
  if (body.color_texto !== undefined) { updates.push("color_texto = @colorTexto"); p.colorTexto = body.color_texto; }
  if (body.orden !== undefined) { updates.push("orden = @orden"); p.orden = body.orden; }
  if (body.activo !== undefined) { updates.push("activo = @activo"); p.activo = body.activo ? 1 : 0; }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  await execute(
    `UPDATE lg_calificaciones SET ${updates.join(", ")} WHERE id = @id`,
    p
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;

  await execute("DELETE FROM lg_calificaciones WHERE id = @id", { id: Number(id) });

  return NextResponse.json({ success: true });
}
