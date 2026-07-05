import { query } from "@/lib/db";

// ---- Server-side (BD-backed, async) ----

const cache = new Map<number, Set<string>>();

export async function getPermisos(rolId: number): Promise<Set<string>> {
  if (!cache.has(rolId)) {
    const rows = await query<{ codigo: string }>(
      `SELECT p.codigo FROM lg_roles_permisos rp
       JOIN lg_permisos p ON p.id = rp.permiso_id
       WHERE rp.rol_id = @rolId`,
      { rolId }
    );
    cache.set(rolId, new Set(rows.map(r => r.codigo)));
  }
  return cache.get(rolId)!;
}

export async function tienePermiso(rolId: number, permiso: string): Promise<boolean> {
  const set = await getPermisos(rolId);
  return set.has(permiso);
}

// Helpers async
export const canManageFlows = (rolId: number) => tienePermiso(rolId, "gestionar_flows");
export const canViewAllConversations = (rolId: number) => tienePermiso(rolId, "ver_todas_agencias");
export const canTransferConversation = (rolId: number) => tienePermiso(rolId, "transferir_conversacion");
export const canChangeConversationAgency = (rolId: number) => tienePermiso(rolId, "cambiar_agencia_conv");
export const canAssignRoles = (rolId: number) => tienePermiso(rolId, "asignar_roles");
export const canManageUsers = (rolId: number) => tienePermiso(rolId, "gestionar_usuarios");


