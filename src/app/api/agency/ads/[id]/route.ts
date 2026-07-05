import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { execute, query } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!await canManageUsers(auth.user.rol_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Only allow deleting manual entries
  const existing = await query<{ ad_id: string; es_manual: boolean }>(
    "SELECT ad_id, es_manual FROM lg_ads_cache WHERE ad_id = @adId",
    { adId: id }
  );

  if (existing.length === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (!existing[0]!.es_manual) {
    return NextResponse.json({ error: "Solo se pueden eliminar entradas manuales" }, { status: 403 });
  }

  await execute("DELETE FROM lg_ads_cache WHERE ad_id = @adId", { adId: id });
  return NextResponse.json({ success: true });
}
