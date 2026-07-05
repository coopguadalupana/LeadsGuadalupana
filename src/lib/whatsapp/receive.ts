import crypto from "crypto";

interface WhatsAppText {
  body: string;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: WhatsAppText;
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; sha256: string; caption?: string; filename?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  context?: {
    id: string;
    from: string;
    referred_product?: { catalog_id: string; product_retailer_id: string };
  };
  referral?: {
    source_url?: string;
    source_type?: string;
    source_id?: string;
    headline?: string;
    body?: string;
    media_url?: string;
    video_url?: string;
    image_url?: string;
    ctwa_clid?: string;
  };
}

interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; origin: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
}

interface WhatsAppEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: WhatsAppMessage[];
      statuses?: WhatsAppStatus[];
      referral?: { source_url?: string; source_type?: string; source_id?: string; headline?: string; body?: string };
    };
    field: string;
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface ParsedMessage {
  wa_id: string;
  message_id: string;
  profile_name: string;
  timestamp: string;
  type: string;
  text?: string;
  image_caption?: string;
  image_id?: string;
  image_mime_type?: string;
  video_id?: string;
  video_caption?: string;
  video_mime_type?: string;
  document_id?: string;
  document_filename?: string;
  document_mime_type?: string;
  audio_id?: string;
  interactive_reply?: { id: string; title: string };
  location?: { latitude: number; longitude: number };
  ad_id?: string;
  context_message_id?: string;
}

export interface ParsedStatus {
  message_id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export function parsePayload(body: WebhookPayload): {
  messages: ParsedMessage[];
  statuses: ParsedStatus[];
} {
  const messages: ParsedMessage[] = [];
  const statuses: ParsedStatus[] = [];

  if (body.object !== "whatsapp_business_account") return { messages, statuses };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // Status updates
      for (const s of value.statuses ?? []) {
        statuses.push({
          message_id: s.id,
          status: s.status,
          timestamp: s.timestamp,
          recipient_id: s.recipient_id,
        });
      }

      // Incoming messages
      for (const msg of value.messages ?? []) {
        const contact = value.contacts?.[0];
        const parsed: ParsedMessage = {
          wa_id: msg.from,
          message_id: msg.id,
          profile_name: contact?.profile?.name ?? "",
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.text?.body,
          image_caption: msg.image?.caption,
          image_id: msg.image?.id,
          image_mime_type: msg.image?.mime_type,
          video_id: msg.video?.id,
          video_caption: msg.video?.caption,
          video_mime_type: msg.video?.mime_type,
          document_id: msg.document?.id,
          document_filename: msg.document?.filename,
          document_mime_type: msg.document?.mime_type,
          audio_id: msg.audio?.id,
          interactive_reply:
            msg.interactive?.button_reply ??
            msg.interactive?.list_reply,
          location: msg.location
            ? { latitude: msg.location.latitude, longitude: msg.location.longitude }
            : undefined,
          ad_id: value.referral?.source_id ?? msg.referral?.source_id ?? msg.context?.referred_product?.catalog_id,
          context_message_id: msg.context?.id,
        };
        messages.push(parsed);
      }
    }
  }

  return { messages, statuses };
}

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;

  const received = signatureHeader.slice(prefix.length);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
