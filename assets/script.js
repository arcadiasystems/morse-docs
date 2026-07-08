/* ═══════════════════════════════════════════════════════════════
   MORSE DOCUMENTATION · INTERACTIVE BEHAVIOURS
   ═══════════════════════════════════════════════════════════════ */

// Docs repo (for "Suggest changes" / feedback issues)
const DOCS_REPO = 'arcadiasystems/morse-dcms';

function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function absoluteUrl(path) {
  return new URL(path, window.location.href).href;
}

function markdownTwinUrl() {
  return absoluteUrl(currentPage().replace(/\.html$/, '.md'));
}

function llmsFullUrl() {
  return absoluteUrl('llms-full.txt');
}

// ── Active nav link ─────────────────────────────────────────────
function setActiveNav() {
  const filename = currentPage();
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    const matches =
      (filename === page) ||
      (filename === '' && page === 'index.html') ||
      (filename === 'index.html' && page === 'index.html');
    link.classList.toggle('active', matches);
    if (matches) {
      link.addEventListener('click', e => {
        e.preventDefault();
        window.history.replaceState(null, '', window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
}

// ── Sidebar toggle (mobile) ─────────────────────────────────────
function initSidebar() {
  const btn = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!btn || !sidebar) return;

  const open = () => { sidebar.classList.add('open'); overlay?.classList.add('open'); };
  const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };

  btn.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
  overlay?.addEventListener('click', close);

  // Close on nav link click (mobile)
  sidebar.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => { if (window.innerWidth <= 900) close(); });
  });
}

// ── Copy code buttons ───────────────────────────────────────────
function initCopyButtons() {
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pre = btn.closest('.code-block')?.querySelector('pre');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.innerText);
        const orig = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '✓ Copied';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 2000);
      } catch { /* clipboard unavailable */ }
    });
  });
}

// ── Table of Contents (auto-generate from h2/h3) ────────────────
function initTOC() {
  const tocList = document.querySelector('.toc-list');
  if (!tocList) return;
  const article = document.querySelector('.article');
  if (!article) return;

  const headings = [...article.querySelectorAll('h2, h3')];
  if (!headings.length) return;

  const usedIds = new Set();
  headings.forEach(h => {
    if (!h.id) {
      let base = h.textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      let id = base;
      let n = 2;
      while (usedIds.has(id)) { id = base + '-' + n++; }
      h.id = id;
    }
    usedIds.add(h.id);

    const li = document.createElement('li');
    li.className = 'toc-item';

    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.className = 'toc-link' + (h.tagName === 'H3' ? ' toc-link-h3' : '');
    a.textContent = h.textContent;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });

  // Highlight active section on scroll
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        document.querySelectorAll('.toc-link').forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-88px 0px -65% 0px' });

  headings.forEach(h => obs.observe(h));
}

// ── Heading anchor links ─────────────────────────────────────────
function initHeadingAnchors() {
  document.querySelectorAll('.article h2, .article h3').forEach(h => {
    if (!h.id) return;
    h.title = 'Click to copy link';
    h.style.cursor = 'pointer';
    h.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}#${h.id}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      window.history.replaceState(null, '', '#' + h.id);
    });
  });
}

// ── Scroll to hash on load ──────────────────────────────────────
function scrollToHash() {
  if (!window.location.hash) return;
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target) return;
  setTimeout(() => {
    const headerH = 96;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 150);
}

// ── For Agents dropdown ─────────────────────────────────────────
function initAgentsMenu() {
  const btn = document.getElementById('agents-btn');
  const menu = document.getElementById('agents-menu');
  if (!btn || !menu) return;

  const close = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== btn) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Copy buttons inside the menu
  menu.querySelectorAll('.agents-copy').forEach(copyBtn => {
    copyBtn.addEventListener('click', async e => {
      e.stopPropagation();
      const code = copyBtn.closest('.agents-cmd')?.querySelector('code');
      if (!code) return;
      // Resolve relative doc paths to absolute URLs at copy time
      const text = code.getAttribute('data-copy') || code.innerText;
      try {
        await navigator.clipboard.writeText(text.replace(/__ORIGIN__/g, new URL('.', window.location.href).href.replace(/\/$/, '')));
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 2000);
      } catch { /* clipboard unavailable */ }
    });
  });
}

// ── Page actions (Copy page for AI) ─────────────────────────────
function initPageActions() {
  const main = document.getElementById('pgact-copy');
  const caret = document.getElementById('pgact-caret');
  const menu = document.getElementById('pgact-menu');
  if (!main) return;

  const origLabel = main.innerHTML;
  const flash = (label, ok) => {
    main.classList.toggle('copied', ok);
    main.innerHTML = label;
    setTimeout(() => { main.classList.remove('copied'); main.innerHTML = origLabel; }, 2200);
  };

  const copyMarkdown = async () => {
    if (!navigator.clipboard) { flash('Copy unavailable', false); return; }
    try {
      // ClipboardItem with a promise keeps the user-activation window open
      // across the fetch (Safari revokes it after an intervening await).
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        const textPromise = fetch(markdownTwinUrl())
          .then(res => { if (!res.ok) throw new Error('md twin missing'); return res.text(); })
          .then(text => new Blob([text], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': textPromise })]);
        flash('✓ Copied as Markdown', true);
        return;
      }
      const res = await fetch(markdownTwinUrl());
      if (!res.ok) throw new Error('md twin missing');
      await navigator.clipboard.writeText(await res.text());
      flash('✓ Copied as Markdown', true);
    } catch {
      // Fallback: copy the rendered article text — report success only if it lands
      try {
        const article = document.querySelector('.article');
        if (!article) throw new Error('no article');
        await navigator.clipboard.writeText(article.innerText);
        flash('✓ Copied', true);
      } catch {
        flash('Copy failed', false);
      }
    }
  };

  main.addEventListener('click', copyMarkdown);

  if (caret && menu) {
    const closeMenu = () => { menu.classList.remove('open'); caret.setAttribute('aria-expanded', 'false'); };
    caret.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      caret.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', e => {
      if (!menu.contains(e.target) && e.target !== caret) closeMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
    });

    const mdUrl = markdownTwinUrl();
    const pageTitle = document.title;
    const aiPrompt = `Read ${mdUrl} so you can answer questions about "${pageTitle}". For full Morse docs context, read ${llmsFullUrl()}.`;

    const view = document.getElementById('pgact-view-md');
    if (view) view.href = mdUrl;

    const chatgpt = document.getElementById('pgact-chatgpt');
    if (chatgpt) chatgpt.href = 'https://chatgpt.com/?hints=search&q=' + encodeURIComponent(aiPrompt);

    const claude = document.getElementById('pgact-claude');
    if (claude) claude.href = 'https://claude.ai/new?q=' + encodeURIComponent(aiPrompt);

    const copyItem = document.getElementById('pgact-copy-item');
    if (copyItem) copyItem.addEventListener('click', () => { closeMenu(); copyMarkdown(); });
  }
}

// ── Feedback widget ─────────────────────────────────────────────
function initFeedback() {
  const wrap = document.getElementById('feedback');
  if (!wrap) return;
  const yes = wrap.querySelector('[data-feedback="yes"]');
  const no = wrap.querySelector('[data-feedback="no"]');
  const page = currentPage();

  yes?.addEventListener('click', () => {
    wrap.innerHTML = '<span class="feedback-thanks">Thanks for the signal ·–·</span>';
  });

  no?.addEventListener('click', () => {
    const title = encodeURIComponent(`docs feedback: ${page}`);
    const body = encodeURIComponent(`Page: ${absoluteUrl(page)}\n\nWhat was missing, stale, or confusing?\n\n`);
    window.open(`https://github.com/${DOCS_REPO}/issues/new?title=${title}&body=${body}&labels=docs-feedback`, '_blank', 'noopener');
  });
}

// ── Modal helpers (focus trap + restore) ────────────────────────
function trapFocus(container) {
  container.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusables = container.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

// ── Ask AI modal ────────────────────────────────────────────────
let askaiOpen = false;
let askaiLastFocus = null;

function openAskAI() {
  askaiOpen = true;
  askaiLastFocus = document.activeElement;
  document.getElementById('askai-modal').classList.add('open');
  setTimeout(() => document.getElementById('askai-input').focus(), 50);
}

function closeAskAI() {
  askaiOpen = false;
  document.getElementById('askai-modal').classList.remove('open');
  askaiLastFocus?.focus?.();
  askaiLastFocus = null;
}

function initAskAI() {
  const modal = document.createElement('div');
  modal.id = 'askai-modal';
  modal.innerHTML = `
    <div class="search-backdrop"></div>
    <div class="askai-dialog" role="dialog" aria-modal="true" aria-label="Ask AI about Morse">
      <div class="askai-header">
        <span class="morse-glyphs" aria-hidden="true"><span class="dot"></span><span class="dash"></span><span class="dot"></span></span>
        Ask AI about Morse
      </div>
      <textarea id="askai-input" class="askai-input" placeholder="e.g. How do I publish an encrypted entry with the CLI?" rows="3"></textarea>
      <div class="askai-footer">
        <div class="askai-hint">Opens your assistant with the full Morse docs as context.</div>
        <div class="askai-actions">
          <button class="askai-go" id="askai-chatgpt">ChatGPT</button>
          <button class="askai-go askai-go-primary" id="askai-claude">Ask Claude</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('.search-backdrop').addEventListener('click', closeAskAI);

  const buildPrompt = () => {
    const q = document.getElementById('askai-input').value.trim();
    const context = `First read ${llmsFullUrl()} — the complete documentation for Morse, the decentralized headless CMS protocol on Sui and Walrus. Then answer this question:`;
    return q ? `${context}\n\n${q}` : `Read ${llmsFullUrl()} and give me an overview of Morse, the decentralized CMS protocol.`;
  };

  const go = url => {
    window.open(url, '_blank', 'noopener');
    closeAskAI();
  };

  document.getElementById('askai-claude').addEventListener('click', () =>
    go('https://claude.ai/new?q=' + encodeURIComponent(buildPrompt())));
  document.getElementById('askai-chatgpt').addEventListener('click', () =>
    go('https://chatgpt.com/?hints=search&q=' + encodeURIComponent(buildPrompt())));

  document.getElementById('askai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.getElementById('askai-claude').click();
    }
  });

  trapFocus(modal.querySelector('.askai-dialog'));
  document.getElementById('askai-btn')?.addEventListener('click', openAskAI);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      askaiOpen ? closeAskAI() : openAskAI();
    }
    if (e.key === 'Escape' && askaiOpen) closeAskAI();
  });
}

// ── Keyboard prev/next navigation (← / →) ───────────────────────
function initKeyboardNav() {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    // Only navigate when nothing is focused — arrow keys on focused
    // buttons, tabs, or scrollable code blocks must keep their meaning.
    const ae = document.activeElement;
    if (ae && ae !== document.body && ae !== document.documentElement) return;
    if (askaiOpen || searchOpen) return;

    if (e.key === 'ArrowRight') {
      const next = document.querySelector('.page-nav .pnav-right');
      if (next) window.location.href = next.href;
    } else if (e.key === 'ArrowLeft') {
      const prev = document.querySelector('.page-nav .pnav:not(.pnav-right):not(.pnav-empty)');
      if (prev) window.location.href = prev.href;
    }
  });
}

// ── Search ──────────────────────────────────────────────────────

// SEARCH_INDEX is loaded from assets/search-index.js (included before this script)
let searchIndex = null;

function buildSearchIndex() {
  if (searchIndex) return;
  searchIndex = (typeof SEARCH_INDEX !== 'undefined' ? SEARCH_INDEX : []).map(item => ({
    ...item,
    searchText: (item.heading + ' ' + item.text + ' ' + item.pageTitle + ' ' + item.section).toLowerCase(),
  }));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(str, terms) {
  const patterns = terms
    .filter(Boolean)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!patterns.length) return escapeHtml(str);
  // Single combined pass over the plain string: split() with a capture group
  // alternates unmatched/matched parts, so marks can never nest or re-match.
  const re = new RegExp(`(${patterns.join('|')})`, 'gi');
  return str
    .split(re)
    .map((part, i) => (i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join('');
}

function getSnippet(text, terms) {
  if (!text) return '';
  const lower = text.toLowerCase();
  let best = 0;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx !== -1) { best = Math.max(0, idx - 40); break; }
  }
  return text.slice(best, best + 140).trim();
}

function renderResults(query, container) {
  container.innerHTML = '';
  if (!query.trim()) {
    container.innerHTML = '<div class="search-empty">Type to search…</div>';
    return;
  }
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = (searchIndex || [])
    .map(item => {
      let score = 0;
      for (const t of terms) {
        if (item.heading.toLowerCase().includes(t)) score += 5;
        if (item.text.toLowerCase().includes(t)) score += 2;
        if (item.pageTitle.toLowerCase().includes(t)) score += 1;
      }
      return { item, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(r => r.item);

  if (!scored.length) {
    container.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
    return;
  }

  let lastSection = null;
  scored.forEach((item, i) => {
    if (item.section !== lastSection) {
      const sec = document.createElement('div');
      sec.className = 'search-section-label';
      sec.textContent = item.section;
      container.appendChild(sec);
      lastSection = item.section;
    }
    const snippet = getSnippet(item.text, terms);
    const a = document.createElement('a');
    a.href = item.url;
    a.className = 'search-result' + (i === 0 ? ' search-result-active' : '');
    a.innerHTML = `
      <div class="search-result-title">${highlight(item.heading, terms)}</div>
      ${snippet ? `<div class="search-result-snippet">${highlight(snippet, terms)}</div>` : ''}
      <div class="search-result-page">${escapeHtml(item.pageTitle)}</div>`;
    a.addEventListener('click', closeSearch);
    container.appendChild(a);
  });
}

let searchOpen = false;
let searchLastFocus = null;

function openSearch() {
  buildSearchIndex();
  searchOpen = true;
  searchLastFocus = document.activeElement;
  document.getElementById('search-modal').classList.add('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-empty">Type to search…</div>';
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch() {
  searchOpen = false;
  document.getElementById('search-modal').classList.remove('open');
  searchLastFocus?.focus?.();
  searchLastFocus = null;
}

function initSearch() {
  const modal = document.createElement('div');
  modal.id = 'search-modal';
  modal.innerHTML = `
    <div class="search-backdrop"></div>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search documentation">
      <div class="search-input-wrap">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;color:var(--text-muted)">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="search-input" class="search-dialog-input" placeholder="Search documentation…" autocomplete="off" spellcheck="false">
        <kbd class="search-close-kbd">ESC</kbd>
      </div>
      <div id="search-results" class="search-results-list">
        <div class="search-empty">Type to search…</div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('.search-backdrop').addEventListener('click', closeSearch);

  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => renderResults(input.value, results));
  input.addEventListener('keydown', e => {
    const items = [...results.querySelectorAll('.search-result')];
    let active = items.findIndex(el => el.classList.contains('search-result-active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[active]?.classList.remove('search-result-active');
      const next = Math.min(active + 1, items.length - 1);
      items[next]?.classList.add('search-result-active');
      items[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[active]?.classList.remove('search-result-active');
      const prev = Math.max(active - 1, 0);
      items[prev]?.classList.add('search-result-active');
      items[prev]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const el = results.querySelector('.search-result-active');
      if (el) { closeSearch(); window.location.href = el.href; }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });

  trapFocus(modal.querySelector('.search-dialog'));
  document.querySelector('.search-box')?.addEventListener('click', openSearch);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchOpen ? closeSearch() : openSearch(); }
    if (e.key === 'Escape' && searchOpen) closeSearch();
  });
}

// ── Code tabs (Move / CLI / SDK) ────────────────────────────────
function initCodeTabs() {
  document.querySelectorAll('.code-tabs').forEach(group => {
    group.querySelectorAll('.code-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        // Sync all tab groups on the page to the same selection
        document.querySelectorAll('.code-tabs').forEach(g => {
          const hasTarget = g.querySelector(`.code-tab[data-tab="${target}"]`);
          if (!hasTarget) return;
          g.querySelectorAll('.code-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === target)
          );
          g.querySelectorAll('.code-tab-panel').forEach(p =>
            p.classList.toggle('active', p.dataset.tab === target)
          );
        });
      });
    });
  });
}

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initSidebarNav === 'function') initSidebarNav();
  setActiveNav();
  initSidebar();
  initCopyButtons();
  initCodeTabs();
  initTOC();
  initHeadingAnchors();
  scrollToHash();
  initSearch();
  initAgentsMenu();
  initPageActions();
  initFeedback();
  initAskAI();
  initKeyboardNav();
});
