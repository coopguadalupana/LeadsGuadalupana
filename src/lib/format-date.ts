// SQL Server almacena GETDATE() que devuelve hora local (Guatemala UTC-6).
// mssql lo interpreta como UTC. Corregimos sumando 6h al crear el Date.
const GT_OFFSET = 6 * 60 * 60 * 1000;

export function gtDate(dateStr: string): Date {
  return new Date(new Date(dateStr).getTime() + GT_OFFSET);
}

export function formatGtTime(dateStr: string): string {
  return gtDate(dateStr).toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatGtDate(dateStr: string): string {
  return gtDate(dateStr).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
