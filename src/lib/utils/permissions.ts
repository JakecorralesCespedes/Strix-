import type { User } from "$lib/types";

const ADMIN_ROLE_NAME = "Admin";

export function hasAnyPermission(
  user: User | null | undefined,
  required: string[] = [],
): boolean {
  if (!required.length) {
    return true;
  }

  if (!user?.role) {
    return false;
  }

  if (user.role.name === ADMIN_ROLE_NAME) {
    return true;
  }

  const allowed = user.role.allowedPermissions ?? [];
  return required.some((permission) => allowed.includes(permission));
}
