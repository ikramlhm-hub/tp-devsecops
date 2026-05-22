import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.io' },
    update: {},
    create: {
      email: 'admin@helpdesk.io',
      password: passwordHash,
      name: 'Alice Admin',
      role: 'ADMIN',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@helpdesk.io' },
    update: {},
    create: {
      email: 'agent@helpdesk.io',
      password: passwordHash,
      name: 'Bob Support',
      role: 'AGENT',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@helpdesk.io' },
    update: {},
    create: {
      email: 'user@helpdesk.io',
      password: passwordHash,
      name: 'Charlie Client',
      role: 'USER',
    },
  });

  await prisma.ticket.createMany({
    data: [
      {
        title: 'Impossible de se connecter à mon compte',
        description: 'Quand je tente de me connecter, je reçois une erreur 500.',
        status: 'OPEN',
        priority: 'HIGH',
        authorId: user.id,
        assigneeId: agent.id,
      },
      {
        title: 'Demande de réinitialisation de mot de passe',
        description: 'Le lien de reset que j\'ai reçu par email est expiré.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        authorId: user.id,
        assigneeId: agent.id,
      },
      {
        title: 'Facture incorrecte',
        description: 'Ma facture de novembre contient une ligne en double.',
        status: 'RESOLVED',
        priority: 'LOW',
        authorId: user.id,
      },
    ],
  });

  console.log(`✅ Created users: ${admin.email}, ${agent.email}, ${user.email}`);
  console.log('   Default password for all: Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
