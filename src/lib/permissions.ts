import type { CurrentUser, Permission } from "@/types/domain";

export function can(user: CurrentUser | undefined, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function canAny(user: CurrentUser | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function canAll(user: CurrentUser | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(user, permission));
}

export function usePermission(user: CurrentUser | undefined, permission: Permission): boolean {
  return can(user, permission);
}

export function usePermissions(user: CurrentUser | undefined, permissions: Permission[]): boolean {
  return canAny(user, permissions);
}

export function canWrite(user: CurrentUser | undefined, module: string): boolean {
  const permission = `${module}:write` as Permission;
  return can(user, permission);
}

export function canApprove(user: CurrentUser | undefined, module: string): boolean {
  const permission = `${module}:approve` as Permission;
  return can(user, permission);
}

export function canRead(user: CurrentUser | undefined, module: string): boolean {
  const permission = `${module}:read` as Permission;
  return can(user, permission);
}