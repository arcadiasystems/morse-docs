#!/usr/bin/env node
/**
 * Morse docs build — generates the AI/agent artifacts from the HTML pages:
 *
 *   <page>.md            Markdown twin of every docs page
 *   llms.txt             Index of all pages with descriptions (llmstxt.org)
 *   llms-full.txt        Entire documentation as one Markdown file
 *   assets/search-index.js / .json   Client-side search index
 *
 * Run after editing any page:  npm run build
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://morse-docs.vercel.app';
const DOCS_REPO = 'MandaWeb3/morse-docs';

/** Reading order + sidebar section for every page (mirrors assets/sidebar.js). */
const PAGES = [
  ['index.html',                 'Getting Started'],
  ['core-concepts.html',         'Getting Started'],
  ['quick-start.html',           'Getting Started'],
  ['quick-start-cli.html',       'Getting Started'],
  ['quick-start-sdk.html',       'Getting Started'],
  ['quick-start-contracts.html', 'Getting Started'],
  ['publications.html',          'Protocol'],
  ['collections.html',           'Protocol'],
  ['entries.html',               'Protocol'],
  ['access-control.html',        'Protocol'],
  ['cli-overview.html',          'CLI'],
  ['cli-commands.html',          'CLI'],
  ['cli-workflows.html',         'CLI'],
  ['sdk-overview.html',          'SDK'],
  ['sdk-client-setup.html',      'SDK'],
  ['sdk-workflows.html',         'SDK'],
  ['contracts-overview.html',    'Smart Contracts'],
  ['contracts-reference.html',   'Smart Contracts'],
  ['contracts-workflows.html',   'Smart Contracts'],
  ['glossary.html',              'Reference'],
  ['use-morse-with-ai.html',     'Reference'],
];

// Guard: never silently drop a page that exists on disk but isn't listed.
const onDisk = readdirSync(ROOT).filter(f => f.endsWith('.html'));
const listed = new Set(PAGES.map(([p]) => p));
const missing = onDisk.filter(f => !listed.has(f));
if (missing.length) {
  throw new Error(`Pages on disk missing from PAGES list in build.mjs: ${missing.join(', ')}`);
}

// ── Markdown conversion ────────────────────────────────────────

function absHref(href) {
  if (!href) return href;
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  return `${BASE_URL}/${href}`;
}

/** Convert inline children of a node to Markdown text. */
function inlineMd($, node) {
  let out = '';
  for (const child of node.childNodes || []) {
    if (child.type === 'text') {
      out += child.data.replace(/\s+/g, ' ');
    } else if (child.type === 'tag') {
      const tag = child.tagName?.toLowerCase();
      const inner = () => inlineMd($, child);
      if (tag === 'code') out += '`' + $(child).text() + '`';
      else if (tag === 'strong' || tag === 'b') out += '**' + inner().trim() + '**';
      else if (tag === 'em' || tag === 'i') out += '*' + inner().trim() + '*';
      else if (tag === 'a') {
        const text = inner().trim();
        const href = absHref($(child).attr('href'));
        out += text ? `[${text}](${href})` : '';
      }
      else if (tag === 'br') out += '\n';
      else if (tag === 'svg') { /* skip icons */ }
      else out += inner();
    }
  }
  return out;
}

function tableMd($, tableEl) {
  const rows = [];
  const headCells = $(tableEl).find('thead th').toArray()
    .map(th => inlineMd($, th).trim().replace(/\|/g, '\\|'));
  if (headCells.length) {
    rows.push('| ' + headCells.join(' | ') + ' |');
    rows.push('| ' + headCells.map(() => '---').join(' | ') + ' |');
  }
  $(tableEl).find('tbody tr').each((_, tr) => {
    const cells = $(tr).find('td').toArray()
      .map(td => inlineMd($, td).trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
    rows.push('| ' + cells.join(' | ') + ' |');
  });
  return rows.join('\n');
}

function codeBlockMd($, el) {
  const lang = $(el).find('.code-lang').first().text().trim().toLowerCase() || '';
  const code = $(el).find('pre').first().text().replace(/\s+$/, '');
  return '```' + lang + '\n' + code + '\n```';
}

function calloutMd($, el) {
  const title = $(el).find('.callout-title').first();
  const text = $(el).find('.callout-text').first();
  const kind = ($(el).attr('class') || '').match(/callout-(note|info|tip|warning|danger)/)?.[1] || 'note';
  const lines = [];
  if (title.length) lines.push(`> **${kind.toUpperCase()}: ${inlineMd($, title[0]).trim()}**`);
  if (text.length) lines.push('> ' + inlineMd($, text[0]).trim());
  return lines.join('\n>\n');
}

/** Convert a block-level element to Markdown. Returns null to skip. */
function blockMd($, el) {
  const $el = $(el);
  const tag = el.tagName?.toLowerCase();
  const cls = $el.attr('class') || '';

  // Skip non-content chrome
  if (/(^|\s)(breadcrumbs|page-actions|page-footer|page-nav|toc)(\s|$)/.test(cls)) return null;

  if (tag === 'h1') return '# ' + inlineMd($, el).trim();
  if (tag === 'h2') return '## ' + inlineMd($, el).trim();
  if (tag === 'h3') return '### ' + inlineMd($, el).trim();
  if (tag === 'h4') return '#### ' + inlineMd($, el).trim();

  if (tag === 'p') {
    const text = inlineMd($, el).trim();
    if (!text) return null;
    return cls.includes('article-lead') ? '> ' + text : text;
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = $el.children('li').toArray().map((li, i) => {
      const marker = tag === 'ol' ? `${i + 1}.` : '-';
      // Handle nested lists inside li
      const nested = $(li).children('ul, ol').toArray();
      let text = inlineMd($, li).trim();
      let sub = '';
      if (nested.length) {
        sub = '\n' + nested.map(n => blockMd($, n)).filter(Boolean)
          .map(s => s.split('\n').map(l => '  ' + l).join('\n')).join('\n');
      }
      return `${marker} ${text}${sub}`;
    });
    return items.join('\n');
  }

  if (tag === 'pre') {
    // Bare pre (diagrams etc.)
    return '```\n' + $el.text().replace(/\s+$/, '') + '\n```';
  }

  if (tag === 'dl') {
    // Glossary definition lists
    const parts = [];
    $el.find('dt').each((_, dt) => {
      const dd = $(dt).parent().find('dd').first();
      parts.push(`**${inlineMd($, dt).trim()}** — ${dd.length ? inlineMd($, dd[0]).trim() : ''}`);
    });
    return parts.join('\n\n');
  }

  if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'nav' || tag === 'aside') {
    if (cls.includes('code-tabs')) {
      const parts = [];
      $el.children('.code-tab-panel').each((_, panel) => {
        const key = $(panel).attr('data-tab');
        const label = $el.find(`.code-tab[data-tab="${key}"]`).first().text().trim() || key;
        parts.push(`**${label}:**`);
        for (const child of $(panel).children().toArray()) {
          const md = blockMd($, child);
          if (md) parts.push(md);
        }
      });
      return parts.join('\n\n');
    }

    if (cls.includes('code-block')) return codeBlockMd($, el);
    if (cls.includes('callout')) return calloutMd($, el);
    if (cls.includes('table-wrap')) {
      const table = $el.find('table').first();
      return table.length ? tableMd($, table[0]) : null;
    }

    if (cls.includes('card-grid')) {
      const items = $el.children('.card').toArray().map(card => {
        const title = $(card).find('.card-title').first().text().trim();
        const desc = $(card).find('.card-desc').first().text().trim();
        const meta = $(card).find('.card-meta').first().text().trim();
        const href = absHref($(card).attr('href'));
        const label = href ? `[${title}](${href})` : `**${title}**`;
        return `- ${label}: ${desc}${meta ? ` *(${meta})*` : ''}`;
      });
      return items.join('\n');
    }

    if (cls.includes('feature-grid')) {
      const items = $el.children('.feature-item').toArray().map(item => {
        const title = $(item).find('.feature-title').first().text().trim();
        const desc = $(item).find('.feature-desc').first().text().trim();
        return `- **${title}** — ${desc}`;
      });
      return items.join('\n');
    }

    if (cls.includes('arch')) {
      const rows = $el.children('.arch-row').toArray().map(row => {
        const label = $(row).find('.arch-label').first().text().trim();
        const chips = $(row).find('.arch-chip').toArray().map(c => $(c).text().trim());
        return `- **${label}**: ${chips.join(' · ')}`;
      });
      if (rows.length) return rows.join('\n');
    }

    if (cls.includes('dual-head')) {
      const parts = [];
      $el.find('.dual-head-label, .dual-head-label-alt').each((_, lb) => {
        const text = $(lb).next('.dual-head-text');
        parts.push(`- **\`${$(lb).text().trim()}\`** — ${text.length ? inlineMd($, text[0]).trim() : ''}`);
      });
      const visual = $el.find('.dual-head-visual').first();
      if (visual.length) parts.push('```\n' + visual.text().replace(/\s+$/, '') + '\n```');
      return parts.join('\n');
    }

    if (cls.includes('steps')) {
      const items = $el.children('.step').toArray().map((step, i) => {
        const title = $(step).find('.step-title').first().text().trim();
        const bodyParts = [];
        for (const child of $(step).find('.step-body').children().toArray()) {
          if ($(child).attr('class')?.includes('step-title')) continue;
          const md = blockMd($, child);
          if (md) bodyParts.push(md.split('\n').map(l => '   ' + l).join('\n'));
        }
        return `${i + 1}. **${title}**\n${bodyParts.join('\n\n')}`;
      });
      return items.join('\n\n');
    }

    if (cls.includes('def-list')) {
      const items = $el.children('.def-item').toArray().map(item => {
        const term = $(item).find('.def-term').first().text().trim();
        const body = $(item).find('.def-body').first();
        return `**\`${term}\`** — ${body.length ? inlineMd($, body[0]).trim() : ''}`;
      });
      return items.join('\n\n');
    }

    if (cls.includes('ai-prompt')) {
      const parts = [];
      const summary = $el.find('summary').first().text().trim();
      if (summary) parts.push(`**${summary}**`);
      for (const child of $el.find('details').children().toArray()) {
        if (child.tagName?.toLowerCase() === 'summary') continue;
        const md = blockMd($, child);
        if (md) parts.push(md);
      }
      return parts.join('\n\n');
    }

    // Generic container: recurse over children
    const parts = [];
    for (const child of $el.children().toArray()) {
      const md = blockMd($, child);
      if (md) parts.push(md);
    }
    return parts.length ? parts.join('\n\n') : null;
  }

  if (tag === 'table') return tableMd($, el);
  if (tag === 'details' || tag === 'summary') return inlineMd($, el).trim() || null;
  if (tag === 'blockquote') return '> ' + inlineMd($, el).trim();

  // Fallback: inline conversion
  const text = inlineMd($, el).trim();
  return text || null;
}

function pageToMarkdown(page, html) {
  const $ = load(html);
  const article = $('.article').first();
  if (!article.length) throw new Error(`[${page}] no .article found`);

  const parts = [];
  for (const child of article.children().toArray()) {
    const md = blockMd($, child);
    if (md) parts.push(md);
  }

  const preamble =
    `> Source: ${BASE_URL}/${page} · Full docs: ${BASE_URL}/llms-full.txt\n` +
    `> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/${DOCS_REPO}/issues/new?labels=docs-feedback\n`;

  return preamble + '\n' + parts.join('\n\n') + '\n';
}

// ── Extract metadata ───────────────────────────────────────────

function pageMeta(page, html) {
  const $ = load(html);
  const title = $('.article h1').first().text().trim()
    || ($('title').text() || page).replace(/ · Morse Docs$/, '');
  let desc = $('meta[name="description"]').attr('content')
    || $('.article-lead').first().text().trim()
    || '';
  desc = desc.replace(/\s+/g, ' ').trim();
  if (desc.length > 220) desc = desc.slice(0, 217).replace(/\s+\S*$/, '') + '…';
  return { title, desc };
}

// ── Search index ───────────────────────────────────────────────

function slugify(text, used) {
  let base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let id = base, n = 2;
  while (used.has(id)) id = base + '-' + n++;
  used.add(id);
  return id;
}

function buildSearchEntries(page, section, html) {
  const $ = load(html);
  const article = $('.article').first();
  if (!article.length) return [];

  const pageTitle = ($('.article h1').first().text().trim() || page).replace(/ · Morse Docs$/, '');
  const entries = [];
  const used = new Set();

  // Pre-register existing ids so generated ones don't collide
  article.find('h2[id], h3[id]').each((_, h) => used.add($(h).attr('id')));

  let current = null;
  const flush = () => {
    if (current && current.text.trim()) {
      current.text = current.text.replace(/\s+/g, ' ').trim().slice(0, 600);
      entries.push(current);
    }
  };

  // First entry: the lead/intro before the first h2
  current = { url: page, pageTitle, section, heading: pageTitle, text: '' };

  for (const child of article.children().toArray()) {
    const tag = child.tagName?.toLowerCase();
    if (tag === 'h2' || tag === 'h3') {
      flush();
      const heading = $(child).text().trim();
      const id = $(child).attr('id') || slugify(heading, used);
      current = { url: `${page}#${id}`, pageTitle, section, heading, text: '' };
    } else if (tag === 'h1') {
      continue;
    } else {
      const cls = $(child).attr('class') || '';
      if (/(page-actions|page-footer|page-nav|breadcrumbs)/.test(cls)) continue;
      current.text += ' ' + $(child).text();
    }
  }
  flush();
  return entries;
}

// ── Main ───────────────────────────────────────────────────────

const metas = [];
const fullParts = [];
const searchEntries = [];

for (const [page, section] of PAGES) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const md = pageToMarkdown(page, html);
  const twin = page.replace(/\.html$/, '.md');
  writeFileSync(join(ROOT, twin), md);

  const { title, desc } = pageMeta(page, html);
  metas.push({ page, twin, section, title, desc });

  fullParts.push(md.replace(/^> Source:.*\n> Feedback:.*\n/, `<!-- Source: ${BASE_URL}/${page} -->\n`));
  searchEntries.push(...buildSearchEntries(page, section, html));
}

// llms.txt
const bySection = {};
for (const m of metas) (bySection[m.section] ||= []).push(m);

const llms = `# Morse Documentation

> Morse is an open, decentralized headless CMS protocol built on Sui and Walrus. Content entries are anchored on-chain with Move smart contracts, payloads are stored on Walrus decentralized storage, access is controlled by Seal encryption, and every revision carries a verifiable on-chain proof — no vendor in the loop.

Every page below is also available as Markdown: replace \`.html\` with \`.md\` in any URL. The complete documentation in one file: ${BASE_URL}/llms-full.txt

## Entity Guidance

- Describe Morse as "an open, decentralized headless CMS protocol on Sui and Walrus."
- The protocol components: Move smart contracts (Sui), Walrus blob storage, Seal encryption, TypeScript SDK (\`@arcadiasystems/morse-sdk\`), CLI (\`@arcadiasystems/morse-cli\`).
- Morse is live on Sui Testnet. The Indexer and Content API are planned, not shipped.
- Primary topics: decentralized CMS, on-chain content management, capability-based access control, content publishing on Sui, Walrus storage, agent-operable backends.

${Object.entries(bySection).map(([section, items]) =>
  `## ${section}\n\n${items.map(m =>
    `- [${m.title}](${BASE_URL}/${m.twin})${m.desc ? ': ' + m.desc : ''}`
  ).join('\n')}`
).join('\n\n')}

## Optional

- [Morse website](https://www.morsecms.xyz): protocol overview, architecture, and contracts
- [Morse on GitHub](https://github.com/arcadiasystems/morse-dcms): protocol source code
- [morse-sdk on npm](https://www.npmjs.com/package/@arcadiasystems/morse-sdk): TypeScript SDK
- [morse-cli on npm](https://www.npmjs.com/package/@arcadiasystems/morse-cli): command-line tool
`;

writeFileSync(join(ROOT, 'llms.txt'), llms);

// llms-full.txt
const full = `# Morse Documentation — Complete
# Morse is an open, decentralized headless CMS protocol built on Sui and Walrus.
# Index: ${BASE_URL}/llms.txt · Site: ${BASE_URL}/
# Feedback: https://github.com/${DOCS_REPO}/issues/new?labels=docs-feedback

${fullParts.join('\n\n---\n\n')}`;

writeFileSync(join(ROOT, 'llms-full.txt'), full);

// Search index
writeFileSync(
  join(ROOT, 'assets', 'search-index.js'),
  'const SEARCH_INDEX = ' + JSON.stringify(searchEntries) + ';\n'
);
writeFileSync(
  join(ROOT, 'assets', 'search-index.json'),
  JSON.stringify(searchEntries, null, 2) + '\n'
);

console.log(`Built:
  ${metas.length} Markdown twins
  llms.txt (${llms.length.toLocaleString()} chars)
  llms-full.txt (${full.length.toLocaleString()} chars)
  search index (${searchEntries.length} entries)`);
