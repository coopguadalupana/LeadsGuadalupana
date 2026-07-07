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
  const paramsObj: Record<string, unknown> = { id: Number(id), agenciaId: auth.user.agencia_id };

  if (body.nombre !== undefined) { updates.push("nombre = @nombre"); paramsObj.nombre = body.nombre; }
  if (body.calificacion !== undefined) { updates.push("calificacion = @calificacion"); paramsObj.calificacion = body.calificacion; }
  if (body.notas !== undefined) { updates.push("notas = @notas"); paramsObj.notas = body.notas; }
  if (body.asignado_a !== undefined) { updates.push("asignado_a = @asignadoA"); paramsObj.asignadoA = body.asignado_a; }
  if (body.etapa !== undefined) { updates.push("etapa = @etapa"); paramsObj.etapa = body.etapa; }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  updates.push("actualizado = GETUTCDATE()");

  await execute(
    `UPDATE lg_leads SET ${updates.join(", ")}
     WHERE id = @id AND agencia_id = @agenciaId`,
    paramsObj
  );

  return NextResponse.json({ success: true });
}
