// Cliente-side: funciones sincronicas que no requieren BD
// Para usar en componentes de frontend (sidebar, etc.)

const HIERARCHY: Record<string, number> = {
  agent: 0, flow_admin: 1, supervisor: 2, admin: 3, superadmin: 4,
};

export function canManageFlowsSync(rol: string): boolean {
  return (HIERARCHY[rol] ?? -1) >= (HIERARCHY["flow_admin"] ?? 0);
}

export function canManageUsersSync(rol: string): boolean {
  return (HIERARCHY[rol] ?? -1) >= (HIERARCHY["admin"] ?? 0);
}

export function canViewAllConversationsSync(rol: string): boolean {
  return (HIERARCHY[rol] ?? -1) >= (HIERARCHY["supervisor"] ?? 0);
}
