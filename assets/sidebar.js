function initSidebarNav() {
  var nav = document.querySelector('#sidebar > nav');
  if (!nav) return;

  var filename = window.location.pathname.split('/').pop() || 'index.html';
  var isQuickStart = filename.startsWith('quick-start');
  var collapseClass = isQuickStart ? 'nav-sub-expanded' : 'nav-sub-collapsed';
  var chevron = isQuickStart ? '&#9662;' : '&#9656;';

  nav.innerHTML =
    '<div class="nav-section">'
    + '<div class="nav-section-title">Getting Started</div>'
    + '<ul class="nav-list">'
    + '<li><a href="index.html" class="nav-link" data-page="index.html">Introduction</a></li>'
    + '<li><a href="core-concepts.html" class="nav-link" data-page="core-concepts.html">Core Concepts</a></li>'
    + '<li>'
    + '<a href="quick-start.html" class="nav-link" data-page="quick-start.html">Quick Start</a>'
    + '<span class="nav-toggle" aria-label="Toggle sub-pages">' + chevron + '</span>'
    + '</li>'
    + '<li class="nav-sub-container ' + collapseClass + '"><ul class="nav-list nav-list-sub">'
    + '<li><a href="quick-start-cli.html" class="nav-link nav-link-sub" data-page="quick-start-cli.html">CLI</a></li>'
    + '<li><a href="quick-start-sdk.html" class="nav-link nav-link-sub" data-page="quick-start-sdk.html">SDK</a></li>'
    + '<li><a href="quick-start-contracts.html" class="nav-link nav-link-sub" data-page="quick-start-contracts.html">Smart Contracts</a></li>'
    + '</ul></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">Protocol</div>'
    + '<ul class="nav-list">'
    + '<li><a href="publications.html" class="nav-link" data-page="publications.html">Publications</a></li>'
    + '<li><a href="collections.html" class="nav-link" data-page="collections.html">Collections</a></li>'
    + '<li><a href="entries.html" class="nav-link" data-page="entries.html">Entries &amp; Revisions</a></li>'
    + '<li><a href="access-control.html" class="nav-link" data-page="access-control.html">Access Control</a></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">CLI</div>'
    + '<ul class="nav-list">'
    + '<li><a href="cli-overview.html" class="nav-link" data-page="cli-overview.html">Overview</a></li>'
    + '<li><a href="cli-commands.html" class="nav-link" data-page="cli-commands.html">Commands</a></li>'
    + '<li><a href="cli-workflows.html" class="nav-link" data-page="cli-workflows.html">Cookbooks</a></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">SDK</div>'
    + '<ul class="nav-list">'
    + '<li><a href="sdk-overview.html" class="nav-link" data-page="sdk-overview.html">Overview</a></li>'
    + '<li><a href="sdk-client-setup.html" class="nav-link" data-page="sdk-client-setup.html">Setup</a></li>'
    + '<li><a href="sdk-workflows.html" class="nav-link" data-page="sdk-workflows.html">Cookbooks</a></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">Smart Contracts</div>'
    + '<ul class="nav-list">'
    + '<li><a href="contracts-overview.html" class="nav-link" data-page="contracts-overview.html">Overview</a></li>'
    + '<li><a href="contracts-reference.html" class="nav-link" data-page="contracts-reference.html">Reference</a></li>'
    + '<li><a href="contracts-workflows.html" class="nav-link" data-page="contracts-workflows.html">Cookbooks</a></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">Indexer <span class="nav-badge-soon">Soon</span></div>'
    + '<ul class="nav-list">'
    + '<li><a href="#" class="nav-link nav-disabled">Overview</a></li>'
    + '</ul></div>'

    + '<div class="nav-divider"></div>'

    + '<div class="nav-section">'
    + '<div class="nav-section-title">Reference</div>'
    + '<ul class="nav-list">'
    + '<li><a href="glossary.html" class="nav-link" data-page="glossary.html">Glossary</a></li>'
    + '</ul></div>';

  // Chevron toggle for Quick Start sub-pages
  var chevronEl = nav.querySelector('.nav-toggle');
  if (chevronEl) {
    chevronEl.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var container = nav.querySelector('.nav-sub-container');
      if (!container) return;
      var isCollapsed = container.classList.contains('nav-sub-collapsed');
      if (isCollapsed) {
        container.classList.remove('nav-sub-collapsed');
        container.classList.add('nav-sub-expanded');
        chevronEl.innerHTML = '&#9662;';
      } else {
        container.classList.remove('nav-sub-expanded');
        container.classList.add('nav-sub-collapsed');
        chevronEl.innerHTML = '&#9656;';
      }
    });
  }
}
