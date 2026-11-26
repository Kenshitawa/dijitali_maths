/**
 * Dijitali Maths — Unified Public Application Script
 * Zero inline scripts; CSP-compliant.
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initHeroSlideshow();
  initMathChallenge();
  initFaqAccordion();
  initYouTubeFacades();
  initAccessibilityWidget();
  initCookieBanner();
  initPublicForms();
  hydrateDynamicContent();
  trackPageview();
});

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* 1. Navbar */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .drawer-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === currentFile || (currentFile === '' && href === 'index.html')) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
}

/* 2. Accessible Mobile Drawer with Focus Trap & Escape */
function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobileToggle');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const closeBtn = document.getElementById('drawerClose');
  if (!toggleBtn || !drawer || !overlay) return;

  let lastFocus = null;

  const getFocusable = () =>
    [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];

  const openDrawer = () => {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const focusables = getFocusable();
    if (focusables[0]) focusables[0].focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));

  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') {
      closeDrawer();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = getFocusable();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* 3. Hero Slideshow */
function initHeroSlideshow() {
  const slideshow = document.getElementById('heroSlideshow');
  if (!slideshow) return;
  const slides = slideshow.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slide-dot');
  const prev = document.getElementById('slidePrev');
  const next = document.getElementById('slideNext');
  if (!slides.length) return;

  let current = 0;
  let timer = null;

  const goTo = (idx) => {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 4500);
  };

  start();
  next?.addEventListener('click', () => { goTo(current + 1); start(); });
  prev?.addEventListener('click', () => { goTo(current - 1); start(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); start(); }));
}

/* 4. Interactive Maths Challenge Widget */
function initMathChallenge() {
  const box = document.getElementById('mathChallengeBox');
  if (!box) return;

  const challenges = [
    {
      category: 'Binary Necklace Code',
      q: 'In our Dijitali Workshop, black beads = 1 and white beads = 0. What decimal number does 1 0 1 1₂ represent?',
      options: [
        { text: 'A) 11', correct: true, note: 'Outstanding! (1×8) + (0×4) + (1×2) + (1×1) = 11.' },
        { text: 'B) 7', correct: false, note: 'Check place values: 8s, 4s, 2s, 1s.' },
        { text: 'C) 13', correct: false, note: 'In binary, positions are 8, 4, 2, 1. 8 + 0 + 2 + 1 = 11.' },
        { text: 'D) 9', correct: false, note: 'Close! Do not forget the 2s place: 8 + 2 + 1 = 11.' },
      ],
    },
    {
      category: 'Pizza Fraction Feast',
      q: '4 friends share 3 large pizzas cut into 8 slices each (24 slices total). What fraction of a pizza does each friend get?',
      options: [
        { text: 'A) 6 slices (3/4 of a pizza)', correct: true, note: 'Correct! 24 ÷ 4 = 6 slices each, which is 6/8 = 3/4 of a pizza.' },
        { text: 'B) 4 slices (1/2 of a pizza)', correct: false, note: '3 pizzas × 8 slices = 24. 24 ÷ 4 = 6.' },
        { text: 'C) 8 slices (1 whole pizza)', correct: false, note: 'That would require 4 whole pizzas.' },
        { text: 'D) 5 slices (5/8 of a pizza)', correct: false, note: '24 divided equally by 4 is 6.' },
      ],
    },
    {
      category: 'Fruit Equation Puzzle',
      q: 'If 🍎 + 🍎 + 🍎 = 30, 🍎 + 🍌 + 🍌 = 18, and 🍌 − 🍇 = 2, what is 🍎 + 🍌 × 🍇?',
      options: [
        { text: 'A) 18', correct: true, note: 'Genius! 🍎=10, 🍌=4, 🍇=2. Multiply first: 4 × 2 = 8, then 10 + 8 = 18.' },
        { text: 'B) 34', correct: false, note: 'Remember order of operations (BODMAS): multiply 🍌 × 🍇 before adding 🍎.' },
        { text: 'C) 28', correct: false, note: 'Check the values: 🍎=10, 🍌=4, 🍇=2.' },
        { text: 'D) 22', correct: false, note: 'Try calculating 10 + (4 × 2).' },
      ],
    },
    {
      category: 'Pattern Discovery',
      q: 'What comes next in the Fibonacci-style sequence: 2, 3, 5, 8, 13, ___ ?',
      options: [
        { text: 'A) 21', correct: true, note: 'Spot on! Each number is the sum of the two before it: 8 + 13 = 21.' },
        { text: 'B) 18', correct: false, note: 'Try adding the previous two numbers together.' },
        { text: 'C) 20', correct: false, note: 'Check 8 + 13.' },
        { text: 'D) 24', correct: false, note: 'Add 8 and 13 to find the next term.' },
      ],
    },
  ];

  let idx = 0;
  const catEl = box.querySelector('#challengeCategory');
  const qEl = box.querySelector('#challengeQuestion');
  const optsEl = box.querySelector('#challengeOptions');
  const fbEl = box.querySelector('#challengeFeedback');
  const nextBtn = box.querySelector('#challengeNext');

  const render = () => {
    const c = challenges[idx];
    if (catEl) catEl.textContent = c.category;
    if (qEl) qEl.textContent = c.q;
    if (fbEl) {
      fbEl.textContent = '';
      fbEl.className = 'challenge-feedback';
    }
    if (optsEl) {
      optsEl.innerHTML = '';
      c.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'challenge-opt';
        btn.textContent = opt.text;
        btn.addEventListener('click', () => {
          optsEl.querySelectorAll('.challenge-opt').forEach((b) => {
            b.classList.remove('correct', 'wrong');
          });
          btn.classList.add(opt.correct ? 'correct' : 'wrong');
          if (fbEl) {
            fbEl.textContent = opt.note;
            fbEl.className = `challenge-feedback show ${opt.correct ? 'success' : 'error'}`;
          }
        });
        optsEl.appendChild(btn);
      });
    }
  };

  nextBtn?.addEventListener('click', () => {
    idx = (idx + 1) % challenges.length;
    render();
  });
  render();
}

/* 5. FAQ Accordion */
function initFaqAccordion() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;
      const expanded = item.classList.toggle('active');
      btn.setAttribute('aria-expanded', String(expanded));
    });
  });
}

/* 6. YouTube Autoplay Facade */
function initYouTubeFacades() {
  document.querySelectorAll('[data-yt-facade]').forEach((el) => {
    const src = el.getAttribute('data-yt-src');
    const title = el.getAttribute('data-yt-title') || 'Dijitali Maths Video';
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.aspectRatio = '16 / 9';
    el.replaceChildren(iframe);
  });
}

/* 7. Accessibility Widget */
function initAccessibilityWidget() {
  const btn = document.getElementById('a11yBtn');
  const menu = document.getElementById('a11yMenu');
  const closeBtn = document.getElementById('a11yClose');
  if (!btn || !menu) return;

  let currentFontSize = parseFloat(localStorage.getItem('a11y_font_size')) || 16;
  document.documentElement.style.fontSize = `${currentFontSize}px`;

  if (localStorage.getItem('a11y_high_contrast') === 'true') {
    document.body.classList.add('high-contrast');
  }

  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  closeBtn?.addEventListener('click', () => {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('fontInc')?.addEventListener('click', () => {
    if (currentFontSize < 21) {
      currentFontSize += 1.5;
      document.documentElement.style.fontSize = `${currentFontSize}px`;
      localStorage.setItem('a11y_font_size', String(currentFontSize));
    }
  });
  document.getElementById('fontDec')?.addEventListener('click', () => {
    if (currentFontSize > 13) {
      currentFontSize -= 1.5;
      document.documentElement.style.fontSize = `${currentFontSize}px`;
      localStorage.setItem('a11y_font_size', String(currentFontSize));
    }
  });
  document.getElementById('fontReset')?.addEventListener('click', () => {
    currentFontSize = 16;
    document.documentElement.style.fontSize = '16px';
    localStorage.setItem('a11y_font_size', '16');
  });
  document.getElementById('contrastToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    localStorage.setItem('a11y_high_contrast', String(document.body.classList.contains('high-contrast')));
  });
}

/* 8. Cookie & Privacy Notice */
function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('cookieAccept');
  if (!banner || !acceptBtn) return;

  if (!localStorage.getItem('dm_cookie_consent')) {
    banner.classList.add('show');
  }
  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('dm_cookie_consent', 'accepted');
    banner.classList.remove('show');
  });
}

/* 9. Public Forms */
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Submission failed. Please check your details and try again.');
  }
  return data;
}

function setFormStatus(form, message, isError = false) {
  const statusEl = form.querySelector('.form-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `form-status ${isError ? 'error' : 'success'}`;
  }
  showToast(message, isError ? 'error' : 'success');
}

function initPublicForms() {
  // Contact Form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(contactForm);
      try {
        const res = await postJson('/api/contact', {
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          enquiryType: String(fd.get('enquiry_type') || ''),
          message: String(fd.get('message') || ''),
          _honey: String(fd.get('_honey') || ''),
        });
        setFormStatus(contactForm, res.message);
        contactForm.reset();
      } catch (err) {
        setFormStatus(contactForm, err.message, true);
      }
    });
  }

  // Volunteer Application Form
  const volunteerForm = document.getElementById('volunteerAppForm');
  if (volunteerForm) {
    volunteerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(volunteerForm);
      const skills = fd.getAll('skills').map(String);
      try {
        const res = await postJson('/api/volunteers', {
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          county: String(fd.get('county') || ''),
          skills,
          availability: String(fd.get('availability') || ''),
          motivation: String(fd.get('motivation') || ''),
          _honey: String(fd.get('_honey') || ''),
        });
        setFormStatus(volunteerForm, res.message);
        volunteerForm.reset();
      } catch (err) {
        setFormStatus(volunteerForm, err.message, true);
      }
    });
  }

  // Partner / Sponsor Form
  const partnerForm = document.getElementById('partnerForm');
  if (partnerForm) {
    partnerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(partnerForm);
      try {
        const res = await postJson('/api/partners', {
          name: String(fd.get('name') || ''),
          organization: String(fd.get('organization') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          partnershipType: String(fd.get('partnership_type') || ''),
          amountLabel: String(fd.get('amount') || ''),
          message: String(fd.get('message') || ''),
          _honey: String(fd.get('_honey') || ''),
        });
        setFormStatus(partnerForm, res.message);
        partnerForm.reset();
      } catch (err) {
        setFormStatus(partnerForm, err.message, true);
      }
    });
  }

  // Donation Amount Quick Selectors
  const amountInput = document.getElementById('partnerAmountInput');
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-donate-amount]');
    if (btn) {
      const val = btn.getAttribute('data-donate-amount') || '';
      if (amountInput) amountInput.value = val;
      const stkAmount = document.getElementById('stkAmount');
      if (stkAmount) stkAmount.value = val.replace(/[^\d]/g, '');
      document.querySelectorAll('[data-donate-amount]').forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
    }
  });

  const stkForm = document.getElementById('mpesaStkForm');
  if (stkForm) {
    stkForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = stkForm.querySelector('.form-status');
      const button = stkForm.querySelector('[type="submit"]');
      const formData = new FormData(stkForm);
      button.disabled = true;
      status.textContent = 'Sending payment request to your phone…';
      status.className = 'form-status';

      try {
        const response = await fetch('/api/donations/mpesa/stk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: formData.get('amount'),
            phoneNumber: formData.get('phoneNumber'),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'M-Pesa payment could not be started.');

        status.textContent = data.message;
        const statusUrl = `/api/donations/mpesa/status/${encodeURIComponent(data.checkoutRequestId)}`;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const statusResponse = await fetch(statusUrl);
          const statusData = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusData.error || 'Could not check the payment status.');
          if (statusData.payment.status === 'completed') {
            status.textContent = `Payment received${statusData.payment.mpesaReceiptNumber ? ` — receipt ${statusData.payment.mpesaReceiptNumber}` : ''}. Thank you.`;
            status.className = 'form-status success';
            return;
          }
          if (statusData.payment.status === 'failed') {
            status.textContent = statusData.payment.resultDescription || 'The payment was not completed.';
            status.className = 'form-status error';
            return;
          }
        }
        status.textContent = 'The request is still pending. Check your phone and wait for confirmation before trying again.';
      } catch (error) {
        status.textContent = error.message;
        status.className = 'form-status error';
      } finally {
        button.disabled = false;
      }
    });
  }

  // Event Registration Form & Modal
  const eventModal = document.getElementById('eventRegisterModal');
  const modalEventInput = document.getElementById('modalEventName');
  const modalEventIdInput = document.getElementById('modalEventId');
  const eventRegForm = document.getElementById('eventRegForm');

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-register-event]');
    if (trigger && eventModal) {
      if (modalEventInput) modalEventInput.value = trigger.getAttribute('data-register-event') || '';
      if (modalEventIdInput) modalEventIdInput.value = trigger.getAttribute('data-register-event-id') || '';
      eventModal.classList.add('open');
    }
    if (e.target.closest('[data-close-modal]') || e.target === eventModal) {
      eventModal?.classList.remove('open');
    }
  });

  if (eventRegForm) {
    eventRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(eventRegForm);
      try {
        const res = await postJson('/api/event-registrations', {
          eventTitle: String(fd.get('event_title') || ''),
          eventId: String(fd.get('event_id') || '') || undefined,
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          roleType: String(fd.get('role_type') || ''),
          _honey: String(fd.get('_honey') || ''),
        });
        setFormStatus(eventRegForm, res.message);
        eventRegForm.reset();
        setTimeout(() => eventModal?.classList.remove('open'), 1400);
      } catch (err) {
        setFormStatus(eventRegForm, err.message, true);
      }
    });
  }

  // Footer Newsletter Forms
  document.querySelectorAll('.footer-newsletter-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const honeyInput = form.querySelector('input[name="_honey"]');
      if (!emailInput) return;
      try {
        const res = await postJson('/api/subscribers', {
          email: emailInput.value,
          _honey: honeyInput ? honeyInput.value : '',
        });
        showToast(res.message, 'success');
        form.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

/* 10. Dynamic Content Hydration from API */
async function hydrateDynamicContent() {
  try {
    const settingsRes = await fetch('/api/site-settings');
    if (settingsRes.ok) {
      const { settings } = await settingsRes.json();
      if (settings) applySiteSettings(settings);
    }
  } catch {
    // Graceful fallback to static HTML content
  }

  if (document.getElementById('dynamicProgramsGrid')) await loadPrograms();
  if (document.getElementById('dynamicHomePrograms')) await loadHomePrograms();
  if (document.getElementById('dynamicEventsGrid')) await loadEvents();
  if (document.getElementById('dynamicGalleryGrid')) await loadGallery();
  if (document.getElementById('dynamicHomeGallery')) await loadHomeGallery();
  if (document.getElementById('dynamicVideosGrid')) await loadVideos();
  if (document.getElementById('dynamicHomePosts')) await loadHomePosts();
}

function applySiteSettings(s) {
  const paybillEl = document.getElementById('settingMpesaPaybill');
  const mpesaAccEl = document.getElementById('settingMpesaAccount');
  const bankNameEl = document.getElementById('settingBankName');
  const bankAccEl = document.getElementById('settingBankAccount');
  const bankAccNameEl = document.getElementById('settingBankAccountName');
  const bankBranchEl = document.getElementById('settingBankBranch');
  const contactPaybillEl = document.getElementById('contactMpesaPaybill');
  const contactMpesaAccountEl = document.getElementById('contactMpesaAccount');

  if (paybillEl && s.mpesaPaybill) paybillEl.textContent = s.mpesaPaybill;
  if (mpesaAccEl && s.mpesaAccountName) mpesaAccEl.textContent = s.mpesaAccountName;
  if (bankNameEl && s.bankName) bankNameEl.textContent = s.bankName;
  if (bankAccEl && s.bankAccountNumber) bankAccEl.textContent = s.bankAccountNumber;
  if (bankAccNameEl && s.bankAccountName) bankAccNameEl.textContent = s.bankAccountName;
  if (bankBranchEl && s.bankBranch) bankBranchEl.textContent = s.bankBranch;
  if (contactPaybillEl && s.mpesaPaybill) contactPaybillEl.textContent = s.mpesaPaybill;
  if (contactMpesaAccountEl && s.mpesaAccountName) contactMpesaAccountEl.textContent = s.mpesaAccountName;

  const donationAmountsEl = document.getElementById('donationAmounts');
  if (donationAmountsEl) {
    const amounts = (Array.isArray(s.donationAmounts)
      ? s.donationAmounts
      : String(s.donationAmounts || '')
          .split(',')
          .map((amount) => Number(amount.trim())))
      .map(Number)
      .filter((amount, index, list) => Number.isInteger(amount) && amount > 0 && amount <= 250000 && list.indexOf(amount) === index);
    if (amounts.length) {
      donationAmountsEl.innerHTML = amounts
        .map((amount) => {
          const label = new Intl.NumberFormat('en-KE').format(amount);
          return `<button type="button" class="btn btn-outline-primary btn-sm" data-donate-amount="KES ${label}">KES ${label}</button>`;
        })
        .join('');
    }
  }

  const stkCard = document.getElementById('mpesaStkCard');
  if (stkCard) stkCard.hidden = s.mpesaStkEnabled !== true;

  const statsContainer = document.getElementById('dynamicImpactStats');
  if (statsContainer && Array.isArray(s.impactStats) && s.impactStats.length) {
    statsContainer.innerHTML = s.impactStats
      .map(
        (st) => `
      <div class="stat-card">
        <div class="stat-number">${escapeHtml(st.target)}${escapeHtml(st.suffix || '')}</div>
        <div class="stat-label">${escapeHtml(st.label)}</div>
        <div class="stat-sub">${escapeHtml(st.subtext)}</div>
      </div>`
      )
      .join('');
  }
}

async function loadHomePrograms() {
  const el = document.getElementById('dynamicHomePrograms');
  if (!el) return;
  try {
    const res = await fetch('/api/programs');
    if (!res.ok) return;
    const { items } = await res.json();
    const featured = (items || []).filter((p) => p.featured).slice(0, 3);
    if (!featured.length) return;
    el.innerHTML = featured.map(renderProgramCard).join('');
  } catch {}
}

async function loadPrograms() {
  const el = document.getElementById('dynamicProgramsGrid');
  if (!el) return;
  try {
    const res = await fetch('/api/programs');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;
    el.innerHTML = items.map(renderProgramCard).join('');
  } catch {}
}

function renderProgramCard(p) {
  const tags = Array.isArray(p.tags) ? p.tags : [];
  return `
    <article class="card">
      ${p.imageUrl ? `<div class="card-media"><img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" /></div>` : ''}
      <div class="card-body">
        <span class="badge badge-blue">${escapeHtml(p.categoryLabel)}</span>
        <h3 style="margin-top:0.65rem;">${escapeHtml(p.title)}</h3>
        <p style="margin-top:0.5rem;">${escapeHtml(p.description || p.summary)}</p>
        <div class="tag-list">
          ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <a href="contactus.html" class="btn btn-outline-primary btn-sm">Enquire About This Programme</a>
      </div>
    </article>`;
}

async function loadEvents() {
  const el = document.getElementById('dynamicEventsGrid');
  if (!el) return;
  try {
    const res = await fetch('/api/events');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;

    const renderList = (cat = 'all') => {
      const filtered = cat === 'all' ? items : items.filter((ev) => ev.category === cat);
      el.innerHTML = filtered
        .map(
          (ev) => `
        <article class="card">
          ${ev.imageUrl ? `<div class="card-media"><img src="${escapeHtml(ev.imageUrl)}" alt="${escapeHtml(ev.title)}" loading="lazy" /></div>` : ''}
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.6rem;">
              <span class="badge badge-cyan">${escapeHtml(ev.category)}</span>
              <span class="badge badge-amber">${escapeHtml(ev.eventDateLabel)}</span>
            </div>
            <h3>${escapeHtml(ev.title)}</h3>
            <p style="font-size:0.9rem;color:var(--text-muted);margin:0.4rem 0;">
              <i class="fa-solid fa-location-dot"></i> ${escapeHtml(ev.location)} &bull; ${escapeHtml(ev.schedule)}
            </p>
            <p style="margin-bottom:1rem;">${escapeHtml(ev.description)}</p>
            ${
              ev.registrationEnabled
                ? `<button type="button" class="btn btn-primary btn-sm" data-register-event="${escapeHtml(ev.title)}" data-register-event-id="${escapeHtml(ev.id)}">Register Now</button>`
                : ''
            }
          </div>
        </article>`
        )
        .join('');
    };

    renderList('all');
    document.querySelectorAll('#eventFilterBar .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#eventFilterBar .filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderList(btn.getAttribute('data-filter') || 'all');
      });
    });
  } catch {}
}

async function loadHomeGallery() {
  const el = document.getElementById('dynamicHomeGallery');
  if (!el) return;
  try {
    const res = await fetch('/api/gallery?limit=8');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;
    el.innerHTML = items
      .slice(0, 8)
      .map(
        (img) => `
      <a href="photos.html" class="gallery-card">
        <img src="${escapeHtml(img.thumbUrl)}" srcset="${escapeHtml(img.thumbUrl)} 400w, ${escapeHtml(img.webSmallUrl)} 800w" sizes="(max-width:600px) 100vw, 300px" alt="${escapeHtml(img.altText)}" loading="lazy" />
        <span class="gallery-caption">${escapeHtml(img.altText)}</span>
      </a>`
      )
      .join('');
  } catch {}
}

async function loadGallery() {
  const el = document.getElementById('dynamicGalleryGrid');
  if (!el) return;
  try {
    const res = await fetch('/api/gallery?limit=100');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;

    const countEl = document.getElementById('photoCount');
    if (countEl) countEl.textContent = String(items.length);

    let activeItems = items;
    let currentLbIndex = 0;

    const lightbox = document.getElementById('galleryLightbox');
    const lbImg = document.getElementById('lbImg');
    const lbCap = document.getElementById('lbCaption');

    const openLb = (index) => {
      if (!lightbox || !lbImg || !activeItems[index]) return;
      currentLbIndex = index;
      const item = activeItems[index];
      lbImg.src = item.webUrl;
      lbImg.alt = item.altText;
      if (lbCap) lbCap.textContent = `${item.altText} (${index + 1} / ${activeItems.length})`;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
    };
    const closeLb = () => {
      lightbox?.classList.remove('open');
      lightbox?.setAttribute('aria-hidden', 'true');
    };

    const render = (cat = 'all') => {
      activeItems = cat === 'all' ? items : items.filter((i) => i.category === cat);
      el.innerHTML = activeItems
        .map(
          (img, idx) => `
        <button type="button" class="gallery-card" data-lb-index="${idx}" aria-label="View photo: ${escapeHtml(img.altText)}">
          <img src="${escapeHtml(img.thumbUrl)}"
               srcset="${escapeHtml(img.thumbUrl)} 400w, ${escapeHtml(img.webSmallUrl)} 800w, ${escapeHtml(img.webUrl)} 1600w"
               sizes="(max-width: 600px) 100vw, 320px"
               alt="${escapeHtml(img.altText)}"
               loading="lazy" />
          <span class="gallery-caption">${escapeHtml(img.altText)}</span>
        </button>`
        )
        .join('');

      el.querySelectorAll('[data-lb-index]').forEach((btn) => {
        btn.addEventListener('click', () => openLb(Number(btn.getAttribute('data-lb-index'))));
      });
    };

    render('all');

    document.querySelectorAll('#galleryFilterBar .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#galleryFilterBar .filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        render(btn.getAttribute('data-filter') || 'all');
      });
    });

    document.getElementById('lbClose')?.addEventListener('click', closeLb);
    document.getElementById('lbPrev')?.addEventListener('click', () =>
      openLb((currentLbIndex - 1 + activeItems.length) % activeItems.length)
    );
    document.getElementById('lbNext')?.addEventListener('click', () =>
      openLb((currentLbIndex + 1) % activeItems.length)
    );
    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox?.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openLb((currentLbIndex - 1 + activeItems.length) % activeItems.length);
      if (e.key === 'ArrowRight') openLb((currentLbIndex + 1) % activeItems.length);
    });
  } catch {}
}

async function loadVideos() {
  const el = document.getElementById('dynamicVideosGrid');
  if (!el) return;
  try {
    const res = await fetch('/api/videos');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;
    const parseYouTubeUrl = (value) => {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) return null;
        const segments = url.pathname.split('/').filter(Boolean);
        const id = url.hostname.toLowerCase() === 'youtu.be'
          ? segments[0]
          : url.pathname === '/watch'
            ? url.searchParams.get('v')
            : ['embed', 'shorts', 'live'].includes(segments[0] || '')
              ? segments[1]
              : null;
        return { url: url.href, id: id && /^[\w-]{11}$/.test(id) ? id : null };
      } catch {
        return null;
      }
    };
    el.innerHTML = items
      .map(
        (v) => {
          const youtube = v.youtubeUrl ? parseYouTubeUrl(v.youtubeUrl) : null;
          const youtubeId = youtube?.id;
          const videoEmbed = youtubeId
            ? `<div class="card-media"><iframe src="https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&amp;mute=1&amp;playsinline=1&amp;rel=0" title="${escapeHtml(v.title)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
            : v.videoUrl
              ? `<div class="card-media"><video src="${escapeHtml(v.videoUrl)}" controls preload="metadata" playsinline aria-label="${escapeHtml(v.title)}"></video></div>`
              : v.thumbnailUrl
                ? `<div class="card-media"><img src="${escapeHtml(v.thumbnailUrl)}" alt="${escapeHtml(v.title)}" loading="lazy" /></div>`
                : '';
          return `
      <article class="card">
        ${videoEmbed}
        <div class="card-body">
          <span class="badge badge-amber">${escapeHtml(v.category)}</span>
          <h3 style="margin-top:0.6rem;">${escapeHtml(v.title)}</h3>
          <p style="margin:0.5rem 0 1rem;">${escapeHtml(v.description)}</p>
          ${youtube && !youtubeId ? `<a href="${escapeHtml(youtube.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class="fa-brands fa-youtube"></i> Watch on YouTube</a>` : ''}
        </div>
      </article>`
        }
      )
      .join('');
  } catch {}
}

async function loadHomePosts() {
  const el = document.getElementById('dynamicHomePosts');
  if (!el) return;
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!items?.length) return;
    el.innerHTML = items
      .slice(0, 3)
      .map(
        (p) => `
      <article class="card">
        ${p.coverImageUrl ? `<div class="card-media"><img src="${escapeHtml(p.coverImageUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" /></div>` : ''}
        <div class="card-body">
          <span class="badge badge-emerald">Latest Update</span>
          <h3 style="margin-top:0.6rem;">${escapeHtml(p.title)}</h3>
          <p style="margin:0.5rem 0 1rem;">${escapeHtml(p.excerpt)}</p>
          <a href="impact.html" class="btn btn-outline-primary btn-sm">Read More</a>
        </div>
      </article>`
      )
      .join('');
  } catch {}
}

/* 11. Privacy-First Analytics (No cookies, no raw IP) */
function trackPageview() {
  const path = window.location.pathname || '/';
  if (path.startsWith('/admin')) return;

  let referrerDomain = 'direct';
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname !== window.location.hostname) {
        referrerDomain = refUrl.hostname;
      }
    } catch {}
  }

  const width = window.innerWidth;
  const deviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  const ua = navigator.userAgent;
  let browserFamily = 'other';
  if (/Edg\//i.test(ua)) browserFamily = 'Edge';
  else if (/Chrome\//i.test(ua)) browserFamily = 'Chrome';
  else if (/Firefox\//i.test(ua)) browserFamily = 'Firefox';
  else if (/Safari\//i.test(ua)) browserFamily = 'Safari';

  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, referrerDomain, deviceType, browserFamily }),
    keepalive: true,
  }).catch(() => {});
}
