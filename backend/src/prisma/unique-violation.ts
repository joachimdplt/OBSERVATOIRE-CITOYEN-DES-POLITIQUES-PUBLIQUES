import { Prisma } from '../generated/prisma/client';

/** Vrai si l'erreur vient d'une contrainte d'unicité de la base. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}
