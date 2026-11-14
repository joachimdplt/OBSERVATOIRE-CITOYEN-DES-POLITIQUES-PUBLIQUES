/**
 * Ouvrir un compte de l'équipe, en ligne de commande.
 *
 *   npm run user:create -- prenom.nom@exemple.fr "Prénom Nom" reviewer
 *
 * Le mot de passe se tape à l'invite : passé en argument, il resterait dans
 * l'historique du terminal.
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

async function main() {
  const [email, name, role] = process.argv.slice(2);
  if (!email || !name || !Object.values(Role).includes(role as Role)) {
    console.error(
      `Usage : npm run user:create -- <courriel> "<nom>" <${Object.values(Role).join('|')}>`,
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question('Mot de passe (12 caractères minimum) : ');
  rl.close();
  if (password.length < 12) {
    console.error('Mot de passe trop court.');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name,
      role: role as Role,
      passwordHash: await argon2.hash(password),
    },
  });
  console.log(`Compte ouvert : ${user.email} (${user.role})`);
  await prisma.$disconnect();
}

void main();
