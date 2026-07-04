import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { sendText, sendMedia } from "@/lib/whatsapp/send";
import { execute, query } from "@/lib/db";

export async function POST(
  req: NextRequest,
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

  const conv = convs[0];
  if (!conv) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // Media upload
    const formData = await req.formData();
    const file = formData.get("media") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaType = file.type.startsWith("video") ? "video" : "image";

    const waResponse = await sendMedia({
      to: conv.contacto_externo_id,
      fileBuffer: buffer,
      mimeType: file.type,
      fileName: file.name,
      mediaType,
    });

    await execute(
      `INSERT INTO lg_mensajes (conversacion_id, role, tipo, contenido)
       VALUES (@convId, 'agente', @tipo, @contenido)`,
      {
        convId: conv.id,
        tipo: mediaType,
        contenido: JSON.stringify({
          [mediaType === "image" ? "image_id" : "video_id"]: waResponse.messages[0]?.id,
          [mediaType === "image" ? "image_mime_type" : "video_mime_type"]: file.type,
          type: mediaType,
        }),
      }
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

  // Text message
  const { texto } = await req.json();
  if (!texto || typeof texto !== "string") {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  // Save locally FIRST, then send to WhatsApp
  const msgId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await execute(
    `INSERT INTO lg_mensajes (conversacion_id, message_id, role, tipo, contenido)
     VALUES (@convId, @msgId, 'agente', 'texto', @contenido)`,
    { convId: conv.id, msgId, contenido: JSON.stringify({ text: texto }) }
  );

  try {
    await sendText({ to: conv.contacto_externo_id, text: texto });
  } catch (e) {
    console.error("Error enviando mensaje a WhatsApp:", e);
    // El mensaje ya esta guardado localmente
  }

  if (conv.estado === "en_espera") {
    await execute(
      `UPDATE lg_conversaciones SET estado = 'en_curso', actualizado = GETDATE()
       WHERE id = @id`,
      { id: conv.id }
    );
  }

  return NextResponse.json({ success: true });
}
