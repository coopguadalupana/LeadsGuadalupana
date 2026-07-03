import { query } from "@/lib/db";

export async function isDuplicate(
  conversacionId: number,
  messageId: string
): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM lg_mensajes WHERE conversacion_id = @conversacionId AND message_id = @messageId`,
    { conversacionId, messageId }
  );
  return rows.length > 0;
}
