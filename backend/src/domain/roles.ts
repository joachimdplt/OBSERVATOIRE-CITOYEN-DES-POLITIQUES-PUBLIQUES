import { Role } from '../generated/prisma/enums';

/**
 * Qui fait quoi dans l'équipe. Le public n'apparaît pas ici : il n'a pas de
 * compte et ne lit que des objets publiés.
 */
const GRANTS: Record<Role, readonly Capability[]> = {
  [Role.editor]: ['edit'],
  [Role.reviewer]: ['edit', 'review'],
  // Pendant le lancement, seule l'administration prépublie : une version
  // vérifiée par son seul auteur ne vient que d'une personne qui en répond.
  [Role.admin]: ['edit', 'review', 'preprint', 'manage_accounts'],
};

export type Capability = 'edit' | 'review' | 'preprint' | 'manage_accounts';

export function can(role: Role, capability: Capability): boolean {
  return GRANTS[role].includes(capability);
}
