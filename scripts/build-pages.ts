import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../src/config/env.js';

interface PageMeta {
  file: string;
  id: string;
  title: string;
  description: string;
  priority: string;
  changefreq: string;
}

const PAGES: PageMeta[] = [
  {
    file: 'index.html',
    id: 'home',
    title: 'Dijitali Maths — Transforming Mathematics Education in Kenya | Nairobi & Nakuru',
    description:
      'Dijitali Maths makes mathematics engaging, accessible, and practical for learners and teachers across Kenya through hands-on learning, math camps, binary bead crafts, and teacher workshops.',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    file: 'aboutus.html',
    id: 'aboutus',
    title: 'About Us — Dijitali Maths | Our Story, Mission & Approach',
    description:
      'Discover how Dijitali Maths was founded in Kenya to challenge the myth that some children are not maths people, creating learner-centred experiences through games, hands-on tools, and discovery.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    file: 'projects.html',
    id: 'projects',
    title: 'What We Do — Dijitali Maths | Programmes, Challenges & Workshops',
    description:
      'Explore Dijitali Maths offerings: Learner Sessions, Holiday Camps, Mathematics Challenges, Teacher Workshops with low-cost aids, and Community Maths Festivals.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    file: 'impact.html',
    id: 'impact',
    title: 'Our Impact — Dijitali Maths | Transforming Mathematical Confidence in Kenya',
    description:
      'Discover Dijitali Maths impact across Kenya: 1,000+ learners engaged, 400+ teachers trained across Nairobi and Nakuru Counties.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    file: 'events.html',
    id: 'events',
    title: 'Events & Festivals — Dijitali Maths | Math Camps & Teacher Workshops',
    description:
      'Discover upcoming Dijitali Maths events: Nakuru Maths Fest, Holiday Bootcamps, Teacher Resource Workshops, and Community Mathematics Festivals.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    file: 'photos.html',
    id: 'photos',
    title: 'Gallery — Dijitali Maths in Action',
    description:
      'Explore photos of Dijitali Maths in action: hands-on learner experiences, teacher workshops, community math festivals, and creative math projects in Kenya.',
    priority: '0.7',
    changefreq: 'weekly',
  },
  {
    file: 'videos.html',
    id: 'videos',
    title: 'Videos & Multimedia — Dijitali Maths',
    description:
      'Watch Dijitali Maths in action: video demonstrations, teacher workshops, learner activities, and community festivals across Kenya.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    file: 'volunteers.html',
    id: 'volunteers',
    title: 'Get Involved & Volunteer — Dijitali Maths',
    description:
      'Join the Dijitali Maths community: volunteer your skills in education, STEM, design, photography, or events. Discover pathways for parents, teachers, and partners.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    file: 'volunteersForm.html',
    id: 'volunteers-form',
    title: 'Volunteer Application Form — Dijitali Maths',
    description:
      'Apply to volunteer with Dijitali Maths in Kenya. Share your skills and passion to help learners discover that they can do math.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    file: 'donation.html',
    id: 'donation',
    title: 'Support Dijitali Maths - Make Maths Possible for Every Child',
    description:
      'Help more learners discover that they can do mathematics. Donate, sponsor, or partner with Dijitali Maths to support learning materials and math innovation in Kenya.',
    priority: '0.9',
    changefreq: 'monthly',
  },
  {
    file: 'contactus.html',
    id: 'contactus',
    title: 'Contact Us — Dijitali Maths | Nairobi, Kenya',
    description:
      'Get in touch with Dijitali Maths in Nairobi, Kenya. Contact us for school partnerships, learner sessions, volunteering, or general inquiries.',
    priority: '0.9',
    changefreq: 'monthly',
  },
  {
    file: 'privacy.html',
    id: 'privacy',
    title: 'Privacy Policy — Dijitali Maths',
    description:
      'Privacy Policy for Dijitali Maths. Learn how we safeguard data for learners, parents, educators, and volunteers in Kenya.',
    priority: '0.3',
    changefreq: 'yearly',
  },
];

async function main() {
  const partialsDir = path.resolve('src/views/partials');
  const pagesDir = path.resolve('src/views/pages');
  const outDir = path.resolve('public');

  await fs.mkdir(outDir, { recursive: true });

  const [head, header, footer, widgets] = await Promise.all([
    fs.readFile(path.join(partialsDir, 'head.html'), 'utf8'),
    fs.readFile(path.join(partialsDir, 'header.html'), 'utf8'),
    fs.readFile(path.join(partialsDir, 'footer.html'), 'utf8'),
    fs.readFile(path.join(partialsDir, 'widgets.html'), 'utf8'),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const sitemapUrls: string[] = [];

  for (const page of PAGES) {
    const body = await fs.readFile(path.join(pagesDir, page.file), 'utf8');
    const canonical =
      page.file === 'index.html' ? `${env.siteUrl}/` : `${env.siteUrl}/${page.file}`;

    const renderedHead = head
      .replaceAll('{{TITLE}}', page.title)
      .replaceAll('{{DESCRIPTION}}', page.description)
      .replaceAll('{{CANONICAL}}', canonical);

    const renderedFooter = footer.replaceAll('{{PAGE_ID}}', page.id);

    const html = `${renderedHead}\n${header}\n${body}\n${renderedFooter}\n${widgets}`;
    await fs.writeFile(path.join(outDir, page.file), html, 'utf8');

    sitemapUrls.push(
      `  <url>\n    <loc>${canonical}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
    );
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');

  const robots = `User-agent: *\nAllow: /\n\nDisallow: /admin\nDisallow: /api/\nDisallow: /.git/\n\nSitemap: ${env.siteUrl}/sitemap.xml\n`;
  await fs.writeFile(path.join(outDir, 'robots.txt'), robots, 'utf8');

  console.log(`Built ${PAGES.length} public pages, sitemap.xml, and robots.txt in public/`);
}

main().catch((err) => {
  console.error('build-pages failed:', err);
  process.exit(1);
});
