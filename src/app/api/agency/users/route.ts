import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers, canViewAllConversations } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  if (await canViewAllConversations(auth.user.rol_id)) {
    const users = await query(
      `SELECT u.id, u.ldap_sam, u.nombre, u.email, u.rol, u.agencia_id, u.activo, u.ultimo_sync,
              a.nombre AS agencia_nombre
       FROM lg_usuarios u
       JOIN lg_agencias a ON a.id = u.agencia_id
       ORDER BY a.nombre, u.nombre`
    );
    return NextResponse.json(users);
  }

  const users = await query(
    `SELECT u.id, u.ldap_sam, u.nombre, u.email, u.rol, u.agencia_id, u.activo, u.ultimo_sync,
            a.nombre AS agencia_nombre
     FROM lg_usuarios u
     JOIN lg_agencias a ON a.id = u.agencia_id
     WHERE u.agencia_id = @agenciaId
     ORDER BY u.nombre`,
    { agenciaId: auth.user.agencia_id }
  );
  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!await canManageUsers(auth.user.rol_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { id, rol, activo, agencia_id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: Record<string, unknown> = { id: Number(id) };

  if (rol !== undefined) {
    if (!await canManageUsers(auth.user.rol_id)) {
      return NextResponse.json({ error: "No puedes cambiar roles" }, { status: 403 });
    }
    updates.push("rol = @rol");
    params.rol = rol;
  }

  if (activo !== undefined) {
    updates.push("activo = @activo");
    params.activo = activo;

    // If deactivating, unassign conversations
    if (!activo) {
      await execute(
        `UPDATE lg_conversaciones SET asignado_a = NULL, actualizado = GETUTCDATE()
         WHERE asignado_a = @userId`,
        { userId: Number(id) }
      );
    }
  }

  if (agencia_id !== undefined) {
    if (!canViewAllConversations(auth.user.rol_id)) {
      return NextResponse.json({ error: "No puedes cambiar agencia" }, { status: 403 });
    }
    // Unassign conversations when changing agency
    await execute(
      `UPDATE lg_conversaciones SET asignado_a = NULL, actualizado = GETUTCDATE()
       WHERE asignado_a = @userId`,
      { userId: Number(id) }
    );
    updates.push("agencia_id = @agenciaId");
    params.agenciaId = Number(agencia_id);
  }

  updates.push("actualizado = GETUTCDATE()");

  await execute(`UPDATE lg_usuarios SET ${updates.join(", ")} WHERE id = @id`, params);
  return NextResponse.json({ success: true });
}
