import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = process.env.WHATSAPP_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";

  if (!token) {
    return NextResponse.json({ error: "Missing WHATSAPP_TOKEN" }, { status: 500 });
  }

  // Get media URL from WhatsApp
  const mediaRes = await fetch(
    `https://graph.facebook.com/${apiVersion}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!mediaRes.ok) {
    const err = await mediaRes.text();
    return NextResponse.json({ error: `WhatsApp API error: ${err}` }, { status: 502 });
  }

  const mediaData = await mediaRes.json();
  const downloadUrl = mediaData.url;

  if (!downloadUrl) {
    return NextResponse.json({ error: "No media URL found" }, { status: 404 });
  }

  // Download and proxy the media
  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileRes.ok) {
    return NextResponse.json({ error: "Failed to download media" }, { status: 502 });
  }

  const buffer = await fileRes.arrayBuffer();
  const contentType = mediaData.mime_type ?? "application/octet-stream";
  const fileName = mediaData.filename ?? `media_${id}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
