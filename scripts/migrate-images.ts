import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma.js';
import { detectImageMime, storage } from '../src/lib/storage.js';

const GALLERY_METADATA: Record<string, { category: string; alt: string; featured?: boolean }> = {
  '1.jpg': { category: 'learners', alt: 'Dijitali Maths learners in a hands-on session, Nairobi', featured: true },
  '2.jpg': { category: 'learners', alt: 'Students discovering mathematics through games', featured: true },
  '3.jpg': { category: 'community', alt: 'Community mathematics festival Nakuru', featured: true },
  '4.jpg': { category: 'action', alt: 'Hands-on maths activity with manipulatives', featured: true },
  '5.jpg': { category: 'teachers', alt: 'Teacher professional development workshop' },
  '6.jpg': { category: 'learners', alt: 'Children celebrating maths success', featured: true },
  '7.jpg': { category: 'action', alt: 'Maths challenge session with students' },
  '8.jpg': { category: 'learners', alt: 'Group learning session in Nairobi', featured: true },
  '9.jpg': { category: 'learners', alt: 'Nakuru learners in a maths session' },
  '10.jpg': { category: 'action', alt: 'Binary code bead necklace activity', featured: true },
  '11.jpg': { category: 'community', alt: 'Community celebration of maths learning' },
  '12.jpg': { category: 'teachers', alt: 'Teacher workshop practical activity' },
  '13.jpg': { category: 'action', alt: 'Creative problem solving session' },
  '14.jpg': { category: 'community', alt: 'Outdoor maths festival Kenya' },
  '15.jpg': { category: 'learners', alt: 'Children engaged in maths activities' },
  '16.jpg': { category: 'teachers', alt: 'Teachers collaborating in workshop' },
  '18.JPG': { category: 'action', alt: 'Maths demonstration and activity' },
  '19.JPG': { category: 'community', alt: 'Community maths engagement session' },
  '20.JPG': { category: 'community', alt: 'Large community maths event Kenya' },
  '21.jpg': { category: 'learners', alt: 'Young learner exploring maths concepts' },
  '22.jpg': { category: 'action', alt: 'Interactive maths board game session' },
  'binary_code_activity.jpg': { category: 'action', alt: 'Binary Code Necklace Activity', featured: true },
  'teacher_workshop.jpg': { category: 'teachers', alt: 'Low-Cost Counting Cups Teacher Workshop', featured: true },
  'community_math_fest.jpg': { category: 'community', alt: 'Community Mathematics Festival — Giant Floor Tangram', featured: true },
  'ngo2.jpg': { category: 'partners', alt: 'NGO partnership visit and collaboration' },
  'Certificate.jpg': { category: 'partners', alt: 'Dijitali Maths recognition certificate' },
  'sege.jpg': { category: 'learners', alt: 'Learners participating in a maths activity', featured: true },
  'bng.jpg': { category: 'community', alt: 'Large group outdoor maths session' },
  'ronald.jpg': { category: 'partners', alt: 'Volunteer and partner engagement' },
};

async function main() {
  const imagesDir = path.resolve('images');
  const entries = await fs.readdir(imagesDir, { withFileTypes: true });

  let beforeBytes = 0;
  let afterWebBytes = 0;
  let migratedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      skippedCount++;
      continue;
    }

    const fullPath = path.join(imagesDir, entry.name);
    const buffer = await fs.readFile(fullPath);
    const mime = detectImageMime(buffer);
    if (!mime) {
      console.warn(`Skipping ${entry.name}: unrecognized image magic bytes`);
      skippedCount++;
      continue;
    }

    beforeBytes += buffer.length;

    const existing = await prisma.image.findFirst({ where: { title: entry.name } });
    if (existing) {
      afterWebBytes += existing.sizeBytes;
      skippedCount++;
      continue;
    }

    const meta = GALLERY_METADATA[entry.name];
    // Only publish curated gallery photos by default; portraits/logos are still stored & available in admin
    const isGalleryPhoto = Boolean(meta);
    const saved = await storage.saveImage(buffer, entry.name);
    afterWebBytes += saved.sizeBytes;

    await prisma.image.create({
      data: {
        title: entry.name,
        altText: meta?.alt || entry.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        category: meta?.category || 'partners',
        sortOrder: i + 1,
        featured: Boolean(meta?.featured),
        published: isGalleryPhoto,
        ...saved,
      },
    });
    migratedCount++;
  }

  const beforeMB = (beforeBytes / (1024 * 1024)).toFixed(2);
  const afterMB = (afterWebBytes / (1024 * 1024)).toFixed(2);
  const reduction = beforeBytes > 0 ? (((beforeBytes - afterWebBytes) / beforeBytes) * 100).toFixed(1) : '0.0';

  console.log('=== Image Migration Complete ===');
  console.log(`Migrated: ${migratedCount} | Skipped/Existing: ${skippedCount}`);
  console.log(`Total size before (originals): ${beforeMB} MB`);
  console.log(`Total size after (optimized WebP): ${afterMB} MB (${reduction}% reduction)`);
}

main()
  .catch((err) => {
    console.error('Image migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
