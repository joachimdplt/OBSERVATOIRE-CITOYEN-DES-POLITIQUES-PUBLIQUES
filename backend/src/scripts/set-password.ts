/**
 * Changer le mot de passe d'un compte de l'équipe, en ligne de commande.
 *
 *   npm run user:password -- prenom.nom@exemple.fr
 *
 * Le mot de passe se tape à l'invite : passé en argument, il resterait dans
 * l'historique du terminal.
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Usage : npm run user:password -- <courriel>');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question(
    'Nouveau mot de passe (12 caractères minimum) : ',
  );
  rl.close();
  if (password.length < 12) {
    console.error('Mot de passe trop court.');
    process.exit(1);
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const user = await prisma.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { passwordHash: await argon2.hash(password) },
  });
  console.log(`Mot de passe changé : ${user.email}`);
  await prisma.$disconnect();
}

void main();
