import { prisma } from '../src/lib/prisma.js';

const dryRun = process.argv.includes('--dry-run');
const confirm = process.argv.includes('--confirm');
if (dryRun === confirm) {
  console.error('Choose exactly one mode: --dry-run or --confirm.');
  process.exitCode = 1;
} else {
  const tables = [
    { name: 'contact', find: () => prisma.contactMessage.findMany(), remove: (ids: string[]) => prisma.contactMessage.deleteMany({ where: { id: { in: ids } } }) },
    { name: 'volunteer', find: () => prisma.volunteerApplication.findMany(), remove: (ids: string[]) => prisma.volunteerApplication.deleteMany({ where: { id: { in: ids } } }) },
    { name: 'partner', find: () => prisma.partnerInquiry.findMany(), remove: (ids: string[]) => prisma.partnerInquiry.deleteMany({ where: { id: { in: ids } } }) },
    { name: 'event registration', find: () => prisma.eventRegistration.findMany(), remove: (ids: string[]) => prisma.eventRegistration.deleteMany({ where: { id: { in: ids } } }) },
    { name: 'subscriber', find: () => prisma.subscriber.findMany(), remove: (ids: string[]) => prisma.subscriber.deleteMany({ where: { id: { in: ids } } }) },
  ];

  try {
    const matches: { name: string; ids: string[] }[] = [];
    for (const table of tables) {
      const rows = await table.find();
      const ids = rows.filter((row) => {
        const record = row as unknown as Record<string, unknown>;
        const email = typeof record.email === 'string' && record.email.toLowerCase().endsWith('@example.com');
        const text = Object.values(record).some((value) => typeof value === 'string' && /e2e/i.test(value));
        return email || text;
      }).map((row) => row.id);
      matches.push({ name: table.name, ids });
    }

    const total = matches.reduce((sum, item) => sum + item.ids.length, 0);
    console.log(`${dryRun ? 'Dry run' : 'Confirmed cleanup'}: ${total} matching records across ${matches.length} record types.`);
    for (const item of matches) console.log(`${item.name}: ${item.ids.length} [${item.ids.join(', ')}]`);

    if (confirm && total) {
      await prisma.auditLog.create({
        data: {
          userEmail: 'system',
          action: 'demo_data.cleanup',
          entityType: 'demo_data',
          detailsJson: JSON.stringify({ counts: Object.fromEntries(matches.map(({ name, ids }) => [name, ids.length])), recordIds: matches.flatMap(({ ids }) => ids) }),
        },
      });
      for (const table of tables) {
        const selection = matches.find(({ name }) => name === table.name);
        if (selection?.ids.length) await table.remove(selection.ids);
      }
    }
  } catch (error) {
    console.error(`Demo cleanup failed (${error instanceof Error ? error.name : 'UnknownError'}).`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
