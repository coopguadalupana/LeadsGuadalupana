import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const roles = await query<{ id: number; nombre: string; jerarquia: number; permisos: string | null }>(
    `SELECT r.id, r.nombre, r.jerarquia,
            (SELECT STRING_AGG(p.codigo, ',') FROM lg_roles_permisos rp JOIN lg_permisos p ON p.id = rp.permiso_id WHERE rp.rol_id = r.id) as permisos
     FROM lg_roles r ORDER BY r.jerarquia`
  );

  const result = roles.map((r) => ({
    ...r,
    permisos: r.permisos ? r.permisos.split(",") : [],
  }));

  return NextResponse.json(result);
}
