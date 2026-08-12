/** Roles allowed to create forums and edit/delete ANY forum. */
export const FORUM_MANAGER_ROLES = ['admin', 'manager'] as const;

const ROLE_RANK: Record<string, number> = {
  user: 1,
  manager: 2,
  admin: 3,
};

/** Owner may modify their own forum; admin/manager may modify any forum. */
export function canModifyForum(
  userId: string,
  role: string | undefined,
  createdBy: string | null,
): boolean {
  if (createdBy !== null && createdBy === userId) return true;
  return role !== undefined && (FORUM_MANAGER_ROLES as readonly string[]).includes(role);
}

/**
 * Whether a user may create threads/posts in a forum given `postRoleMin`.
 * null/empty min → any authenticated user (role defaults to user).
 */
export function canPostInForum(
  role: string | undefined | null,
  postRoleMin: string | null | undefined,
): boolean {
  if (!postRoleMin) return true;
  const need = ROLE_RANK[postRoleMin] ?? 1;
  const have = ROLE_RANK[role ?? 'user'] ?? 0;
  return have >= need;
}

/** Pin/lock/delete in-forum: admin/manager global, or board moderator. */
export function canModerateForumContent(
  role: string | undefined | null,
  isBoardModerator: boolean,
): boolean {
  if (role === 'admin' || role === 'manager') return true;
  return isBoardModerator;
}
