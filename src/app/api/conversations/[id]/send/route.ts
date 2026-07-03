import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { sendText } from "@/lib/whatsapp/send";
import { execute } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const { texto } = await req.json();

  if (!texto || typeof texto !== "string") {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const convs = await execute(
    `SELECT id, contacto_externo_id, estado FROM lg_conversaciones
     WHERE id = @id AND agencia_id = @agenciaId`,
    { id: Number(id), agenciaId: auth.user.agencia_id }
  );

  const conv = (convs.recordset as Array<{
    id: number;
    contacto_externo_id: string;
    estado: string;
  }>)[0];

  if (!conv) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  await sendText({ to: conv.contacto_externo_id, text: texto });

  await execute(
    `INSERT INTO lg_mensajes (conversacion_id, role, tipo, contenido)
     VALUES (@convId, 'agente', 'texto', @contenido)`,
    { convId: conv.id, contenido: JSON.stringify({ text: texto }) }
  );

  if (conv.estado === "en_espera") {
    await execute(
      `UPDATE lg_conversaciones SET estado = 'en_curso', actualizado = GETDATE()
       WHERE id = @id`,
      { id: conv.id }
    );
  }

  return NextResponse.json({ success: true });
}
