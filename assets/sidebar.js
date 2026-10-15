/* Sidebar tree for every docs page. Order mirrors PAGES in scripts/build.mjs. */
const NAV_SECTIONS = [
  { title: 'Getting started', items: [
    { page: 'index.html', label: 'Introduction' },
    { page: 'core-concepts.html', label: 'Core Concepts' },
    { page: 'quick-start.html', label: 'Quick Start', children: [
      { page: 'quick-start-cli.html', label: 'CLI' },
      { page: 'quick-start-sdk.html', label: 'SDK' },
      { page: 'quick-start-contracts.html', label: 'Smart Contracts' },
    ] },
  ] },
  { title: 'Protocol', items: [
    { page: 'publications.html', label: 'Publications' },
    { page: 'collections.html', label: 'Collections' },
    { page: 'entries.html', label: 'Entries &amp; Revisions' },
    { page: 'access-control.html', label: 'Access Control' },
    { page: 'recipient-files.html', label: 'Recipient Files' },
  ] },
  { title: 'CLI', items: [
    { page: 'cli-overview.html', label: 'Overview' },
    { page: 'cli-commands.html', label: 'Commands' },
    { page: 'cli-workflows.html', label: 'Cookbooks' },
  ] },
  { title: 'SDK', items: [
    { page: 'sdk-overview.html', label: 'Overview' },
    { page: 'sdk-client-setup.html', label: 'Setup' },
    { page: 'sdk-workflows.html', label: 'Cookbooks' },
  ] },
  { title: 'Smart contracts', items: [
    { page: 'contracts-overview.html', label: 'Overview' },
    { page: 'contracts-reference.html', label: 'Reference' },
    { page: 'contracts-workflows.html', label: 'Cookbooks' },
  ] },
  { title: 'Indexer', items: [
    { label: 'Overview', tag: 'Q1 2027' },
  ] },
  { title: 'Reference', items: [
    { page: 'glossary.html', label: 'Glossary' },
    { page: 'use-morse-with-ai.html', label: 'Use Morse with AI' },
  ] },
];

function navItemHtml(item) {
  // Unshipped pages render as plain text with a release tag, never as a link
  const self = item.page
    ? `<a href="${item.page}" data-page="${item.page}">${item.label}</a>`
    : `<span class="side__soon">${item.label} <span class="tag">${item.tag}</span></span>`;
  const children = item.children
    ? `<ul class="sub">${item.children.map(navItemHtml).join('')}</ul>`
    : '';
  return `<li>${self}${children}</li>`;
}

function initSidebarNav() {
  const side = document.getElementById('side');
  if (!side) return;

  const sections = NAV_SECTIONS.map((section, i) => {
    const id = `side-group-${i}`;
    return `<p class="side__label" id="${id}">${section.title}</p>`
      + `<ul aria-labelledby="${id}">${section.items.map(navItemHtml).join('')}</ul>`;
  }).join('');

  side.innerHTML =
    '<div class="agentbox">'
    + '<p class="agentbox__title">For agents</p>'
    + '<a href="llms.txt">llms.txt<small>Compact index of every docs page.</small></a>'
    + '<a href="llms-full.txt">llms-full.txt<small>The whole documentation as one file.</small></a>'
    + '</div>'
    + `<nav aria-label="Documentation">${sections}</nav>`;
}
