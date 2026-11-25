import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RiArrowRightUpLine,
  RiBellLine,
  RiCalendarEventLine,
  RiCloseLine,
  RiDashboardLine,
  RiDownload2Line,
  RiEyeLine,
  RiEyeOffLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiGroupLine,
  RiImageLine,
  RiInboxLine,
  RiLineChartLine,
  RiLogoutBoxRLine,
  RiMailLine,
  RiMenuLine,
  RiMoonLine,
  RiNewspaperLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiSunLine,
  RiTeamLine,
  RiVideoLine,
} from '@remixicon/react';
import { motion, useReducedMotion } from 'motion/react';
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
import { Avatar } from '@/components/base/avatar/avatar';
import { Button } from '@/components/base/buttons/button';
import { Notification, NotificationViewport } from '@/components/base/notification/notification';
import { Chip } from '@/components/base/badges/chip';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/base/modal/modal';
import { Textarea } from '@/components/base/textarea/textarea';
import { OrdersChartCard } from '@/components/application/dashboard/orders-chart-card';
import { RevenueChartCard } from '@/components/application/dashboard/revenue-chart-card';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { Input } from '@/components/base/input/input';
import { ProgressBar } from '@/components/base/progress/progress';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import { cx } from '@/utils/cx';
import { PageInsights } from './insights';
import '@/styles/globals.css';

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */

function useAdminTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark') || localStorage.getItem('dm-admin-theme') === 'dark'
  );

  useEffect(() => {
    // The legacy page engine sets the initial theme after this module runs, so
    // keep React's icons in sync with the class it manages.
    const sync = () => setDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    sync();
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    localStorage.setItem('dm-admin-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    document.body.classList.toggle('dark-mode', next);
    setDark(next);
  };

  return [dark, toggleTheme];
}

function ThemeButton({ dark, onClick, className }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      iconOnly
      leadingIcon={dark ? RiSunLine : RiMoonLine}
      data-theme-toggle
      data-bui-theme
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      onClick={onClick}
      className={cx('rounded-full', className)}
    />
  );
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Something went wrong. Please try again.');
  return data;
}

const postJson = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  }).then(readResponse);

const adminRequest = async (url, options = {}) => {
  const state = window.adminBridge?.getState?.() || {};
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.csrfToken ? { 'X-CSRF-Token': state.csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
};

/* -------------------------------------------------------------------------- */
/* Sign-in screen                                                             */
/* -------------------------------------------------------------------------- */

const AUTH_COPY = {
  login: {
    eyebrow: 'Welcome to Dijitali Maths',
    title: 'Sign in to continue',
    description: 'Use the account provided by Dijitali Maths to access the admin portal.',
    cta: 'Sign in securely',
  },
  forgot: {
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    description: "Enter your email and we'll send you a secure link to choose a new password.",
    cta: 'Send reset link',
  },
  invite: {
    eyebrow: 'You are invited',
    title: 'Activate your account',
    description: 'Choose a password to finish setting up your Dijitali Maths admin account.',
    cta: 'Activate account',
  },
  reset: {
    eyebrow: 'Almost there',
    title: 'Choose a new password',
    description: 'Pick a strong password you have not used on this account before.',
    cta: 'Save new password',
  },
};

/* Sign-in uses a small local form instead of the BoardUI auth template. */

function AuthScreen() {
  const [dark, toggleTheme] = useAdminTheme();
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('inviteToken') ? 'invite' : params.get('resetToken') ? 'reset' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState('error');
  const [busy, setBusy] = useState(false);
  const copy = AUTH_COPY[mode];

  useEffect(() => {
    const onMessage = (event) => {
      setMode('login');
      setStatusKind('error');
      setStatus(event.detail);
    };
    window.addEventListener('admin:auth-message', onMessage);
    return () => window.removeEventListener('admin:auth-message', onMessage);
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setStatus('');
    try {
      if (mode === 'login') {
        const data = await postJson('/api/auth/login', {
          email: values.get('email'),
          password: values.get('password'),
        });
        window.adminBridge?.applySession(data);
      } else if (mode === 'forgot') {
        const data = await postJson('/api/auth/forgot-password', { email: values.get('email') });
        setStatusKind('success');
        setStatus(data.message || 'If the account exists, a reset link is on its way.');
      } else {
        const invite = mode === 'invite';
        const data = await postJson(invite ? '/api/auth/accept-invite' : '/api/auth/reset-password', {
          token: params.get(invite ? 'inviteToken' : 'resetToken'),
          password: values.get('password'),
        });
        setStatusKind('success');
        setStatus(data.message || 'Password saved. Please sign in.');
        window.history.replaceState({}, '', '/admin');
        setMode('login');
      }
    } catch (error) {
      setStatusKind('error');
      setStatus(error.message || 'Unable to continue. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="simple-login-page min-h-screen w-full bg-background-full text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-5 sm:py-6">
          <a href="/" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
            <img src="/images/logo.jpeg" alt="" className="size-11 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0">
              <span className="block truncate text-body-medium text-text-primary">Dijitali Maths</span>
              <span className="block text-caption-1-regular text-text-tertiary">Admin portal</span>
            </span>
          </a>
          <button type="button" className="simple-auth-theme" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? <RiSunLine aria-hidden /> : <RiMoonLine aria-hidden />}
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center py-8">
          <section className="simple-login-card w-full max-w-[440px] rounded-xl border border-border-button-default bg-background-primary-default p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
              <RiShieldCheckLine className="size-4 text-accent-600" aria-hidden />
              Secure staff access
            </div>

            <p className="inline-flex items-center gap-2 text-caption-1-semibold uppercase tracking-wider text-accent-600">
              <span className="size-1.5 rounded-full bg-accent-500" aria-hidden />
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-title-2-semibold text-text-primary">{copy.title}</h1>
            <p className="mt-2 text-body-2-regular text-text-secondary">{copy.description}</p>

            <form key={mode} id="loginForm" autoComplete="off" onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              {mode === 'login' || mode === 'forgot' ? (
                <label className="simple-auth-field">
                  <span>Email address</span>
                  <input id={mode === 'login' ? 'loginEmail' : undefined} name="email" type="email" placeholder="you@dijitalimaths.org" autoComplete="off" required />
                </label>
              ) : null}

              {mode === 'login' || mode === 'invite' || mode === 'reset' ? (
                <label className="simple-auth-field">
                  <span>Password</span>
                  <span className="simple-auth-password">
                    <input id={mode === 'login' ? 'loginPassword' : 'newPasswordInput'} name="password" type={showPassword ? 'text' : 'password'} placeholder={mode === 'login' ? 'Enter your password' : 'At least 12 characters'} autoComplete={mode === 'login' ? 'off' : 'new-password'} required />
                    <button type="button" data-password-toggle="loginPassword" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
                    </button>
                  </span>
                </label>
              ) : null}

              <p
                role="status"
                className={cx('simple-auth-status text-body-2-regular', statusKind === 'success' ? 'text-state-success-text' : 'text-text-error-primary')}
              >
                {status && statusKind === 'error' ? <RiErrorWarningLine className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                <span className="min-w-0 break-words">{status}</span>
              </p>

              <button type="submit" className="simple-auth-submit" disabled={busy}>
                {busy ? 'Please wait…' : copy.cta}
              </button>

              {mode === 'login' ? (
                <button
                  type="button"
                  id="showForgotBtn"
                  onClick={() => { setMode('forgot'); setStatus(''); }}
                  className="self-end text-body-2-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  Forgot password?
                </button>
              ) : null}

              {mode === 'forgot' ? (
                <button
                  type="button"
                  id="backToLoginBtn"
                  onClick={() => { setMode('login'); setStatus(''); }}
                  className="self-start text-body-2-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  Back to sign in
                </button>
              ) : null}
            </form>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-5 text-caption-1-regular text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <RiShieldCheckLine className="size-3.5" aria-hidden />
            Private staff access
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/" className="inline-flex items-center gap-1 hover:text-text-primary">Back to website</a>
            <a href="/privacy.html" className="inline-flex items-center gap-1 hover:text-text-primary">
              Privacy notice <RiArrowRightUpLine className="size-3" aria-hidden />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation inbox                                                         */
/* -------------------------------------------------------------------------- */

const INBOX_TABS = [
  ['contact', 'Contact'],
  ['volunteers', 'Volunteers'],
  ['partners', 'Partners'],
  ['events', 'Events'],
];

const STATUS_ORDER = ['new', 'read', 'replied', 'archived'];

function messageBody(item, type) {
  if (type === 'contact') return [item.enquiryType, item.message].filter(Boolean).join(' — ');
  if (type === 'volunteers') return [item.county, item.availability, item.skillsJson, item.motivation].filter(Boolean).join(' · ');
  if (type === 'partners') return [item.partnershipType, item.organization, item.amountLabel, item.message].filter(Boolean).join(' · ');
  return [item.eventTitle, item.roleType].filter(Boolean).join(' — ');
}

function senderMeta(item, type) {
  if (type === 'volunteers') {
    return [
      item.county ? { label: 'County', value: item.county } : null,
      item.availability ? { label: 'Availability', value: item.availability } : null,
      item.skillsJson ? { label: 'Skills', value: item.skillsJson } : null,
    ].filter(Boolean);
  }
  if (type === 'partners') {
    return [
      item.organization ? { label: 'Organisation', value: item.organization } : null,
      item.partnershipType ? { label: 'Partnership', value: item.partnershipType } : null,
      item.amountLabel ? { label: 'Support', value: item.amountLabel } : null,
    ].filter(Boolean);
  }
  if (type === 'events') {
    return [
      item.eventTitle ? { label: 'Event', value: item.eventTitle } : null,
      item.roleType ? { label: 'Role', value: item.roleType } : null,
    ].filter(Boolean);
  }
  return [
    item.enquiryType ? { label: 'Topic', value: item.enquiryType } : null,
    item.phone ? { label: 'Phone', value: item.phone } : null,
  ].filter(Boolean);
}

function StatusPill({ status }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption-2-semibold capitalize',
        status === 'new' && 'pill-new',
        status === 'read' && 'bg-background-tertiary-default text-text-secondary',
        status === 'replied' && 'bg-background-tertiary-default text-text-primary',
        status === 'archived' && 'bg-background-secondary-default text-text-tertiary'
      )}
    >
      <span
        className={cx(
          'size-1.5 rounded-full',
          status === 'new' && 'bg-accent-500',
          status === 'read' && 'bg-chart-4',
          status === 'replied' && 'bg-chart-2',
          status === 'archived' && 'bg-text-placeholder'
        )}
      />
      {status}
    </span>
  );
}

function InboxScreen() {
  const initial = window.adminBridge?.getState?.() || {};
  const [type, setType] = useState(initial.inboxType || 'contact');
  const [status, setStatus] = useState(initial.inboxStatus || 'all');
  const [query, setQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const messageEntrance = useEntrance(0);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminRequest(`/api/admin/inbox/${type}`);
      setAllItems(data.items || []);
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [type]);

  const items = allItems
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return JSON.stringify(item).toLowerCase().includes(term);
    });

  const counts = STATUS_ORDER.reduce((accumulator, key) => {
    accumulator[key] = allItems.filter((item) => item.status === key).length;
    return accumulator;
  }, {});

  const selected = items.find((item) => item.id === selectedId) || null;
  const notesParts = (selected?.notes || '').split(/\n(?=Reply: )/);
  const replies = notesParts.filter((part) => part.startsWith('Reply: ')).map((part) => part.slice(7));
  const internalNote = notesParts.filter((part) => !part.startsWith('Reply: ')).join('\n').trim();
  const meta = selected ? senderMeta(selected, type) : [];

  const updateStatus = async (next) => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/inbox/${type}/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      await load();
      setNotice(`Conversation marked as ${next}.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      await adminRequest(`/api/admin/inbox/${type}/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'replied',
          notes: [selected.notes || '', `Reply: ${reply.trim()}`].filter(Boolean).join('\n'),
        }),
      });
      setReply('');
      await load();
      setNotice('Reply saved and marked as replied.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const canEdit = ['admin', 'editor'].includes(
    window.adminBridge?.getState?.()?.user?.role || 'viewer'
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-background-secondary-default p-1">
          {INBOX_TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setType(key); setSelectedId(null); }}
              className={cx(
                'rounded-lg px-3 py-1.5 text-body-2-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                type === key
                  ? 'bg-background-primary-default text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Search messages"
            type="search"
            placeholder="Search name, email, message…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full sm:w-56"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-xl border border-border-button-default bg-background-primary-default px-3 text-body-2-medium capitalize text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Total', allItems.length, 'bg-chart-4'],
          ['New', counts.new, 'bg-chart-1'],
          ['Replied', counts.replied, 'bg-chart-2'],
          ['Archived', counts.archived, 'bg-chart-5'],
        ].map(([label, value, tone]) => (
          <div key={label} className="flex items-center gap-2.5 rounded-2xl border border-border-button-default bg-background-primary-default px-3 py-2 shadow-xs">
            <span className={cx('size-2 rounded-full', tone)} aria-hidden />
            <span className="min-w-0">
              <span className="block text-caption-2-medium uppercase tracking-wider text-text-tertiary">{label}</span>
              <span className="block text-title-3-semibold text-text-primary">{value}</span>
            </span>
          </div>
        ))}
      </div>

      {notice ? (
        <p className="rounded-lg bg-background-secondary-default px-3 py-1.5 text-body-2-regular text-text-secondary">{notice}</p>
      ) : null}

      <div className="inbox-shell grid min-h-[560px] grid-cols-1 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xs lg:h-[calc(100vh-16rem)] lg:min-h-[560px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className={cx('flex min-h-0 flex-col border-e border-separator-border max-lg:border-e-0', selected && 'max-lg:hidden')}>
          <div className="flex items-center justify-between gap-2 border-b border-separator-border px-4 py-3">
            <div>
              <h3 className="text-body-2-semibold text-text-primary">Conversations</h3>
              <p className="text-caption-1-regular text-text-tertiary">
                {items.length} {items.length === 1 ? 'message' : 'messages'}{status !== 'all' ? ` · ${status}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-2-semibold uppercase tracking-wider text-text-secondary">
              {type}
            </span>
          </div>

          <div className="thread-list-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((key) => (
                  <div key={key} className="h-16 animate-pulse rounded-xl bg-background-secondary-default" />
                ))}
              </div>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-current={selected?.id === item.id ? 'true' : undefined}
                  className={cx(
                    'flex w-full items-center gap-3 border-b border-separator-border px-3.5 py-3 text-start transition-colors',
                    selected?.id === item.id
                      ? 'bg-background-secondary-default'
                      : 'hover:bg-background-secondary-hover'
                  )}
                >
                  <span className="relative shrink-0">
                    <Avatar size="md" color={item.status === 'new' ? 'lime' : 'neutral'} initials={(item.name || '?').slice(0, 1).toUpperCase()} />
                    {item.status === 'new' ? (
                      <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background-primary-default bg-accent-500" aria-label="Unread" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cx('inbox-client-name truncate text-body-2-semibold text-text-primary', item.status === 'new' && 'font-bold')}>{item.name}</span>
                      <span className="shrink-0 whitespace-nowrap text-caption-2-medium text-text-tertiary">
                        {new Date(item.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                          ? new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                          : new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-caption-1-regular text-text-tertiary">{item.email}</span>
                    <span className="mt-1 block truncate text-body-2-medium text-text-primary">{item.subject || item.topic || INBOX_TABS.find(([value]) => value === type)?.[1] || 'Message'}</span>
                    <span className="mt-0.5 block truncate text-caption-1-regular text-text-tertiary">{item.message || item.notes || item.email}</span>
                    <span className="mt-1.5 flex items-center gap-1.5"><StatusPill status={item.status} /></span>
                  </span>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <RiInboxLine className="size-8 text-foreground-icon-quaternary" aria-hidden />
                <p className="text-body-2-medium text-text-secondary">No conversations found</p>
                <p className="text-caption-1-regular text-text-tertiary">Try a different tab or clear the search.</p>
              </div>
            )}
          </div>
        </section>

        <section className={cx('flex min-h-0 flex-col bg-background-full', !selected && 'max-lg:hidden')}>
          {selected ? (
            <>
              <div className="border-b border-separator-border bg-background-primary-default px-4 py-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                    className="mt-0.5 rounded-lg p-1 text-foreground-icon-secondary hover:bg-background-secondary-hover lg:hidden"
                  >
                    <RiArrowLeftLine className="size-4" aria-hidden />
                  </button>
                  <Avatar size="lg" color="lime" initials={(selected.name || '?').slice(0, 1).toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="inbox-client-name truncate text-title-3-semibold text-text-primary">{selected.name}</h2>
                      <StatusPill status={selected.status} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption-1-regular text-text-tertiary">
                      <a href={`mailto:${selected.email}`} className="truncate hover:text-text-primary">{selected.email}</a>
                      {selected.phone ? <span>{selected.phone}</span> : null}
                      <span>{new Date(selected.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {canEdit ? (
                      <select
                        aria-label="Update conversation status"
                        value={selected.status}
                        disabled={busy}
                        onChange={(event) => updateStatus(event.target.value)}
                        className="hidden h-8 rounded-lg border border-border-button-default bg-background-primary-default px-2 text-caption-1-medium capitalize text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:block"
                      >
                        {STATUS_ORDER.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    ) : null}
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: Dijitali Maths')}`}
                      className="inline-flex h-8 min-w-max shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border-button-default px-2.5 text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover"
                    >
                      <RiMailLine className="size-3.5" aria-hidden /> Email
                    </a>
                  </div>
                </div>

                {meta.length ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-background-secondary-default px-3 py-2 sm:grid-cols-3">
                    {meta.map((row) => (
                      <div key={row.label} className="min-w-0">
                        <dt className="text-caption-2-medium uppercase tracking-wider text-text-tertiary">{row.label}</dt>
                        <dd className="truncate text-caption-1-medium capitalize text-text-primary">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              {canEdit ? (
                <div className="border-b border-separator-border bg-background-primary-default px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Thanks for reaching out — we’ll be in touch soon.',
                      'Could you share a little more detail?',
                      'Your application has been received.',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReply(preset)}
                        className="max-w-full rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-start text-caption-1-medium leading-snug text-text-secondary transition-colors hover:bg-background-tertiary-default hover:text-text-primary"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="conversation-thread min-h-0 flex-1 overflow-y-auto bg-background-full px-3 py-3 sm:px-5 sm:py-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-separator-border" />
                  <span className="rounded-full bg-background-secondary-default px-2.5 py-0.5 text-caption-2-medium text-text-tertiary">
                    {new Date(selected.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="h-px flex-1 bg-separator-border" />
                </div>

                <motion.div {...messageEntrance} className="flex max-w-[88%] flex-col gap-1 sm:max-w-[76%]">
                  <div className="flex items-end gap-2">
                    <Avatar size="sm" color="lime" initials={(selected.name || '?').slice(0, 1).toUpperCase()} />
                    <div className="message-bubble message-bubble-in rounded-[1.125rem] rounded-es-md border border-border-button-default bg-background-primary-default px-4 py-3 text-body-regular leading-relaxed text-text-primary shadow-xs">
                      {messageBody(selected, type)}
                    </div>
                  </div>
                  <span className="ps-8 text-caption-2-medium text-text-tertiary">
                    {selected.name} · {new Date(selected.createdAt).toLocaleTimeString()}
                  </span>
                </motion.div>

                {internalNote ? <aside className="internal-note-card mt-4 rounded-xl border border-dashed border-border-button-default bg-background-secondary-default px-4 py-3"><span className="text-caption-2-semibold uppercase tracking-wider text-text-tertiary">Internal, not sent</span><p className="mt-1 whitespace-pre-wrap break-words text-body-2-regular text-text-secondary">{internalNote}</p></aside> : null}

                {replies.map((text, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-3 flex max-w-[88%] flex-col gap-1 self-end ms-auto sm:max-w-[76%]"
                  >
                    <div className="flex items-end justify-end gap-2">
                      <div className="message-bubble message-bubble-out rounded-[1.125rem] rounded-ee-md bg-accent-600 px-4 py-3 text-body-regular leading-relaxed text-text-white shadow-sm">
                        {text}
                      </div>
                      <Avatar size="sm" color="lime" initials="You" />
                    </div>
                    <span className="pe-8 text-end text-caption-2-medium text-text-tertiary">You · Reply</span>
                  </motion.div>
                ))}
              </div>

              <div className="inbox-composer border-t border-separator-border bg-background-primary-default p-3">
                {canEdit ? null : null}
                <div className="composer-glow">
                  <div className="flex items-end gap-2 rounded-2xl bg-background-primary-default p-1.5">
                    <Textarea
                      aria-label="Write a reply"
                      placeholder={canEdit ? 'Write a reply…' : 'Read-only access'}
                      value={reply}
                      onChange={setReply}
                      isDisabled={!canEdit || busy}
                      rows={1}
                      maxRows={5}
                      autoResize
                      onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); sendReply(); } }}
                      className="flex-1"
                    />
                    <Button
                      size="small"
                      disabled={!canEdit || busy || !reply.trim()}
                      onClick={sendReply}
                      className="shrink-0"
                    >
                      {busy ? 'Sending…' : 'Send'}
                    </Button>
                  </div>
                </div>
                <p className="mt-1.5 text-caption-2-medium text-text-tertiary">
                  Replies are saved on this conversation and mark it as replied.
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-background-secondary-default">
                <RiInboxLine className="size-6 text-foreground-icon-quaternary" aria-hidden />
              </span>
              <p className="text-title-3-semibold text-text-primary">Choose a conversation</p>
              <p className="max-w-xs text-caption-1-regular text-text-tertiary">
                Pick a name from the list to read the full message and reply. Conversations are saved with the sender’s details.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

let inboxRoot = null;
let pageRoot = null;

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

function useEntrance(delay = 0) {
  const reduce = useReducedMotion();
  return reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
      };
}

function DashboardPage({ data }) {
  const counts = data?.counts || {};
  const [trend, setTrend] = useState([]);
  const [trendState, setTrendState] = useState('loading');
  const go = (tab) => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: tab }));

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch('/api/admin/visitors?days=30', { credentials: 'same-origin', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load visitor activity');
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        const timeline = result.timeline || [];
        const midpoint = Math.floor(timeline.length / 2);
        // Compare the recent half of the window with the half before it so the
        // delta chip reads as a real period-over-period change.
        setTrend(
          timeline.slice(midpoint).map((point, index) => ({
            label: String(point.date || '').slice(5),
            current: point.views,
            previous: timeline[index]?.views ?? 0,
          }))
        );
        setTrendState(timeline.length ? 'ready' : 'empty');
      })
      .catch(() => { if (active) setTrendState('error'); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const confirmedRate = counts.subscribers
    ? Math.round((counts.confirmedSubscribers / counts.subscribers) * 100)
    : 0;
  const newInbox =
    (counts.newVolunteers || 0) + (counts.newPartners || 0) + (counts.newEventRegistrations || 0);

  const stats = [
    {
      icon: RiMailLine,
      label: 'Unread messages',
      value: String(counts.unreadMessages ?? 0),
      delta: `${newInbox} new`,
      deltaColor: 'lime',
      tone: 'emerald',
      caption: 'Across all inbox types',
      hint: 'Contact, volunteer, partner and event messages that still need a reply.',
    },
    {
      icon: RiGroupLine,
      label: 'Subscribers',
      value: `${counts.confirmedSubscribers ?? 0} / ${counts.subscribers ?? 0}`,
      delta: `${confirmedRate}%`,
      deltaColor: 'lime',
      tone: 'sky',
      caption: 'Confirmed on the list',
      hint: 'Confirmed subscribers compared with every active newsletter record.',
    },
    {
      icon: RiLineChartLine,
      label: 'Visits this week',
      value: String(counts.visitorsWeek ?? 0),
      delta: `${counts.visitorsToday ?? 0} today`,
      deltaColor: 'neutral',
      tone: 'orange',
      caption: 'Pageviews in 7 days',
      hint: 'Total pageviews recorded this week, including today.',
    },
    {
      icon: RiNewspaperLine,
      label: 'Published pages',
      value: String(counts.publishedPages ?? 0),
      delta: `${counts.images ?? 0} photos`,
      deltaColor: 'neutral',
      tone: 'pink',
      caption: 'Programs, events & posts',
      hint: 'Live programs, events and posts on the public website.',
    },
  ];

  const name = (data?.name || 'there').split(' ')[0];

  const pipeline = [
    { name: 'Contact', value: counts.unreadMessages ?? 0, color: 'var(--color-chart-1)' },
    { name: 'Volunteers', value: counts.newVolunteers ?? 0, color: 'var(--color-chart-4)' },
    { name: 'Partners', value: counts.newPartners ?? 0, color: 'var(--color-chart-5)' },
    { name: 'Event sign-ups', value: counts.newEventRegistrations ?? 0, color: 'var(--color-chart-2)' },
  ];
  const pipelineTotal = pipeline.reduce((sum, entry) => sum + entry.value, 0);

  const reach = [
    { label: 'Today', value: counts.visitorsToday ?? 0 },
    { label: 'This week', value: counts.visitorsWeek ?? 0 },
    { label: 'This month', value: counts.visitorsMonth ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
            Dijitali Maths · Admin workspace
          </p>
          <h2 className="mt-0.5 text-title-2-semibold text-text-primary">Good to see you, {name}.</h2>
        </div>
        <span className="inline-flex items-center gap-2 text-caption-1-medium text-text-tertiary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-lime-400/60" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-lime-400" />
          </span>
          {counts.visitorsToday ?? 0} visits today
        </span>
      </div>

      <motion.div {...useEntrance(0.04)}>
        <StatCards variant="footer" stats={stats} columns={4} />
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <motion.section {...useEntrance(0.1)} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-body-medium text-text-primary">Inbox pipeline</h3>
              <p className="text-caption-1-regular text-text-tertiary">Messages waiting for a reply</p>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">{pipelineTotal} waiting</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative size-[140px] shrink-0">
              {pipelineTotal ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pipeline} dataKey="value" nameKey="name" innerRadius={46} outerRadius={68} paddingAngle={2} stroke="none" isAnimationActive animationDuration={800}>
                      {pipeline.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-title-3-semibold text-text-primary">{pipelineTotal}</span>
                <span className="text-caption-2-medium text-text-tertiary">waiting</span>
              </div>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {pipeline.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2 text-body-2-regular">
                  <span className="size-2 rounded-full" style={{ background: entry.color }} />
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{entry.name}</span>
                  <span className="text-body-2-semibold text-text-primary">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section {...useEntrance(0.14)} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-body-medium text-text-primary">Reach</h3>
              <p className="text-caption-1-regular text-text-tertiary">Pageviews across the public site</p>
            </div>
            <button
              type="button"
              onClick={() => go('visitors')}
              className="text-caption-1-medium text-text-secondary hover:text-text-primary"
            >
              Analyse →
            </button>
          </div>
          <div className="h-[160px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reach} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-background-secondary-hover)' }} />
                <Bar dataKey="value" name="Pageviews" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={54} isAnimationActive animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.div {...useEntrance(0.2)} className="min-w-0">
          {trendState === 'ready' ? (
            <RevenueChartCard
              data={trend}
              title="Visitor trend"
              formatValue={(value) => String(Math.round(value))}
              currentLabel="Recent period"
              previousLabel="Earlier period"
              previousCaption="in the earlier period"
            />
          ) : (
            <div role={trendState === 'error' ? 'alert' : 'status'} className="flex h-72 flex-col items-center justify-center gap-2 rounded-3xl border border-border-button-default bg-background-primary-default px-6 text-center text-body-2-regular text-text-tertiary">
              {trendState === 'loading' ? <><span className="h-3 w-48 animate-pulse rounded-full bg-background-secondary-default" /><span className="h-3 w-32 animate-pulse rounded-full bg-background-secondary-default" /><span>Loading visitor trend…</span></> : null}
              {trendState === 'empty' ? 'No visitor trend data is available yet.' : null}
              {trendState === 'error' ? 'Visitor activity could not be loaded. Refresh to try again.' : null}
            </div>
          )}
        </motion.div>
        <motion.div {...useEntrance(0.24)} className="min-w-0">
          {trendState === 'ready' ? (
            <OrdersChartCard
              data={trend}
              title="Daily engagement"
              currentLabel="Recent period"
              previousLabel="Earlier period"
              previousCaption="in the earlier period"
              className="h-full"
            />
          ) : (
            <div role={trendState === 'error' ? 'alert' : 'status'} className="flex h-72 items-center justify-center rounded-3xl border border-border-button-default bg-background-primary-default px-6 text-center text-body-2-regular text-text-tertiary">
              {trendState === 'loading' ? 'Loading daily activity…' : trendState === 'empty' ? 'No daily activity data is available yet.' : 'Daily activity could not be loaded.'}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

let dashboardRoot = null;

/* -------------------------------------------------------------------------- */
/* Visitor analytics charts                                                   */
/* -------------------------------------------------------------------------- */

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--color-border-button-default)',
  background: 'var(--color-background-primary-default)',
  color: 'var(--color-text-primary)',
  fontSize: 12,
  boxShadow: 'var(--shadow-lg)',
};

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
      <div>
        <h3 className="text-body-medium text-text-primary">{title}</h3>
        {subtitle ? <p className="text-caption-1-regular text-text-secondary">{subtitle}</p> : null}
      </div>
      <div className="h-64 w-full min-w-0">{children}</div>
    </section>
  );
}

function MiniChart({ title, color, data }) {
  return (
    <motion.section {...useEntrance(0.1)} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body-2-medium text-text-primary">{title}</h3>
        <span className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
          </span>
          Live
        </span>
      </div>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-background-secondary-hover)' }} />
            <Bar dataKey="count" name="Visits" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function VisitorCharts({ data }) {
  const timeline = (data?.timeline || []).map((point) => ({
    ...point,
    label: String(point.date || '').slice(5),
  }));
  const shorten = (name) => (name.length > 18 ? `${name.slice(0, 17)}…` : name);
  const topPages = (data?.topPages || []).slice(0, 6).map((page) => ({ name: shorten(page.name), count: page.count }));
  const devices = (data?.devices || []).slice(0, 6).map((item) => ({ name: shorten(item.name), count: item.count }));
  const browsers = (data?.browsers || []).slice(0, 6).map((item) => ({ name: shorten(item.name), count: item.count }));

  const [live, setLive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setLive((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div id="visitorBreakdownRoot" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniChart title="Top pages" color="var(--color-chart-1)" data={topPages} />
        <MiniChart title="Devices" color="var(--color-chart-4)" data={devices} />
        <MiniChart title="Browsers" color="var(--color-chart-5)" data={browsers} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Visits over time" subtitle="Pageviews and unique visitors · last 30 days · updates live">
          <ResponsiveContainer key={`area-${live}`} width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--color-text-secondary)' }} />
              <Area type="monotone" dataKey="views" name="Pageviews" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#visitsFill)" isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most visited pages" subtitle="Where visitors spend their time">
          <ResponsiveContainer key={`pages-${live}`} width="100%" height="100%">
            <BarChart data={topPages} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-background-secondary-hover)' }} />
              <Bar dataKey="count" name="Visits" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} maxBarSize={24} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

    </div>
  );
}

let visitorChartRoot = null;

/* -------------------------------------------------------------------------- */
/* Admin shell                                                                */
/* -------------------------------------------------------------------------- */

const navigation = [
  { key: 'dashboard', label: 'Dashboard', icon: RiDashboardLine, group: 'Overview', tone: 'chart-1' },
  { key: 'visitors', label: 'Visitors', icon: RiFileList3Line, group: 'Overview', tone: 'chart-2' },
  { key: 'audit', label: 'Audit log', icon: RiShieldCheckLine, group: 'Overview', adminOnly: true, tone: 'chart-5' },
  { key: 'inbox', label: 'Inbox', icon: RiMailLine, group: 'Community', tone: 'chart-4' },
  { key: 'subscribers', label: 'Subscribers', icon: RiGroupLine, group: 'Community' },
  { key: 'programs', label: 'Programs', icon: RiTeamLine, group: 'Content' },
  { key: 'events', label: 'Events', icon: RiCalendarEventLine, group: 'Content' },
  { key: 'posts', label: 'Posts', icon: RiNewspaperLine, group: 'Content' },
  { key: 'videos', label: 'Videos', icon: RiVideoLine, group: 'Content' },
  { key: 'images', label: 'Gallery', icon: RiImageLine, group: 'Content' },
  { key: 'users', label: 'Users & roles', icon: RiGroupLine, group: 'System', adminOnly: true },
  { key: 'settings', label: 'Site settings', icon: RiSettings3Line, group: 'System' },
];

const groups = ['Overview', 'Community', 'Content', 'System'];

function AdminApp() {
  const [tab, setTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [operation, setOperation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const lastUnread = useRef(null);
  const [dark, toggleTheme] = useAdminTheme();

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const check = async () => {
      const response = await fetch('/api/admin/dashboard', { credentials: 'same-origin' }).catch(() => null);
      if (!response?.ok || !active) return;
      const payload = await response.json().catch(() => null);
      const count = payload?.counts?.unreadMessages ?? 0;
      setUnread(count);
      // The first check only sets the baseline, so the toast appears when a
      // genuinely new message arrives during the session — not on every load.
      if (lastUnread.current !== null && count > lastUnread.current) {
        setToast({ id: Date.now(), count });
      }
      lastUnread.current = count;
    };
    const intro = window.setTimeout(check, 3500);
    const timer = window.setInterval(check, 45000);
    return () => {
      active = false;
      window.clearTimeout(intro);
      window.clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    const onUser = (event) => setUser(event.detail);
    const onNavigate = (event) => setTab(event.detail);
    const onProgress = (event) => setOperation(event.detail.active ? event.detail : null);
    // Any legacy table row opens a detail dialog, so every list page has a
    // full-record view without rewriting its data renderer.
    const onRowClick = (event) => {
      const row = event.target.closest?.('#adminContent table tbody tr');
      if (!row) return;
      if (event.target.closest?.('button, a, input, select, textarea, label')) return;
      const headers = Array.from(row.closest('table')?.querySelectorAll('thead th') || []).map((th) => th.textContent.trim());
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText.trim());
      if (!cells.length) return;
      const firstLines = cells[0].split('\n').map((line) => line.trim()).filter(Boolean);
      const rows = cells
        .map((value, index) => ({ label: headers[index] || `Field ${index + 1}`, value }))
        .filter((entry) => entry.value && entry.value !== 'Read-only' && !/^actions?$/i.test(entry.label));
      if (!rows.length) return;
      const status = rows.find((entry) => /^status$/i.test(entry.label))?.value
        || rows.find((entry) => /^role$/i.test(entry.label))?.value
        || '';
      setDetail({
        title: firstLines[0] || 'Record details',
        subtitle: firstLines.slice(1).join(' · '),
        breadcrumb: document.getElementById('pageTitle')?.textContent || 'Admin',
        status: status.split('\n')[0],
        rows,
      });
    };
    document.addEventListener('click', onRowClick);

    const onPageData = (event) => {
      const mount = document.getElementById('boardui-page-insights');
      if (!mount) return;
      if (pageRoot) {
        try { pageRoot.unmount(); } catch { /* already detached */ }
        pageRoot = null;
      }
      pageRoot = createRoot(mount);
      pageRoot.render(
        <DirectionProvider locale="en-US">
          <PageInsights tab={event.detail.tab} items={event.detail.items || []} extra={event.detail.extra} />
        </DirectionProvider>
      );
    };

    const onInbox = () => {
      const mount = document.getElementById('adminContent');
      if (!mount) return;
      if (inboxRoot) {
        try { inboxRoot.unmount(); } catch { /* already detached */ }
        inboxRoot = null;
      }
      const container = document.createElement('div');
      container.id = 'boardui-inbox-root';
      mount.replaceChildren(container);
      inboxRoot = createRoot(container);
      inboxRoot.render(
        <DirectionProvider locale="en-US">
          <InboxScreen />
        </DirectionProvider>
      );
    };
    const onDashboard = (event) => {
      const mount = document.getElementById('adminContent');
      if (!mount) return;
      // The page engine clears #adminContent on every tab load. Give React a
      // dedicated child so unmounting never fights with that replacement.
      if (dashboardRoot) {
        try { dashboardRoot.unmount(); } catch { /* already detached */ }
        dashboardRoot = null;
      }
      const container = document.createElement('div');
      container.id = 'boardui-dashboard-root';
      mount.replaceChildren(container);
      dashboardRoot = createRoot(container);
      dashboardRoot.render(
        <DirectionProvider locale="en-US">
          <DashboardPage data={event.detail} />
        </DirectionProvider>
      );
    };
    const onVisitors = (event) => {
      const mount = document.getElementById('visitorCharts');
      if (!mount) return;
      if (!visitorChartRoot) visitorChartRoot = createRoot(mount);
      visitorChartRoot.render(
        <DirectionProvider locale="en-US">
          <VisitorCharts data={event.detail} />
        </DirectionProvider>
      );
    };
    window.addEventListener('admin:user', onUser);
    window.addEventListener('admin:navigate', onNavigate);
    window.addEventListener('admin:progress', onProgress);
    window.addEventListener('admin:page-data', onPageData);
    window.addEventListener('admin:inbox-open', onInbox);
    window.addEventListener('admin:dashboard-data', onDashboard);
    window.addEventListener('admin:visitors-data', onVisitors);
    return () => {
      window.removeEventListener('admin:user', onUser);
      window.removeEventListener('admin:navigate', onNavigate);
      window.removeEventListener('admin:progress', onProgress);
      window.removeEventListener('admin:page-data', onPageData);
      document.removeEventListener('click', onRowClick);
      window.removeEventListener('admin:inbox-open', onInbox);
      window.removeEventListener('admin:dashboard-data', onDashboard);
      window.removeEventListener('admin:visitors-data', onVisitors);
      try { dashboardRoot?.unmount(); } catch { /* already detached */ }
      dashboardRoot = null;
      try { pageRoot?.unmount(); } catch { /* already detached */ }
      pageRoot = null;
      try { inboxRoot?.unmount(); } catch { /* already detached */ }
      inboxRoot = null;
      try { visitorChartRoot?.unmount(); } catch { /* already detached */ }
      visitorChartRoot = null;
    };
  }, []);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setDrawerOpen(false);
    setDetail(null);
    if (nextTab !== 'dashboard' && dashboardRoot) {
      try { dashboardRoot.unmount(); } catch { /* already detached */ }
      dashboardRoot = null;
    }
    if (nextTab !== 'inbox' && inboxRoot) {
      try { inboxRoot.unmount(); } catch { /* already detached */ }
      inboxRoot = null;
    }
    if (nextTab !== 'visitors' && visitorChartRoot) {
      try { visitorChartRoot.unmount(); } catch { /* already detached */ }
      visitorChartRoot = null;
    }
    if (pageRoot) {
      try { pageRoot.unmount(); } catch { /* already detached */ }
      pageRoot = null;
    }
    window.dispatchEvent(new CustomEvent('admin:navigate', { detail: nextTab }));
  };

  const signOut = async () => {
    await window.adminBridge?.signOut();
    setDrawerOpen(false);
    setConfirmSignOut(false);
  };

  return (
    <div className="flex min-h-screen bg-background-full text-text-primary">
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-background-full/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        id="adminSidebar"
        className={cx(
          'fixed inset-y-3 left-3 z-40 flex w-[220px] flex-col overflow-y-auto rounded-xl border border-border-button-default bg-background-secondary-default p-4 shadow-sidebar transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 border-b border-separator-border px-2 pb-5 pt-2">
          <img src="/images/logo.jpeg" alt="" className="size-10 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-text-primary">Dijitali Maths</p>
            <p id="userRoleBadge" className="text-caption-2-medium text-text-tertiary">
              {user?.role?.toUpperCase() || 'ADMIN'} PORTAL
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-foreground-icon-tertiary hover:bg-background-primary-hover lg:hidden"
          >
            <RiCloseLine className="size-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Admin Navigation" className="mt-3 flex flex-1 flex-col gap-4 pb-2">
          {groups.map((group) => {
            const items = navigation.filter((item) => item.group === group && (!item.adminOnly || user?.role === 'admin'));
            if (!items.length) return null;
            return (
              <div key={group} className="flex flex-col gap-1">
                <p className="px-3 text-caption-2-semibold uppercase tracking-wider text-text-placeholder">{group}</p>
                {items.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    data-tab={key}
                    aria-current={tab === key ? 'page' : undefined}
                    onClick={() => changeTab(key)}
                    className={cx(
                      'group flex min-h-8 items-center gap-2 rounded-lg px-2 text-body-2-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                      tab === key
                        ? 'bg-linear-to-r from-accent-500 to-accent-600 text-text-white shadow-xs'
                        : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary'
                    )}
                  >
                    <span
                      className={cx(
                        'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
                        tab === key ? 'bg-white/20 text-text-white' : 'bg-background-tertiary-default text-foreground-icon-secondary'
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-separator-border pt-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-9 items-center gap-3 rounded-xl px-3 text-body-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiArrowRightUpLine className="size-5" aria-hidden /> Public website
          </a>
          <Button id="logoutBtn" type="button" variant="ghost" leadingIcon={RiLogoutBoxRLine} onClick={() => setConfirmSignOut(true)} className="justify-start text-text-secondary">
            Sign out
          </Button>
        </div>
      </aside>

      <div className="admin-main-column flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-separator-border bg-background-full/90 px-4 pe-6 backdrop-blur-md sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              id="adminMenuBtn"
              aria-label="Open admin menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 text-foreground-icon-primary outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring lg:hidden"
            >
              <RiMenuLine className="size-5" aria-hidden />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-caption-2-medium text-text-tertiary">Dijitali Maths / Admin</p>
                <Chip variant="caption" color="lime">Live</Chip>
              </div>
              <h2 id="pageTitle" className="truncate text-title-3-semibold text-text-primary">Dashboard</h2>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => changeTab('inbox')}
              aria-label={unread ? `Inbox, ${unread} unread` : 'Inbox'}
              className="relative flex size-9 items-center justify-center rounded-full border border-border-button-default bg-background-primary-default text-foreground-icon-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <RiBellLine className="size-4" aria-hidden />
              {unread ? (
                <span className="absolute -end-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-caption-2-semibold text-text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            <ThemeButton dark={dark} onClick={toggleTheme} />
            <div className="relative">
              <button type="button" id="currentUserDisplay" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex min-w-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
                <span className="hidden max-w-44 truncate text-body-2-regular text-text-secondary sm:block">{user?.name || 'Admin account'}</span>
                <Avatar size="md" color="lime" initials={(user?.name || 'A').slice(0, 1).toUpperCase()} />
              </button>
              {profileOpen ? <div className="absolute end-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xl">
                <p className="text-body-medium text-text-primary">{user?.name || 'Admin account'}</p>
                <p className="mt-1 break-all text-body-2-regular text-text-secondary">{user?.email}</p>
                <p className="mt-2 text-caption-1-regular capitalize text-text-tertiary">{user?.role || 'staff'}</p>
                <Button variant="secondary" leadingIcon={RiLogoutBoxRLine} className="mt-3 w-full justify-center" onClick={() => { setProfileOpen(false); setConfirmSignOut(true); }}>Sign out</Button>
              </div> : null}
            </div>
          </div>
        </header>

        {operation ? (
          <div className="sticky top-16 z-10 border-b border-separator-border bg-background-secondary-default px-5 py-3 sm:px-7">
            <ProgressBar
              label={operation.label || 'Saving your changes'}
              value={operation.progress ?? undefined}
              minValue={0}
              maxValue={100}
              isIndeterminate={operation.progress == null}
              aria-label={operation.label || 'Saving your changes'}
              className="max-w-3xl"
            />
          </div>
        ) : null}

        <main id="adminContent" className="admin-content min-h-[calc(100vh-4rem)] p-4 sm:p-6" />
      </div>

      <NotificationViewport position="top-end" className="!top-[72px] sm:!top-[72px]">
        {toast ? (
          <Notification
            key={toast.id}
            status="information"
            avatar={{ initials: 'DM', color: 'lime' }}
            title={`${toast.count} new message${toast.count === 1 ? '' : 's'} waiting`}
            description="A new submission just arrived in your inbox. Open it to read and reply."
            timestamp="just now"
            introDelay={0}
            autoDismissDuration={9000}
            className="w-[min(380px,calc(100vw-24px))] border-l-4 border-l-accent-500"
            onDismiss={() => setToast(null)}
            actions={[
              {
                label: 'Open inbox',
                variant: 'primary',
                onClick: () => { setToast(null); changeTab('inbox'); },
              },
            ]}
          />
        ) : null}
      </NotificationViewport>

      <Modal isOpen={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }} size="lg">
        <ModalHeader
          title={detail?.title || 'Record details'}
          description={
            <span className="flex flex-wrap items-center gap-1.5">
              <span>{detail?.breadcrumb || 'Admin'}</span>
              <span aria-hidden>/</span>
              <span className="text-text-primary">Record details</span>
            </span>
          }
        />
        <ModalBody>
          <div className="flex items-start gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
            <Avatar size="lg" color="lime" initials={(detail?.title || 'R').slice(0, 1).toUpperCase()} />
            <div className="min-w-0 flex-1">
              <p className="break-words text-title-2-semibold text-text-primary">{detail?.title}</p>
              {detail?.subtitle ? (
                <p className="mt-1 break-words text-body-2-regular text-text-tertiary">{detail.subtitle}</p>
              ) : null}
              <p className="mt-1 text-caption-2-medium uppercase tracking-wider text-text-placeholder">
                Full record · {detail?.rows.length || 0} fields
              </p>
            </div>
            {detail?.status ? (
              <Chip variant="caption" color="lime" className="shrink-0 capitalize">{detail.status}</Chip>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detail?.rows.map((row, index) => {
              const wide = row.value.length > 90 || row.value.includes('\n');
              return (
                <div
                  key={index}
                  className={cx(
                    'rounded-xl border border-separator-border bg-background-primary-default px-4 py-3',
                    wide && 'sm:col-span-2'
                  )}
                >
                  <p className="text-caption-2-semibold uppercase tracking-wider text-text-tertiary">{row.label}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-body-regular leading-relaxed text-text-primary">
                    {row.value || '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={confirmSignOut} onOpenChange={setConfirmSignOut} size="sm" className="logout-confirmation">
        <ModalHeader title="Sign out of the admin console?" description="You can sign back in at any time with your staff account." />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmSignOut(false)}>Cancel</Button>
          <Button variant="primary" leadingIcon={RiLogoutBoxRLine} onClick={signOut}>Sign out</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mount                                                                      */
/* -------------------------------------------------------------------------- */

const authRoot = document.getElementById('boardui-auth-root');
if (authRoot) {
  createRoot(authRoot).render(
    <DirectionProvider locale="en-US">
      <AuthScreen />
    </DirectionProvider>
  );
}

const adminRoot = document.getElementById('boardui-admin-root');
if (adminRoot) {
  createRoot(adminRoot).render(
    <DirectionProvider locale="en-US">
      <AdminApp />
    </DirectionProvider>
  );
}
