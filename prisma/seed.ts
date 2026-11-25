import { prisma } from '../src/lib/prisma.js';

const SITE_SETTINGS: Record<string, unknown> = {
  organizationName: 'Dijitali Maths',
  tagline: 'Every learner can do maths. Sometimes they just need the right way in.',
  mission:
    'To make mathematics more engaging, understandable and accessible by creating learner-centred experiences that help every child build mathematical understanding, confidence and curiosity.',
  vision: 'A world where every learner sees themselves as capable of learning and using mathematics.',
  contactEmail: 'dijitalimaths@gmail.com',
  contactPhone: '+254 714 447 988',
  contactPhoneLocal: '0714 447 988',
  whatsappUrl: 'https://wa.me/254714447988',
  location: 'Nairobi & Nakuru, Kenya',
  youtubeUrl: 'https://youtube.com/@dijitalimaths?si=-RbmJ3vv2A-oe-WW',
  youtubeEmbedUrl:
    'https://www.youtube.com/embed?listType=user_uploads&list=dijitalimaths&autoplay=1&mute=1&loop=1&enablejsapi=1',
  linkedinUrl: 'https://www.linkedin.com/in/brenda-atieno-380b80185',
  mpesaPaybill: '174379',
  mpesaAccountName: 'Dijitali Maths',
  donationAmounts: '500,1000,2500,5000,10000',
  bankName: 'Equity Bank Kenya',
  bankAccountName: 'Dijitali Maths',
  bankAccountNumber: '0770297986368',
  bankBranch: 'Nairobi, Kenya',
  impactStats: [
    {
      target: 1000,
      suffix: '+',
      label: 'Learners Engaged',
      subtext: 'Active participants across Nairobi & Nakuru Counties',
    },
    {
      target: 400,
      suffix: '+',
      label: 'Teachers Reached',
      subtext: 'Empowered with practical low-cost teaching aids in 1 year',
    },
    {
      target: 2,
      suffix: '',
      label: 'Counties in Kenya',
      subtext: 'Expanding reach in Nairobi and Nakuru',
    },
  ],
  teamMembers: [
    {
      name: 'Brenda Atieno Odhiambo',
      role: 'Founder & Executive Director',
      bio: 'Kenyan mathematics educator and learning designer dedicated to making math accessible to every child.',
      imageUrl: '/images/Brenda.png',
    },
    {
      name: 'Violet Mboya',
      role: 'Learning Innovation Lead',
      bio: 'Pioneering creative math manipulatives, game-based learning experiences, and curriculum design.',
      imageUrl: '/images/violet%20mboya.png',
    },
    {
      name: 'Sharon Gituma',
      role: 'Operations & Community Lead',
      bio: 'Driving volunteer mobilization, school outreach, and seamless grassroots community engagement.',
      imageUrl: '/images/sharon%20gituma.png',
    },
    {
      name: 'Steve Okoth',
      role: 'Programs Lead',
      bio: 'Leading math club operations, holiday bootcamps, and learner enrichment challenges across Kenya.',
      imageUrl: '/images/stephen%20okoth.png',
    },
  ],
  strategicPartners: [
    {
      name: 'Teach For Kenya',
      description: 'Classroom implementation, educator network & leadership development.',
      imageUrl: '/images/teach%20for%20kenya.png',
    },
    {
      name: 'Ishara Digital',
      description: 'Leadership development, mentorship & innovation support.',
      imageUrl: '/images/ishara%20digital%20afrique.png',
    },
    {
      name: 'Resourceful Schools',
      description: 'Resources, curriculum and implementation partner.',
      imageUrl: '/images/resources.png',
    },
    {
      name: 'Stem Impact Center Kenya',
      description: 'Coding training, technology, and community partnership.',
      imageUrl: '/images/stem%20impact%20kenya.png',
    },
  ],
};

const PROGRAMS = [
  {
    slug: 'learner-sessions-holiday-programmes',
    title: 'Learner Sessions & Holiday Programmes',
    categoryLabel: 'Programme Area A • Core Offering',
    summary:
      'Structured mathematics sessions packed with physical game-based activities, collaborative problem-solving, and tablet-supported digital learning.',
    description:
      'Structured mathematics experiences designed to help children build lasting confidence and intuitive conceptual understanding. Sessions blend physical game-based activities with interactive digital tablet learning.',
    tags: ['Mathematics Games', 'Hands-on Manipulatives', 'Digital Tablet Learning', 'Collaborative Challenges'],
    imageUrl: '/images/dijitali_hero.jpg',
    featured: true,
    sortOrder: 1,
    status: 'published',
  },
  {
    slug: 'mathematics-challenges-enrichment',
    title: 'Mathematics Challenges & Enrichment',
    categoryLabel: 'Programme Area B • Enrichment',
    summary:
      'Enrichment activities allowing learners to stretch their mathematical thinking through pattern discovery, binary necklaces, and creative reasoning.',
    description:
      'Enrichment activities allowing learners to stretch mathematical thinking far beyond routine classroom drills. We emphasize mathematical communication, pattern discovery, creative problem solving, and collaborative reasoning. Signature Activity: The Binary Code Necklace Activity, where students translate letters into 8-bit binary numbers using colored beads.',
    tags: ['Logical Reasoning', 'Creative Mathematics', 'Independent Thinking', 'Binary & Patterns'],
    imageUrl: '/images/binary_code_activity.jpg',
    featured: true,
    sortOrder: 2,
    status: 'published',
  },
  {
    slug: 'teacher-workshops-practical-support',
    title: 'Teacher Workshops & Practical Support',
    categoryLabel: 'Programme Area D • Educators',
    summary:
      'Equipping educators with practical skills to make mathematics accessible, such as creating reusable manipulatives from hand-painted counting cups.',
    description:
      'Dijitali works directly with teachers to explore practical, enjoyable, and low-cost ways of making mathematics accessible. We demonstrate how teachers can construct reusable mathematical tools from locally sourced materials, build games-based classroom routines, and adapt instruction for diverse learning styles.',
    tags: ['PD Workshops', 'Counting Cups', 'Pedagogy', 'Low-Cost Aids'],
    imageUrl: '/images/teacher_workshop.jpg',
    featured: true,
    sortOrder: 3,
    status: 'published',
  },
  {
    slug: 'community-mathematics-festivals',
    title: 'Community Mathematics Activities & Festivals',
    categoryLabel: 'Programme Area E • Community',
    summary:
      'Joyful outdoor festivals, math stations, family challenges, and school showcase events bringing learners, families, and educators together.',
    description:
      'We bring learners, families, educators, and community partners together around mathematics through joyful outdoor festivals, math stations, family challenges, and school showcase events featuring giant floor tangram puzzles, relay math races, and geometry discovery tents.',
    tags: ['Community Maths Days', 'Giant Tangrams', 'Family Challenges'],
    imageUrl: '/images/community_math_fest.jpg',
    featured: false,
    sortOrder: 4,
    status: 'published',
  },
  {
    slug: 'dijitali-mathematics-clubs',
    title: 'Dijitali Mathematics Clubs',
    categoryLabel: 'Emerging Programme • In Development',
    summary:
      'Dedicated after-school and community mathematics club formats piloted with partner schools in Nairobi and Nakuru.',
    description:
      'Dijitali is currently piloting and experimenting with dedicated after-school and community mathematics club formats. In these clubs, learners regularly engage with mathematics through games, peer projects, recurring challenges, and collaborative activities.',
    tags: ['After-School Clubs', 'Peer Projects', 'Nairobi & Nakuru Pilot'],
    imageUrl: '/images/8.jpg',
    featured: false,
    sortOrder: 5,
    status: 'published',
  },
];

const EVENTS = [
  {
    slug: 'nakuru-community-maths-fest',
    title: 'Nakuru Community Maths Fest',
    category: 'festival',
    eventDateLabel: '18 Oct',
    location: 'Nakuru County Grounds, Nakuru',
    audience: 'Learners, Families & Educators',
    schedule: '9:00 AM – 4:00 PM',
    description:
      'An outdoor festival packed with giant tangrams, math obstacle relays, puzzle stations, and hands-on resource creation booths for parents and kids.',
    imageUrl: '/images/community_math_fest.jpg',
    registrationEnabled: true,
    status: 'published',
  },
  {
    slug: 'dijitali-holiday-maths-discovery-bootcamp',
    title: 'Dijitali Holiday Maths Discovery Bootcamp',
    category: 'camp',
    eventDateLabel: '04 Nov',
    location: 'Kayole 1 Comprehensive School, Nairobi',
    audience: 'Primary & Junior Secondary Learners (Ages 8–15)',
    schedule: '5-Day Intensive (Mon–Fri)',
    description:
      'A 5-day holiday experience exploring mathematics games, digital tablet quests, and binary code craft activities in a supportive environment.',
    imageUrl: '/images/1.jpg',
    registrationEnabled: true,
    status: 'published',
  },
  {
    slug: 'hands-on-low-cost-math-aids-workshop',
    title: 'Hands-On Low-Cost Math Aids Workshop',
    category: 'workshop',
    eventDateLabel: '22 Nov',
    location: 'Nairobi Teacher Training Resource Center',
    audience: 'Mathematics Teachers & School Heads',
    schedule: '10:00 AM – 2:30 PM',
    description:
      'Practical session where teachers construct reusable classroom aids (such as painted counting cups and geometric manipulatives) from low-cost materials.',
    imageUrl: '/images/teacher_workshop.jpg',
    registrationEnabled: true,
    status: 'published',
  },
  {
    slug: 'webinar-overcoming-math-anxiety',
    title: 'Webinar: Overcoming Math Anxiety in the Classroom',
    category: 'webinar',
    eventDateLabel: '06 Dec',
    location: 'Live Online (Zoom)',
    audience: 'Teachers, Parents & Education Stakeholders',
    schedule: '6:00 PM – 7:30 PM EAT',
    description:
      'Founder Brenda Atieno shares strategies on shifting mindset from "I\'m not a maths person" to curiosity and resilience through learner-centred instruction.',
    imageUrl: '/images/founder_brenda.jpg',
    registrationEnabled: true,
    status: 'published',
  },
];

const VIDEOS = [
  {
    title: 'Binary Code Necklace Making',
    category: 'Learner Session',
    description:
      'Watch Grade 6 learners decipher binary code and build decorative necklaces to master powers of two.',
    youtubeUrl: 'https://youtube.com/@dijitalimaths?si=-RbmJ3vv2A-oe-WW',
    thumbnailUrl: '/images/binary_code_activity.jpg',
    sortOrder: 1,
    status: 'published',
  },
  {
    title: 'Crafting Reusable Counting Cups',
    category: 'Teacher PD',
    description:
      'Nakuru teachers demonstrate how hand-painted counting cups make fractions intuitive and tangible.',
    youtubeUrl: 'https://youtube.com/@dijitalimaths?si=-RbmJ3vv2A-oe-WW',
    thumbnailUrl: '/images/teacher_workshop.jpg',
    sortOrder: 2,
    status: 'published',
  },
  {
    title: 'Nakuru Community Maths Fest Highlights',
    category: 'Community Fest',
    description:
      'Outdoor math relays, giant floor puzzles, and family math challenges in Nakuru County.',
    youtubeUrl: 'https://youtube.com/@dijitalimaths?si=-RbmJ3vv2A-oe-WW',
    thumbnailUrl: '/images/community_math_fest.jpg',
    sortOrder: 3,
    status: 'published',
  },
];

const POSTS = [
  {
    slug: 'dijitali-maths-reaches-1000-learners-nairobi-nakuru',
    title: 'How Hands-On Learning Reached 1,000+ Learners Across Nairobi & Nakuru',
    excerpt:
      'From weekend sessions at Kayole 1 Comprehensive School to community maths festivals in Nakuru, see how games and low-cost manipulatives are dismantling math anxiety.',
    contentHtml:
      '<p>At Dijitali Maths, we believe learners do not all learn mathematics in the same way. Across Nairobi and Nakuru Counties, over <strong>1,000 learners</strong> and <strong>400 teachers</strong> have engaged with our three-step learning rhythm: <em>Discover, Practice, Believe</em>.</p><p>Using locally available materials such as hand-painted counting cups and binary bead crafts, teachers and learners are turning abstract formulas into tangible, joyful discovery.</p>',
    coverImageUrl: '/images/community_math_fest.jpg',
    authorName: 'Brenda Atieno Odhiambo',
    status: 'published',
    publishedAt: new Date('2026-09-15T09:00:00Z'),
  },
];

async function main() {
  await prisma.siteSetting.deleteMany({ where: { key: 'annualReportUrl' } });
  await prisma.post.deleteMany({ where: { slug: 'wecare-annual-report-2025-highlights' } });

  for (const [key, value] of Object.entries(SITE_SETTINGS)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { valueJson: JSON.stringify(value) },
      create: { key, valueJson: JSON.stringify(value), updatedBy: 'seed' },
    });
  }

  for (const prog of PROGRAMS) {
    const { tags, ...rest } = prog;
    await prisma.program.upsert({
      where: { slug: prog.slug },
      update: { ...rest, tagsJson: JSON.stringify(tags) },
      create: { ...rest, tagsJson: JSON.stringify(tags) },
    });
  }

  for (const ev of EVENTS) {
    await prisma.event.upsert({
      where: { slug: ev.slug },
      update: ev,
      create: ev,
    });
  }

  const existingVideos = await prisma.video.count();
  if (existingVideos === 0) {
    for (const v of VIDEOS) {
      await prisma.video.create({ data: v });
    }
  }

  for (const post of POSTS) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
  }

  console.log('Database seeded successfully with real Dijitali Maths content.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
