import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { sendText, sendMedia } from "@/lib/whatsapp/send";
import { execute, query } from "@/lib/db";
import { transitionState } from "@/lib/workflow/state-machine";

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
    const mimeType = file.type || (file.name.match(/\.(jpe?g|png|gif|webp)$/i) ? "image/jpeg" : file.name.match(/\.(mp4|mov|avi)$/i) ? "video/mp4" : "image/jpeg");
    const whatsappType = mimeType.startsWith("video") ? "video" : "image";
    const dbType = whatsappType === "video" ? "video" : "imagen";

    const waResponse = await sendMedia({
      to: conv.contacto_externo_id,
      fileBuffer: buffer,
      mimeType,
      fileName: file.name,
      mediaType: whatsappType,
    });

    const mediaMsgId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await execute(
      `INSERT INTO lg_mensajes (conversacion_id, message_id, role, tipo, contenido)
       VALUES (@convId, @msgId, 'agente', @tipo, @contenido)`,
      {
        convId: conv.id,
        msgId: mediaMsgId,
        tipo: dbType,
        contenido: JSON.stringify({
          [whatsappType === "image" ? "image_id" : "video_id"]: waResponse.mediaId,
          [whatsappType === "image" ? "image_mime_type" : "video_mime_type"]: mimeType,
          type: whatsappType,
        }),
      }
    );

    if (conv.estado === "en_espera") {
      await transitionState(conv.id, "agent_send");
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
    await transitionState(conv.id, "agent_send");
  }

  // Return the updated conversation with messages
  const updatedConv = await query<Record<string, unknown>>(
    `SELECT id, agencia_id, plataforma, contacto_externo_id, estado,
            ad_id, campaign_id, creado, actualizado
     FROM lg_conversaciones WHERE id = @id`,
    { id: conv.id }
  );

  const mensajes = await query(
    `SELECT id, role, tipo, contenido, metadata, recibido
     FROM lg_mensajes WHERE conversacion_id = @convId
     ORDER BY recibido ASC`,
    { convId: conv.id }
  );

  return NextResponse.json({ ...updatedConv[0], mensajes });
}
