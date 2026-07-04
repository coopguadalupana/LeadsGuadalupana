import { NextRequest } from "next/server";
import { verifyWebhook } from "@/lib/whatsapp/verify";
import { parsePayload } from "@/lib/whatsapp/receive";
import { isDuplicate } from "@/lib/webhook/idempotency";
import { getAdAttribution } from "@/lib/meta-ads/attribution";
import { processMessage } from "@/lib/flows/integration";
import { query, execute } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook GET - mode:", mode, "token:", token, "challenge:", challenge);
  console.log("Webhook GET - expected token:", process.env.META_WEBHOOK_VERIFY_TOKEN);

  const result = verifyWebhook(mode, token, challenge);
  if (result !== null) {
    console.log("Webhook verification successful, returning challenge:", result);
    const cleanChallenge = String(result).trim();
    return new Response(cleanChallenge, {
      status: 200,
      headers: { "Content-Type": "text/plain",
        // Opcional: Evita que Next.js o Nginx guarden en caché esta respuesta de verificación
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
       },
    });
  }

  console.error("Webhook verification failed");
  return new Response("Verification failed", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("Webhook POST - raw body:", rawBody);
    // Los webhooks de entrada no siempre se verifican con HMAC en los primeros
    // mensajes de prueba. Se valida cuando META_APP_SECRET esta configurado.
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const signature = req.headers.get("x-hub-signature-256");
      const crypto = await import("crypto");
      const expected = crypto
        .createHmac("sha256", appSecret)
        .update(rawBody, "utf8")
        .digest("hex");

      if (!signature || !signature.startsWith("sha256=")) {
        return new Response("Missing signature", { status: 400 });
      }

      const received = signature.slice(7);
      const valid = crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(received)
      );
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const { messages, statuses } = parsePayload(body);

    // Procesar status updates
    for (const st of statuses) {
      try {
        await execute(
          `UPDATE lg_mensajes SET procesado = 1 WHERE message_id = @messageId`,
          { messageId: st.message_id }
        );
      } catch {
        // Si no existe el mensaje, ignorar
      }
    }

    // Procesar mensajes entrantes
    for (const msg of messages) {
      let agenciaId = 1; // fallback si no se puede atribuir
      let adId: string | null = null;
      let campaignId: string | null = null;

      // Attribution via ad_id
      if (msg.ad_id) {
        const attribution = await getAdAttribution(msg.ad_id);
        if (attribution) {
          adId = attribution.ad_id;
          campaignId = attribution.campaign_id;
          if (attribution.agency_id) agenciaId = attribution.agency_id;
        }
      }

      const plataforma = "whatsapp";

      // Buscar o crear conversacion
      const conversaciones = await query<{ id: number; estado: string }>(
        `SELECT id, estado FROM lg_conversaciones
         WHERE agencia_id = @agenciaId AND contacto_externo_id = @waId
           AND estado != 'cerrada'`,
        { agenciaId, waId: msg.wa_id }
      );

      let convId: number;
      if (conversaciones.length === 0) {
        const result = await execute(
          `INSERT INTO lg_conversaciones (agencia_id, plataforma, contacto_externo_id, ad_id, campaign_id, estado)
           OUTPUT INSERTED.id
           VALUES (@agenciaId, @plataforma, @contacto, @adId, @campaignId, 'auto_respondiendo')`,
          { agenciaId, plataforma, contacto: msg.wa_id, adId, campaignId }
        );
        const inserted = result.recordset as Array<{ id: number }>;
        convId = inserted[0]!.id;
      } else {
        convId = conversaciones[0]!.id;

        // Si estaba cerrada o en_curso y vuelve a escribir, reabrir auto-response
        if (conversaciones[0]!.estado === "en_curso") {
          await execute(
            `UPDATE lg_conversaciones SET estado = 'auto_respondiendo', actualizado = GETDATE()
             WHERE id = @id`,
            { id: convId }
          );
        }
      }

      // Idempotencia
      if (await isDuplicate(convId, msg.message_id)) continue;

      // Guardar mensaje
      const metadata = JSON.stringify({
        ad_id: adId,
        campaign_id: campaignId,
        raw_ad_id: msg.ad_id ?? null,
        context_message_id: msg.context_message_id ?? null,
      });

      const contenido = JSON.stringify({
        text: msg.text,
        image_caption: msg.image_caption,
        interactive_reply: msg.interactive_reply,
        location: msg.location,
        type: msg.type,
      });

      const tipoMap: Record<string, string> = {
        text: "texto",
        image: "imagen",
        audio: "audio",
        video: "video",
        document: "documento",
        interactive: "interactivo",
        location: "ubicacion",
        contacts: "contacto",
        sticker: "sticker",
        button: "interactivo",
        list: "interactivo",
        order: "desconocido",
        system: "desconocido",
      };
      const tipo = tipoMap[msg.type] ?? "desconocido";

      await execute(
        `INSERT INTO lg_mensajes (conversacion_id, message_id, role, tipo, contenido, metadata)
         VALUES (@convId, @msgId, 'cliente', @tipo, @contenido, @metadata)`,
        {
          convId,
          msgId: msg.message_id,
          tipo,
          contenido,
          metadata,
        }
      );

      // Procesar auto-respuesta
      const textContent = msg.text ?? msg.image_caption ?? "";
      await processMessage(convId, agenciaId, msg.wa_id, textContent);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 });
  }
}
