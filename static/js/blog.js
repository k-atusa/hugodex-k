/* hugodex-k blog.js — Theme, Copy, Tabs, Scroll-spy, Mobile */
(function () {
  'use strict';

  /* ── Theme Toggle ─────────────────────────────────────── */
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      reRenderMermaid(next);
      syncGiscusTheme(next);
    });
  }

  function reRenderMermaid(theme) {
    if (typeof mermaid === 'undefined') return;
    var containers = document.querySelectorAll('.mermaid-wrap');
    if (!containers.length) return;
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'neutral' });
    containers.forEach(function (wrap) {
      var src = wrap.getAttribute('data-mermaid-src');
      if (!src) return;
      var el = wrap.querySelector('.mermaid');
      if (!el) return;
      el.removeAttribute('data-processed');
      el.innerHTML = src;
    });
    mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
  }

  function syncGiscusTheme(theme) {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe) return;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: theme === 'dark' ? 'dark' : 'light' } } },
      'https://giscus.app'
    );
  }

  /* ── Code Copy Buttons ────────────────────────────────── */
  function initCodeCopyButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-code-btn');
      if (!btn) return;
      var block = btn.closest('.code-block') || btn.closest('.mermaid-wrap');
      var text = '';
      if (block && block.classList.contains('mermaid-wrap')) {
        text = block.getAttribute('data-mermaid-src') || '';
      } else if (block) {
        var pre = block.querySelector('pre');
        if (pre) {
          // Chroma with line numbers in table: grab only the code column
          var codeCell = pre.querySelector('td:last-child code');
          text = codeCell ? codeCell.textContent : pre.textContent;
        }
      }
      if (!text) return;
      var textSpan = btn.querySelector('.copy-text') || btn;
      var original = textSpan.textContent;
      navigator.clipboard.writeText(text).then(function () {
        textSpan.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          textSpan.textContent = original;
          btn.classList.remove('copied');
        }, 1800);
      });
    });
  }

  /* ── Tabs ──────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tabs-container').forEach(function (container) {
      var panes = container.querySelectorAll('.tab-pane');
      if (!panes.length) return;
      var nav = document.createElement('div');
      nav.className = 'tabs-nav';
      panes.forEach(function (pane, i) {
        var btn = document.createElement('button');
        btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
        btn.textContent = pane.getAttribute('data-tab-name') || 'Tab ' + (i + 1);
        btn.addEventListener('click', function () {
          nav.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
          panes.forEach(function (p) { p.classList.remove('active'); });
          btn.classList.add('active');
          pane.classList.add('active');
        });
        nav.appendChild(btn);
        pane.classList.toggle('active', i === 0);
      });
      container.insertBefore(nav, container.firstChild);
    });
  }

  /* ── Language Dropdown ─────────────────────────────────── */
  function initDropdowns() {
    document.querySelectorAll('.dropdown-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var menu = toggle.nextElementSibling;
        if (menu) menu.classList.toggle('show');
      });
    });
    document.addEventListener('click', function () {
      document.querySelectorAll('.dropdown-menu.show').forEach(function (m) { m.classList.remove('show'); });
    });
  }

  /* ── Mobile Menu ───────────────────────────────────────── */
  function initMobileMenu() {
    var btn = document.getElementById('mobile-menu-btn');
    var nav = document.getElementById('nav-menu');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
  }

  /* ── TOC Scroll-spy ────────────────────────────────────── */
  function initTOCScrollSpy() {
    var tocLinks = document.querySelectorAll('.toc-sidebar a');
    if (!tocLinks.length) return;
    var headings = [];
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href') || '').replace('#', '');
      var el = document.getElementById(id);
      if (el) headings.push({ el: el, link: a });
    });
    if (!headings.length) return;
    var active = null;
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY + 100;
      var current = headings[0];
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].el.offsetTop <= scrollY) current = headings[i];
      }
      if (current && current.link !== active) {
        if (active) active.classList.remove('active');
        current.link.classList.add('active');
        active = current.link;
      }
    }, { passive: true });
  }

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initCodeCopyButtons();
    initTabs();
    initDropdowns();
    initMobileMenu();
    initTOCScrollSpy();
  });
})();
