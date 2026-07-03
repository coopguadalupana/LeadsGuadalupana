import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const agencias = await query(
    `SELECT config FROM lg_agencias WHERE id = @id AND activa = 1`,
    { id: auth.user.agencia_id }
  );

  const config = agencias.length > 0 ? agencias[0] : { config: null };
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  if (auth.user.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json();

  await execute(
    `UPDATE lg_agencias SET config = @config WHERE id = @id`,
    { config: JSON.stringify(body), id: auth.user.agencia_id }
  );

  return NextResponse.json({ success: true });
}
