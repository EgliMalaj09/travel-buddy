/** Back office roles (same as the API's AdminRoles). Each role can do everything the one before it can. */
export type Role = 'viewer' | 'support' | 'owner';

const rank: Record<string, number> = { viewer: 1, support: 2, owner: 3 };

export function roleAtLeast(role: string, needed: Role): boolean {
  return (rank[role] ?? 0) >= rank[needed]!;
}

export const roleText: Record<Role, string> = {
  viewer: 'Dashboard, status and settings (read only)',
  support: 'Viewer + find accounts, suspend, sign out, deletion queue',
  owner: 'Support + export and erase, change settings, team, audit log',
};
