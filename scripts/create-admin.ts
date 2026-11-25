import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hashPassword } from '../src/lib/crypto.js';
import { prisma } from '../src/lib/prisma.js';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  let email = getArg('--email');
  let name = getArg('--name');
  let password = getArg('--password');

  if (!email || !name || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!name) name = (await rl.question('Admin full name: ')).trim();
      if (!email) email = (await rl.question('Admin email: ')).trim();
      if (!password) password = (await rl.question('Admin password (min 12 chars): ')).trim();
    } finally {
      rl.close();
    }
  }

  if (!email || !email.includes('@')) {
    console.error('Error: A valid email address is required.');
    process.exit(1);
  }
  if (!name || name.length < 2) {
    console.error('Error: Name must be at least 2 characters.');
    process.exit(1);
  }
  if (!password || password.length < 12) {
    console.error('Error: Password must be at least 12 characters long.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name,
      passwordHash,
      role: 'admin',
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
    },
    create: {
      email: normalizedEmail,
      name,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error('Failed to create admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
