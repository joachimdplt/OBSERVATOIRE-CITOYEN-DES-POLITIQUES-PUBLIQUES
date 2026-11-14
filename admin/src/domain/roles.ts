import type { Role } from '../types/session'

export type Capability = 'edit' | 'review' | 'preprint'

/**
 * Les capacités d'un rôle, les mêmes que l'API. L'écran s'en sert pour ne
 * pas proposer un geste refusé ; l'API, elle, le refuse de toute façon.
 */
const GRANTS: Record<Role, readonly Capability[]> = {
  editor: ['edit'],
  reviewer: ['edit', 'review'],
  admin: ['edit', 'review', 'preprint'],
}

export const can = (role: Role, capability: Capability) =>
  GRANTS[role].includes(capability)
