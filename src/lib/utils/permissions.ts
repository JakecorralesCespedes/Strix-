import type { User } from "$lib/types";

const ADMIN_ROLE_NAME = "Admin";

export function hasAnyPermission(
  user: User | null | undefined,
  required: string[] = [],
  departmentId?: number | null,
): boolean {
  if (!required.length) {
    return true;
  }

  if (!user?.role) {
    return false;
  }

  const departmentRoles = user.departmentRoles ?? [];
  const isAdmin =
    user.role.name === ADMIN_ROLE_NAME ||
    departmentRoles.some((item) => item.role?.name === ADMIN_ROLE_NAME);

  if (isAdmin) {
    return true;
  }

  const hasPermission = (permissions: string[] = []) =>
    required.some((permission) => permissions.includes(permission));

  if (departmentId) {
    const match = departmentRoles.find(
      (item) => item.departmentId === Number(departmentId),
    );
    if (match) {
      return hasPermission(match.role?.allowedPermissions ?? []);
    }
  }

  if (departmentRoles.length) {
    return departmentRoles.some((item) =>
      hasPermission(item.role?.allowedPermissions ?? []),
    );
  }

  return hasPermission(user.role.allowedPermissions ?? []);
}
