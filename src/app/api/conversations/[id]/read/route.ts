import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { query, execute } from "@/lib/db";
import { transitionState } from "@/lib/workflow/state-machine";
import { markAsRead } from "@/lib/whatsapp/send";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  const { id } = await params;

  const convs = await query<{
    id: number;
    contacto_externo_id: string;
    estado: string;
  }>(
    `SELECT id, contacto_externo_id, estado FROM lg_conversaciones
     WHERE id = @id AND agencia_id = @agenciaId`,
    { id: Number(id), agenciaId: auth.user.agencia_id }
  );

  if (convs.length === 0) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const conv = convs[0]!;

  // Get the last message ID to send read receipt to WhatsApp
  const lastMsg = await query<{ message_id: string | null }>(
    `SELECT TOP 1 message_id FROM lg_mensajes
     WHERE conversacion_id = @convId AND role = 'cliente'
     ORDER BY recibido DESC`,
    { convId: conv.id }
  );

  // Mark as read in WhatsApp
  if (lastMsg.length > 0 && lastMsg[0]!.message_id) {
    try {
      await markAsRead(lastMsg[0]!.message_id);
    } catch {
      // If markAsRead fails, still mark locally
    }
  }

  // Mark conversation as in progress when agent opens it
  if (conv.estado === "en_espera") {
    await transitionState(conv.id, "agent_read");
  }

  await execute(
    `UPDATE lg_conversaciones
     SET leido_por = @userId, ultima_lectura = GETUTCDATE(), actualizado = GETUTCDATE()
     WHERE id = @id`,
    { userId: Number(auth.user.id), id: conv.id }
  );

  return NextResponse.json({ success: true });
}
