/* ═══════════════════════════════════════════════════════════════
   MORSE dCMS DOCUMENTATION  INTERACTIVE BEHAVIOURS
   ═══════════════════════════════════════════════════════════════ */

// ── Active nav link ─────────────────────────────────────────────
function setActiveNav() {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    const matches =
      (filename === page) ||
      (filename === '' && page === 'index.html') ||
      (filename === 'index.html' && page === 'index.html');
    link.classList.toggle('active', matches);
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

  headings.forEach(h => {
    if (!h.id) {
      h.id = h.textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

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
  }, { rootMargin: `-${document.documentElement.style.getPropertyValue('--header-h') || '58'}px 0px -65% 0px` });

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
    const headerH = 64;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 150);
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

function highlight(str, terms) {
  let result = str;
  for (const t of terms) {
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  }
  return result;
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
  const scored = searchIndex
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
    container.innerHTML = `<div class="search-empty">No results for "<strong>${query}</strong>"</div>`;
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
      <div class="search-result-page">${item.pageTitle}</div>`;
    a.addEventListener('click', closeSearch);
    container.appendChild(a);
  });
}

let searchOpen = false;

function openSearch() {
  buildSearchIndex();
  searchOpen = true;
  document.getElementById('search-modal').classList.add('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-empty">Type to search…</div>';
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch() {
  searchOpen = false;
  document.getElementById('search-modal').classList.remove('open');
}

function initSearch() {
  const modal = document.createElement('div');
  modal.id = 'search-modal';
  modal.innerHTML = `
    <div class="search-backdrop"></div>
    <div class="search-dialog">
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

  document.querySelector('.search-box')?.addEventListener('click', openSearch);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchOpen ? closeSearch() : openSearch(); }
    if (e.key === 'Escape' && searchOpen) closeSearch();
  });
}

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initSidebar();
  initCopyButtons();
  initTOC();
  initHeadingAnchors();
  scrollToHash();
  initSearch();
});
