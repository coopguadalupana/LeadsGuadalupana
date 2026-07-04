import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageFlows } from "@/lib/auth/permissions";
import { execute } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!canManageFlows(auth.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para editar flujos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  await execute(
    `UPDATE lg_flows SET
      nombre = @nombre,
      activo = @activo,
      [trigger] = @trigger,
      pasos = @pasos,
      version = version + 1,
      actualizado = SYSUTCDATETIME()
     WHERE id = @id AND agencia_id = @agenciaId`,
    {
      id: Number(id),
      agenciaId: auth.user.agencia_id,
      nombre: body.nombre,
      activo: body.activo ?? false,
      trigger: JSON.stringify(body.trigger ?? {}),
      pasos: JSON.stringify(body.pasos ?? []),
    }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!canManageFlows(auth.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar flujos" }, { status: 403 });
  }

  const { id } = await params;

  await execute(
    `DELETE FROM lg_flows WHERE id = @id AND agencia_id = @agenciaId`,
    { id: Number(id), agenciaId: auth.user.agencia_id }
  );

  return NextResponse.json({ success: true });
}
