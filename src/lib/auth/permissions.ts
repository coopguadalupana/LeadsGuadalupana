export type Rol = "agent" | "supervisor" | "admin" | "flow_admin" | "superadmin";

const HIERARCHY: Record<Rol, number> = {
  agent: 0,
  flow_admin: 1,
  supervisor: 2,
  admin: 3,
  superadmin: 4,
};

function level(rol: string): number {
  return HIERARCHY[rol as Rol] ?? -1;
}

export function gte(rol: string, min: Rol): boolean {
  return level(rol) >= level(min);
}

export function canManageFlows(rol: string): boolean {
  return gte(rol, "flow_admin");
}

export function canViewAllConversations(rol: string): boolean {
  return gte(rol, "supervisor");
}

export function canTransferConversation(rol: string): boolean {
  return gte(rol, "supervisor");
}

export function canChangeConversationAgency(rol: string): boolean {
  return gte(rol, "supervisor");
}

export function canAssignRoles(rol: string): boolean {
  return gte(rol, "admin");
}

export function canManageUsers(rol: string): boolean {
  return gte(rol, "admin");
}

export function isSuperadmin(rol: string): boolean {
  return rol === "superadmin";
}
