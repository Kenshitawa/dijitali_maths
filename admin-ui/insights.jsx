import { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RiBarChartBoxLine,
  RiDatabase2Line,
  RiLineChartLine,
  RiPieChartLine,
  RiTimeLine,
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { cx } from '@/utils/cx';

/* -------------------------------------------------------------------------- */
/* Shared data helpers                                                        */
/* -------------------------------------------------------------------------- */

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
];

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--color-border-button-default)',
  background: 'var(--color-background-primary-default)',
  color: 'var(--color-text-primary)',
  fontSize: 11,
  boxShadow: 'var(--shadow-lg)',
};

function countBy(items, pick, fallback = 'Unknown') {
  const map = new Map();
  items.forEach((item) => {
    const raw = pick(item);
    const key = (raw == null || raw === '' ? fallback : String(raw)).trim() || fallback;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function monthSeries(items, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString('en', { month: 'short' }),
      value: 0,
    });
  }
  const index = new Map(buckets.map((bucket, position) => [bucket.key, position]));
  items.forEach((item) => {
    if (!item.createdAt) return;
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const position = index.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (position !== undefined) buckets[position].value += 1;
  });
  return buckets;
}

function daySeries(items, days = 7) {
  const now = new Date();
  const buckets = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    buckets.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleString('en', { weekday: 'short' }),
      value: 0,
    });
  }
  const index = new Map(buckets.map((bucket, position) => [bucket.key, position]));
  items.forEach((item) => {
    if (!item.createdAt) return;
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const position = index.get(date.toISOString().slice(0, 10));
    if (position !== undefined) buckets[position].value += 1;
  });
  return buckets;
}

const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);

/* -------------------------------------------------------------------------- */
/* Presentation                                                               */
/* -------------------------------------------------------------------------- */

function StatTile({ icon: Icon, label, value, hint, accent = 0, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-w-0 items-center gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${COLORS[accent % COLORS.length]} 16%, transparent)`, color: COLORS[accent % COLORS.length] }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-caption-1-regular text-text-tertiary">{label}</span>
        <span className="block truncate text-title-3-semibold text-text-primary">{value}</span>
        {hint ? <span className="block truncate text-caption-2-medium text-text-tertiary">{hint}</span> : null}
      </span>
    </motion.div>
  );
}

function Card({ title, subtitle, children, className }) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-body-2-semibold text-text-primary">{title}</h3>
          {subtitle ? <p className="truncate text-caption-1-regular text-text-tertiary">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Distribution({ data, total, emptyLabel = 'Nothing recorded yet' }) {
  if (!data.length) return <Empty label={emptyLabel} />;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[132px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              stroke="none"
              isAnimationActive
              animationDuration={700}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-title-3-semibold text-text-primary">{total}</span>
          <span className="text-caption-2-medium text-text-tertiary">total</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {data.slice(0, 5).map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-body-2-regular">
            <span className="size-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate capitalize text-text-secondary">{entry.name}</span>
            <span className="shrink-0 text-body-2-semibold text-text-primary">{entry.value}</span>
            <span className="w-9 shrink-0 text-end text-caption-2-medium text-text-tertiary">{pct(entry.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Trend({ data, color = COLORS[0], label = 'Records' }) {
  const gradientId = `insight-grad-${useId().replace(/[:]/g, '')}`;
  const empty = data.every((point) => !point.value);
  if (empty) return <Empty label="No activity in this period yet" />;
  return (
    <div className="h-40 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, label]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Rank({ data, color = COLORS[1], emptyLabel = 'Nothing recorded yet' }) {
  if (!data.length) return <Empty label={emptyLabel} />;
  const top = data.slice(0, 5);
  const max = Math.max(1, ...top.map((entry) => entry.value));
  return (
    <div className="flex flex-col gap-2.5 py-1">
      {top.map((entry, index) => (
        <div key={entry.name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-body-2-regular">
            <span className="min-w-0 truncate capitalize text-text-secondary">{entry.name}</span>
            <span className="shrink-0 text-body-2-semibold text-text-primary">{entry.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, (entry.value / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: index === 0 ? color : `color-mix(in oklab, ${color} 45%, var(--color-background-tertiary-default))` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBars({ data, color = COLORS[0] }) {
  if (!data.length || data.every((point) => !point.value)) {
    return <Empty label="Nothing recorded yet" />;
  }
  return (
    <div className="h-40 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-background-secondary-hover)' }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl bg-background-secondary-default/60 px-4 text-center text-caption-1-regular text-text-tertiary">
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page configuration                                                         */
/* -------------------------------------------------------------------------- */

function buildConfig(tab, items, extra) {
  const total = items.length;

  if (tab === 'subscribers') {
    const status = countBy(items, (item) => item.status);
    const confirmed = items.filter((item) => item.status === 'confirmed').length;
    const thisMonth = monthSeries(items, 1)[0].value;
    return {
      summary: 'How the newsletter audience is growing',
      stats: [
        { label: 'Subscribers', value: total, hint: 'All records' },
        { label: 'Confirmed', value: confirmed, hint: `${pct(confirmed, total)}% of list` },
        { label: 'New this month', value: thisMonth, hint: 'Signups in 30 days' },
        { label: 'Opted out', value: total - confirmed, hint: 'Pending or left' },
      ],
      donut: { title: 'Subscription status', data: status },
      secondary: { type: 'trend', title: 'Signups over time', subtitle: 'Last six months', data: monthSeries(items) },
    };
  }

  if (tab === 'programs') {
    const status = countBy(items, (item) => item.status);
    const categories = countBy(items, (item) => item.categoryLabel || item.category);
    return {
      summary: 'Programme catalogue at a glance',
      stats: [
        { label: 'Programs', value: total, hint: 'In the catalogue' },
        { label: 'Published', value: items.filter((item) => item.status === 'published').length, hint: 'Visible publicly' },
        { label: 'Drafts', value: items.filter((item) => item.status !== 'published').length, hint: 'Still in progress' },
        { label: 'Categories', value: categories.length, hint: 'Distinct themes' },
      ],
      donut: { title: 'Publishing status', data: status },
      secondary: { type: 'rank', title: 'Programs by category', subtitle: 'Where the catalogue is strongest', data: categories },
    };
  }

  if (tab === 'events') {
    const status = countBy(items, (item) => item.status);
    const categories = countBy(items, (item) => item.category);
    return {
      summary: 'What is happening across the community',
      stats: [
        { label: 'Events', value: total, hint: 'On the calendar' },
        { label: 'Published', value: items.filter((item) => item.status === 'published').length, hint: 'Open for sign-ups' },
        { label: 'Drafts', value: items.filter((item) => item.status !== 'published').length, hint: 'Being prepared' },
        { label: 'Formats', value: categories.length, hint: 'Festivals, camps…' },
      ],
      donut: { title: 'Event status', data: status },
      secondary: { type: 'rank', title: 'Events by format', subtitle: 'Where the calendar is busiest', data: categories },
    };
  }

  if (tab === 'posts') {
    const status = countBy(items, (item) => item.status);
    const authors = countBy(items, (item) => item.authorName, 'Unassigned');
    return {
      summary: 'Stories and updates from the team',
      stats: [
        { label: 'Posts', value: total, hint: 'All stories' },
        { label: 'Published', value: items.filter((item) => item.status === 'published').length, hint: 'Live on the site' },
        { label: 'Drafts', value: items.filter((item) => item.status !== 'published').length, hint: 'Not published' },
        { label: 'Authors', value: authors.length, hint: 'Contributors' },
      ],
      donut: { title: 'Post status', data: status },
      secondary: { type: 'rank', title: 'Posts by author', subtitle: 'Who is writing the stories', data: authors },
    };
  }

  if (tab === 'videos') {
    const status = countBy(items, (item) => item.status);
    const source = countBy(items, (item) => (item.videoUrl ? 'Uploaded' : 'YouTube'));
    return {
      summary: 'The video library in numbers',
      stats: [
        { label: 'Videos', value: total, hint: 'In the library' },
        { label: 'Published', value: items.filter((item) => item.status === 'published').length, hint: 'Live on the site' },
        { label: 'Drafts', value: items.filter((item) => item.status !== 'published').length, hint: 'Waiting' },
        { label: 'Sources', value: source.length, hint: 'Hosting types' },
      ],
      donut: { title: 'Video source', data: source },
      secondary: { type: 'rank', title: 'Videos by status', subtitle: 'Publishing overview', data: status },
    };
  }

  if (tab === 'images') {
    const categories = countBy(items, (item) => item.category);
    const storage = items.reduce((sum, item) => sum + (Number(item.sizeBytes) || 0), 0);
    const megabytes = Math.max(0.1, storage / (1024 * 1024));
    const series = monthSeries(items);
    return {
      summary: 'Media library and upload rhythm',
      stats: [
        { label: 'Images', value: total, hint: 'In the library' },
        { label: 'Collections', value: categories.length, hint: 'Categories' },
        { label: 'Storage', value: `${megabytes.toFixed(1)} MB`, hint: 'Total media size' },
        { label: 'Uploaded', value: series[series.length - 1].value, hint: 'This month' },
      ],
      donut: { title: 'Images by collection', data: categories },
      secondary: { type: 'trend', title: 'Uploads over time', subtitle: 'Last six months', data: series, label: 'Uploads' },
    };
  }

  if (tab === 'users') {
    const roles = countBy(items, (item) => item.role);
    const active = items.filter((item) => item.isActive).length;
    return {
      summary: 'Who can access the admin portal',
      stats: [
        { label: 'Users', value: total, hint: 'Team accounts' },
        { label: 'Active', value: active, hint: 'Can sign in' },
        { label: 'Admins', value: items.filter((item) => item.role === 'admin').length, hint: 'Full access' },
        { label: 'Viewers', value: items.filter((item) => item.role === 'viewer').length, hint: 'Read only' },
      ],
      donut: { title: 'Roles', data: roles },
      secondary: {
        type: 'rank',
        title: 'Account status',
        subtitle: 'Active versus pending',
        data: [
          { name: 'Active', value: active },
          { name: 'Inactive', value: total - active },
        ],
      },
    };
  }

  if (tab === 'settings') {
    const payments = extra?.payments || [];
    const history = extra?.history || [];
    const status = countBy(payments, (item) => item.status);
    const completed = payments.filter((item) => item.status === 'completed');
    const raised = completed.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const byUser = countBy(history, (item) => item.changedBy, 'System');
    return {
      summary: 'Site configuration, donations and change history',
      stats: [
        { label: 'Donations', value: `KES ${raised.toLocaleString('en-KE')}`, hint: 'Completed payments' },
        { label: 'Payments', value: payments.length, hint: `${completed.length} completed` },
        { label: 'Setting changes', value: history.length, hint: 'Recorded edits' },
        { label: 'STK push', value: extra?.settings?.mpesaStkEnabled ? 'Ready' : 'Setup', hint: 'M-Pesa Express' },
      ],
      donut: { title: 'Payment status', data: status },
      secondary: { type: 'rank', title: 'Changes by team member', subtitle: 'Who updates the site', data: byUser },
    };
  }

  if (tab === 'audit') {
    const actions = countBy(items, (item) => item.action);
    const users = countBy(items, (item) => item.userEmail);
    const today = new Date().toISOString().slice(0, 10);
    return {
      summary: 'Every action taken inside the portal',
      stats: [
        { label: 'Audit entries', value: total, hint: 'All time' },
        { label: 'Team members', value: users.length, hint: 'Recorded actors' },
        { label: 'Action types', value: actions.length, hint: 'Distinct events' },
        { label: 'Today', value: items.filter((item) => String(item.createdAt || '').slice(0, 10) === today).length, hint: 'Newest first' },
      ],
      donut: { title: 'Most frequent actions', data: actions.slice(0, 5) },
      secondary: { type: 'bars', title: 'Activity this week', subtitle: 'Entries per day', data: daySeries(items) },
    };
  }

  const status = countBy(items, (item) => item.status || 'records');
  return {
    summary: 'A quick read on this page',
    stats: [
      { label: 'Records', value: total, hint: 'Total' },
      { label: 'Published', value: items.filter((item) => item.status === 'published').length, hint: 'Live' },
      { label: 'Drafts', value: items.filter((item) => item.status === 'draft').length, hint: 'Pending' },
      { label: 'Statuses', value: status.length, hint: 'Distinct' },
    ],
    donut: { title: 'Distribution', data: status },
    secondary: { type: 'trend', title: 'Activity', subtitle: 'Recent period', data: monthSeries(items) },
  };
}

const STAT_ICONS = [RiLineChartLine, RiBarChartBoxLine, RiPieChartLine, RiTimeLine, RiDatabase2Line];

/* -------------------------------------------------------------------------- */
/* Public component                                                           */
/* -------------------------------------------------------------------------- */

export function PageInsights({ tab, items = [], extra }) {
  const config = useMemo(() => buildConfig(tab, items, extra), [tab, items, extra]);
  const secondary = config.secondary;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-headline-semibold text-text-primary">Page overview</h2>
          <Chip variant="caption" color="soft">{config.summary}</Chip>
        </div>
        <span className="flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-1 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-chart-1" />
          </span>
          Live data
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {config.stats.map((stat, index) => (
          <StatTile
            key={stat.label}
            icon={STAT_ICONS[index % STAT_ICONS.length]}
            label={stat.label}
            value={String(stat.value)}
            hint={stat.hint}
            accent={index}
            delay={index * 0.05}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card title={config.donut.title} subtitle="Share of records" className="h-full">
            <Distribution data={config.donut.data} total={config.donut.data.reduce((sum, entry) => sum + entry.value, 0)} />
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}>
          <Card title={secondary.title} subtitle={secondary.subtitle} className="h-full">
            {secondary.type === 'trend' ? (
              <Trend data={secondary.data} label={secondary.label} color={COLORS[0]} />
            ) : secondary.type === 'bars' ? (
              <MiniBars data={secondary.data} color={COLORS[3]} />
            ) : (
              <Rank data={secondary.data} color={COLORS[1]} />
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
