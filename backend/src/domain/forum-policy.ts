/** Roles allowed to create forums and edit/delete ANY forum. */
export const FORUM_MANAGER_ROLES = ['admin', 'manager'] as const;

/** Owner may modify their own forum; admin/manager may modify any forum. */
export function canModifyForum(
  userId: string,
  role: string | undefined,
  createdBy: string | null,
): boolean {
  if (createdBy !== null && createdBy === userId) return true;
  return role !== undefined && (FORUM_MANAGER_ROLES as readonly string[]).includes(role);
}
