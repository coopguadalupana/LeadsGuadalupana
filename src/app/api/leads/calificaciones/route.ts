import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const calificaciones = await query(
    "SELECT nombre, color_fondo, color_texto, orden FROM lg_calificaciones WHERE activo = 1 ORDER BY orden"
  );
  return NextResponse.json(calificaciones);
}
