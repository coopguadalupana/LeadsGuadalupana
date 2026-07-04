// Todos los mensajes se almacenan en UTC en la BD.
// El navegador convierte automaticamente a la zona horaria del usuario.
// Usamos America/Guatemala para consistencia.

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Guatemala",
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Guatemala",
};

export function formatGtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-GT", TIME_OPTS);
}

export function formatGtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-GT", DATE_OPTS);
}
