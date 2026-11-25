import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const publicDir = path.resolve('public');
  const files = (await fs.readdir(publicDir)).filter((f) => f.endsWith('.html'));
  const fileSet = new Set(files);

  let broken = 0;
  for (const file of files) {
    const html = await fs.readFile(path.join(publicDir, file), 'utf8');
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
    for (const href of hrefs) {
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href.startsWith('/api/') ||
        href === '/' ||
        href === '/admin'
      ) {
        continue;
      }
      const clean = href.replace(/^\//, '').split('#')[0].split('?')[0];
      if (!clean) continue;
      if (clean.endsWith('.html')) {
        if (!fileSet.has(clean)) {
          console.error(`Broken link in ${file}: ${href}`);
          broken++;
        }
      } else {
        const exists = await fs
          .access(path.resolve(clean))
          .then(() => true)
          .catch(() => fs.access(path.join(publicDir, clean)).then(() => true).catch(() => false));
        if (!exists) {
          console.error(`Missing asset in ${file}: ${href}`);
          broken++;
        }
      }
    }
  }

  if (broken > 0) {
    process.exit(1);
  }
  console.log(`Checked ${files.length} HTML files: 0 broken internal links.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
