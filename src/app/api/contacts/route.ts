import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";
import { canViewAllConversations } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  let sql: string;
  const params: Record<string, unknown> = {};

  const viewAll = canViewAllConversations(auth.user.rol);

  if (q) {
    sql = `SELECT c.*, a.nombre AS agencia_nombre
           FROM lg_contactos c
           JOIN lg_agencias a ON a.id = c.agencia_id
           WHERE (c.telefono LIKE @q OR c.nombre LIKE @q OR c.dpi LIKE @q OR c.etiquetas LIKE @q)
           ${viewAll ? "" : "AND c.agencia_id = @agenciaId"}
           ORDER BY c.actualizado DESC`;
    params.q = `%${q}%`;
    if (!viewAll) params.agenciaId = auth.user.agencia_id;
  } else {
    sql = `SELECT c.*, a.nombre AS agencia_nombre
           FROM lg_contactos c
           JOIN lg_agencias a ON a.id = c.agencia_id
           ${viewAll ? "" : "WHERE c.agencia_id = @agenciaId"}
           ORDER BY c.actualizado DESC`;
    if (!viewAll) params.agenciaId = auth.user.agencia_id;
  }

  const contactos = await query(sql, params);
  return NextResponse.json(contactos);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { telefono, nombre, dpi, etiquetas, notas } = await req.json();

  if (!telefono) {
    return NextResponse.json({ error: "Telefono requerido" }, { status: 400 });
  }

  // Upsert: create or update
  const updates: string[] = ["actualizado = SYSUTCDATETIME()"];
  const paramsObj: Record<string, unknown> = { agenciaId: auth.user.agencia_id, telefono };

  if (nombre !== undefined) { updates.push("nombre = @nombre"); paramsObj.nombre = nombre; }
  if (dpi !== undefined) { updates.push("dpi = @dpi"); paramsObj.dpi = dpi; }
  if (etiquetas !== undefined) { updates.push("etiquetas = @etiquetas"); paramsObj.etiquetas = etiquetas; }
  if (notas !== undefined) { updates.push("notas = @notas"); paramsObj.notas = notas; }

  if (updates.length === 1) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  // Try update first
  const result = await execute(
    `UPDATE lg_contactos SET ${updates.join(", ")}
     WHERE agencia_id = @agenciaId AND telefono = @telefono`,
    paramsObj
  );

  // If no rows updated, insert new
  if (result.rowsAffected[0] === 0) {
    await execute(
      `INSERT INTO lg_contactos (agencia_id, telefono, nombre, dpi, etiquetas, notas)
       VALUES (@agenciaId, @telefono, @nombre, @dpi, @etiquetas, @notas)`,
      paramsObj
    );
  }

  return NextResponse.json({ success: true });
}
