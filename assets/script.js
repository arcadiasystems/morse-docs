/* ═══════════════════════════════════════════════════════════════
   MORSE DOCUMENTATION · INTERACTIVE BEHAVIOURS
   ═══════════════════════════════════════════════════════════════ */

// Docs repo (for "Suggest changes" / feedback issues)
const DOCS_REPO = 'arcadiasystems/morse-dcms';

// Widest viewport that shows the sidebar as a sheet (keep in sync with docs.css)
const SHEET_MAX_WIDTH = 860;

const ASK_AI_ICON = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-2a2 2 0 0 0 1.3-1.3L12 3z"/></svg>';

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

// ── Button feedback ("Copied", "Copy failed") ──────────────────
const flashTimers = new WeakMap();

function flash(btn, text, ok) {
  const label = btn.querySelector('[data-flash-label]') ?? btn;
  label.dataset.idle ??= label.textContent.trim();
  label.textContent = text;
  btn.classList.toggle('is-done', ok);
  clearTimeout(flashTimers.get(btn));
  flashTimers.set(btn, setTimeout(() => {
    label.textContent = label.dataset.idle;
    btn.classList.remove('is-done');
  }, 1800));
}

// ── Active nav link ─────────────────────────────────────────────
function setActiveNav() {
  const filename = currentPage();
  document.querySelectorAll('.side a[data-page]').forEach(link => {
    const matches = link.getAttribute('data-page') === filename;
    link.classList.toggle('is-on', matches);
    if (!matches) return;
    link.setAttribute('aria-current', 'page');
    // Deep pages sit below the fold of the scrolling sidebar: bring them into view
    const side = link.closest('.side');
    if (side && link.offsetTop + link.offsetHeight > side.clientHeight) {
      side.scrollTop = link.offsetTop - side.clientHeight / 2;
    }
    link.addEventListener('click', e => {
      e.preventDefault();
      window.history.replaceState(null, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ── Sidebar sheet (mobile) ──────────────────────────────────────
function initMenu() {
  const btn = document.getElementById('menu');
  const side = document.getElementById('side');
  if (!btn || !side) return;

  const isOpen = () => side.classList.contains('is-open');
  const setOpen = open => {
    side.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  btn.addEventListener('click', () => setOpen(!isOpen()));
  // Following a link or opening Ask AI from the sheet dismisses it
  side.addEventListener('click', e => {
    if (e.target.closest('a, [data-askai]')) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
  });
  window.matchMedia(`(min-width: ${SHEET_MAX_WIDTH + 1}px)`).addEventListener('change', e => {
    if (e.matches) setOpen(false);
  });
}

// ── Code blocks: shell prompts + copy buttons ───────────────────
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh']);
const PROMPT_HTML = '<span class="p" aria-hidden="true">$ </span>';

// Colour the prompt for shell commands. Display only: copy uses the original text.
function decoratePrompts(pre, lang) {
  if (pre.children.length) return; // already highlighted markup
  const text = pre.textContent;
  // Transcript blocks ("example") already prefix commands with "$ " and mix in output
  if (text.split('\n').some(line => line.startsWith('$ '))) {
    pre.innerHTML = text.split('\n')
      .map(line => line.startsWith('$ ') ? PROMPT_HTML + escapeHtml(line.slice(2)) : escapeHtml(line))
      .join('\n');
    return;
  }
  if (!SHELL_LANGS.has(lang)) return;
  let continued = false;
  pre.innerHTML = text.split('\n').map(line => {
    const html = escapeHtml(line);
    const wasContinued = continued;
    continued = line.endsWith('\\');
    if (wasContinued || line.trim() === '') return html;
    if (line.trimStart().startsWith('#')) return `<span class="cm">${html}</span>`;
    return PROMPT_HTML + html;
  }).join('\n');
}

function initCodeBlocks() {
  document.querySelectorAll('.article .code-block').forEach(block => {
    const pre = block.querySelector('pre');
    if (!pre) return;
    const text = pre.textContent;
    const lang = block.querySelector('.code-lang')?.textContent.trim().toLowerCase() ?? '';
    decoratePrompts(pre, lang);

    const btn = block.querySelector('.code-copy');
    btn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        flash(btn, 'Copied', true);
      } catch {
        flash(btn, 'Copy failed', false);
      }
    });
  });
}

// ── On this page rail (auto-generated from h2/h3) ───────────────
function initTOC() {
  const toc = document.querySelector('.toc');
  const list = toc?.querySelector('.toc__list');
  const article = document.querySelector('.article');
  if (!list || !article) return;

  const headings = [...article.querySelectorAll('h2, h3')];
  if (!headings.length) { toc.hidden = true; return; }

  const usedIds = new Set();
  const links = headings.map(h => {
    if (!h.id) {
      const base = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let id = base;
      let n = 2;
      while (usedIds.has(id)) { id = base + '-' + n++; }
      h.id = id;
    }
    usedIds.add(h.id);

    const a = document.createElement('a');
    a.href = '#' + h.id;
    // A labelled step chip (data-label) doubles as the short rail entry
    a.textContent = h.dataset.label ?? h.textContent;
    if (h.tagName === 'H3') a.className = 'toc__sub';
    list.appendChild(a);
    return a;
  });

  // Highlight the last heading scrolled past the top bar; the final one at page end
  const topBar = document.querySelector('.top');
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!toc.offsetWidth) return; // rail hidden at this width
    const line = (topBar?.offsetHeight ?? 0) + 32;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let active = 0;
    if (atEnd) active = headings.length - 1;
    else headings.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) active = i; });

    links.forEach((a, i) => {
      a.classList.toggle('is-on', i === active);
      if (i === active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });

    // Long rails scroll on their own: keep the active entry in view
    const current = links[active];
    if (current.offsetTop < toc.scrollTop || current.offsetTop + current.offsetHeight > toc.scrollTop + toc.clientHeight) {
      toc.scrollTop = current.offsetTop - toc.clientHeight / 2;
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
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
// Re-run the jump once web fonts settle, since they shift the layout.
function scrollToHash() {
  if (!window.location.hash) return;
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  document.fonts.ready.then(() => target.scrollIntoView({ behavior: 'instant' }));
}

// ── Copy page (Markdown twin) + page actions menu ──────────────
async function copyPageMarkdown(btn) {
  if (!navigator.clipboard) { flash(btn, 'Copy unavailable', false); return; }
  try {
    // ClipboardItem with a promise keeps the user-activation window open
    // across the fetch (Safari revokes it after an intervening await).
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      const textPromise = fetch(markdownTwinUrl())
        .then(res => { if (!res.ok) throw new Error('md twin missing'); return res.text(); })
        .then(text => new Blob([text], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': textPromise })]);
    } else {
      const res = await fetch(markdownTwinUrl());
      if (!res.ok) throw new Error('md twin missing');
      await navigator.clipboard.writeText(await res.text());
    }
    flash(btn, 'Copied as Markdown', true);
  } catch {
    // Fallback: copy the rendered article text — report success only if it lands
    try {
      const article = document.querySelector('.article');
      if (!article) throw new Error('no article');
      const text = [...article.children]
        .filter(el => !el.classList.contains('page-actions'))
        .map(el => el.innerText)
        .join('\n\n');
      await navigator.clipboard.writeText(text);
      flash(btn, 'Copied', true);
    } catch {
      flash(btn, 'Copy failed', false);
    }
  }
}

function initPageActions() {
  const copyBtn = document.getElementById('copy-page');
  if (!copyBtn) return;
  copyBtn.addEventListener('click', () => copyPageMarkdown(copyBtn));

  const caret = document.getElementById('page-menu-btn');
  const menu = document.getElementById('page-menu');
  if (!caret || !menu) return;

  const setOpen = open => {
    menu.hidden = !open;
    caret.setAttribute('aria-expanded', String(open));
  };
  caret.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); caret.focus(); }
  });
  menu.addEventListener('click', e => {
    if (e.target.closest('.page-menu__item')) setOpen(false);
  });

  menu.querySelector('[data-page-copy]')?.addEventListener('click', () => copyPageMarkdown(copyBtn));

  const aiPrompt = `Read ${markdownTwinUrl()} so you can answer questions about "${document.title}". For full Morse docs context, read ${llmsFullUrl()}.`;
  const chatgpt = document.getElementById('page-chatgpt');
  if (chatgpt) chatgpt.href = 'https://chatgpt.com/?hints=search&q=' + encodeURIComponent(aiPrompt);
  const claude = document.getElementById('page-claude');
  if (claude) claude.href = 'https://claude.ai/new?q=' + encodeURIComponent(aiPrompt);
}

// ── Feedback widget ─────────────────────────────────────────────
function initFeedback() {
  const ask = document.getElementById('feedback');
  if (!ask) return;
  const page = currentPage();

  ask.querySelector('[data-feedback="yes"]')?.addEventListener('click', () => {
    ask.textContent = 'Thanks for the signal ·–·';
  });

  ask.querySelector('[data-feedback="no"]')?.addEventListener('click', () => {
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
      <div class="askai-header">${ASK_AI_ICON}Ask AI about Morse</div>
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

  // The top-bar pill is hidden on small screens, so the sheet carries its own entry
  const side = document.getElementById('side');
  if (side) {
    const sheetBtn = document.createElement('button');
    sheetBtn.type = 'button';
    sheetBtn.className = 'side__askai';
    sheetBtn.dataset.askai = '';
    sheetBtn.innerHTML = `${ASK_AI_ICON}Ask AI about Morse`;
    side.prepend(sheetBtn);
  }
  document.querySelectorAll('[data-askai]').forEach(btn => btn.addEventListener('click', openAskAI));

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

    const rel = { ArrowRight: 'next', ArrowLeft: 'prev' }[e.key];
    const link = rel && document.querySelector(`.pager a[rel="${rel}"]`);
    if (link) window.location.href = link.href;
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
        <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
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
  document.getElementById('search-open')?.addEventListener('click', openSearch);
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
  initMenu();
  initCodeBlocks();
  initCodeTabs();
  initTOC();
  initHeadingAnchors();
  scrollToHash();
  initSearch();
  initPageActions();
  initFeedback();
  initAskAI();
  initKeyboardNav();
});
