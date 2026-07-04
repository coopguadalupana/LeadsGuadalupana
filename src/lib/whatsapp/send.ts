interface SendTextParams {
  to: string;
  text: string;
  previewUrl?: boolean;
}

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Record<string, unknown>;
}

interface SendInteractiveParams {
  to: string;
  type: "button" | "list";
  header?: string;
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}

interface WhatsAppResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

async function apiCall(payload: Record<string, unknown>): Promise<WhatsAppResponse> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";

  if (!token || !phoneId) {
    throw new Error("Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID");
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function sendText(params: SendTextParams): Promise<WhatsAppResponse> {
  return apiCall({
    to: params.to,
    type: "text",
    text: { body: params.text, preview_url: params.previewUrl ?? false },
  });
}

export async function sendTemplate(params: SendTemplateParams): Promise<WhatsAppResponse> {
  return apiCall({
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode ?? "es" },
      ...(params.components ? { components: params.components } : {}),
    },
  });
}

interface SendMediaParams {
  to: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  mediaType: "image" | "video" | "document";
  caption?: string;
}

export async function sendMedia(params: SendMediaParams): Promise<WhatsAppResponse> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";

  if (!token || !phoneId) {
    throw new Error("Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID");
  }

  // Upload media to WhatsApp
  const uploadUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/media`;

  const uploadForm = new FormData();
  uploadForm.append("messaging_product", "whatsapp");
  uploadForm.append("file", new Blob([new Uint8Array(params.fileBuffer)], { type: params.mimeType }), params.fileName);
  uploadForm.append("type", params.mimeType);

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: uploadForm,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`WhatsApp upload error ${uploadRes.status}: ${err}`);
  }

  const uploadData = await uploadRes.json();
  const mediaId = uploadData.id;

  if (!mediaId) {
    throw new Error("WhatsApp upload did not return media ID");
  }

  // Send the uploaded media
  return apiCall({
    to: params.to,
    type: params.mediaType,
    [params.mediaType]: {
      id: mediaId,
      caption: params.caption ?? params.fileName,
    },
  });
}

export async function sendInteractive(params: SendInteractiveParams): Promise<WhatsAppResponse> {
  const interactive: Record<string, unknown> = {
    type: params.type,
    body: { text: params.body },
  };

  if (params.header) interactive.header = { type: "text", text: params.header };
  if (params.footer) interactive.footer = { text: params.footer };
  if (params.buttons) interactive.action = { buttons: params.buttons.map((b) => ({ type: "reply", reply: b })) };
  if (params.sections) interactive.action = { sections: params.sections };

  return apiCall({ to: params.to, type: "interactive", interactive });
}

export function markAsRead(messageId: string): Promise<WhatsAppResponse> {
  return apiCall({ status: "read", message_id: messageId });
}
