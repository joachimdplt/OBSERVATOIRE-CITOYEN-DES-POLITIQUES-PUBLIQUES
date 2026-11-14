import { Role } from '../generated/prisma/enums';
import { can } from './roles';

describe('les droits de l’équipe', () => {
  it('une personne qui édite ne relit pas', () => {
    expect(can(Role.editor, 'edit')).toBe(true);
    expect(can(Role.editor, 'review')).toBe(false);
  });

  it('une personne qui relit peut aussi éditer, sans gérer les comptes', () => {
    expect(can(Role.reviewer, 'review')).toBe(true);
    expect(can(Role.reviewer, 'manage_accounts')).toBe(false);
  });

  it('l’administration fait tout', () => {
    expect(can(Role.admin, 'manage_accounts')).toBe(true);
  });

  it('seule l’administration prépublie', () => {
    expect(can(Role.admin, 'preprint')).toBe(true);
    expect(can(Role.reviewer, 'preprint')).toBe(false);
    expect(can(Role.editor, 'preprint')).toBe(false);
  });
});
