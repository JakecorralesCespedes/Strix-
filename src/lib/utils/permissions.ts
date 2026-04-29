import type { User } from "$lib/types";

const ADMIN_ROLE_NAME = "Admin";

/**
 * Verifica si el usuario tiene al menos uno de los permisos requeridos.
 * Si se proporciona un departmentId, valida estrictamente contra el rol
 * asignado a ese departamento. Sin departmentId, basta con que cualquier
 * rol asignado tenga el permiso.
 */
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

  const includesAny = (permissions: string[] = []) =>
    required.some((permission) => permissions.includes(permission));

  if (departmentId) {
    const match = departmentRoles.find(
      (item) => item.departmentId === Number(departmentId),
    );
    if (match) {
      return includesAny(match.role?.allowedPermissions ?? []);
    }

    // Cuando el usuario aún tiene el modelo legacy (sin departmentRoles)
    // y su departmentId coincide con el solicitado, verificamos su rol
    // directo. Si no coincide, no tiene permiso para ese departamento.
    if (!departmentRoles.length && user.departmentId === Number(departmentId)) {
      return includesAny(user.role.allowedPermissions ?? []);
    }
    return false;
  }

  if (departmentRoles.length) {
    return departmentRoles.some((item) =>
      includesAny(item.role?.allowedPermissions ?? []),
    );
  }

  return includesAny(user.role.allowedPermissions ?? []);
}
