/* ==========================================================================
   Minimalist Engineering Blog Client Scripts
   Theme, Language Toggle, Infinite Scroll with History State, Copy Code, Tabs, View Switcher
   ========================================================================== */

(function () {
  'use strict';

  /* ── 1. Theme Toggle ────────────────────────────────────── */
  function initThemeToggle() {
    var btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var html = document.documentElement;
      var current = html.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';

      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);

      reRenderMermaid(next);
    });
  }

  function reRenderMermaid(theme) {
    if (typeof mermaid === 'undefined') return;
    var nodes = document.querySelectorAll('.mermaid');
    if (!nodes.length) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose'
    });
    nodes.forEach(function (el) {
      var src = el.getAttribute('data-mermaid-src') || el.closest('.mermaid-wrap')?.getAttribute('data-mermaid-src');
      if (!src) return;
      el.removeAttribute('data-processed');
      el.innerHTML = src;
    });
    mermaid.run({ nodes: nodes }).catch(function (err) {
      console.warn('Mermaid re-render notice:', err);
    });
  }

  /* ── 2. Language & Mobile Menu Dropdowns ─────────────────── */
  function initDropdowns() {
    var langBtn = document.getElementById('langToggleBtn');
    var langMenu = document.getElementById('langMenu');

    if (langBtn && langMenu) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        langMenu.classList.toggle('show');
      });

      document.addEventListener('click', function (e) {
        if (!langMenu.contains(e.target) && e.target !== langBtn) {
          langMenu.classList.remove('show');
        }
      });
    }

    var mobileBtn = document.getElementById('mobileMenuBtn');
    var headerNav = document.getElementById('headerNav');
    if (mobileBtn && headerNav) {
      mobileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        headerNav.classList.toggle('show');
      });
    }
  }

  /* ── 3. Code Copy Buttons ────────────────────────────────── */
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

  /* ── 4. Infinite Scroll with History Preservation ───────── */
  function initInfiniteScroll() {
    var stream = document.getElementById('postsStream');
    var trigger = document.getElementById('infiniteScrollTrigger');
    var loader = document.getElementById('infiniteScrollLoader');
    if (!stream || !trigger) return;

    var storageKeyHtml = 'scroll_html_' + window.location.pathname;
    var storageKeyNext = 'scroll_next_' + window.location.pathname;
    var storageKeyPos = 'scroll_pos_' + window.location.pathname;

    // Restore state on back navigation
    var savedHtml = sessionStorage.getItem(storageKeyHtml);
    var savedNext = sessionStorage.getItem(storageKeyNext);
    var savedPos = sessionStorage.getItem(storageKeyPos);

    if (savedHtml) {
      stream.innerHTML = savedHtml;
      if (savedNext) {
        trigger.setAttribute('data-next-url', savedNext);
      } else {
        trigger.remove();
        if (loader) loader.remove();
      }
      if (savedPos) {
        setTimeout(function () {
          window.scrollTo(0, parseInt(savedPos, 10));
        }, 50);
      }
    }

    // Save scroll position before leaving
    window.addEventListener('beforeunload', function () {
      sessionStorage.setItem(storageKeyPos, window.scrollY.toString());
      sessionStorage.setItem(storageKeyHtml, stream.innerHTML);
      var currentNext = trigger ? trigger.getAttribute('data-next-url') : '';
      sessionStorage.setItem(storageKeyNext, currentNext || '');
    });

    var loading = false;

    function loadNextPage() {
      if (loading || !trigger) return;
      var nextUrl = trigger.getAttribute('data-next-url');
      if (!nextUrl) {
        if (loader) loader.remove();
        trigger.remove();
        return;
      }

      loading = true;
      if (loader) loader.style.display = 'block';

      fetch(nextUrl)
        .then(function (res) {
          if (!res.ok) throw new Error('Network error');
          return res.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var newCards = doc.querySelectorAll('#postsStream .post-card');

          newCards.forEach(function (card) {
            stream.appendChild(card);
          });

          var newTrigger = doc.getElementById('infiniteScrollTrigger');
          if (newTrigger && newTrigger.getAttribute('data-next-url')) {
            trigger.setAttribute('data-next-url', newTrigger.getAttribute('data-next-url'));
          } else {
            trigger.removeAttribute('data-next-url');
            trigger.remove();
            if (loader) loader.remove();
          }

          // Cache updated state
          sessionStorage.setItem(storageKeyHtml, stream.innerHTML);
          sessionStorage.setItem(storageKeyNext, trigger ? (trigger.getAttribute('data-next-url') || '') : '');
          loading = false;
          if (loader) loader.style.display = 'none';
        })
        .catch(function () {
          loading = false;
          if (loader) loader.style.display = 'none';
        });
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      }, { rootMargin: '300px' });
      observer.observe(trigger);
    } else {
      window.addEventListener('scroll', function () {
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 500)) {
          loadNextPage();
        }
      }, { passive: true });
    }
  }

  /* ── 5. Tabs Component ───────────────────────────────────── */
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

  /* ── 6. Post List View Switcher (List / Large / Small) ───── */
  function initViewSwitcher() {
    var switcher = document.getElementById('viewSwitcher');
    var stream = document.getElementById('postsStream');
    if (!switcher || !stream) return;

    var storageKey = 'hugodex_view_mode';
    var savedMode = localStorage.getItem(storageKey) || 'list';

    function setViewMode(mode) {
      if (mode !== 'list' && mode !== 'large-block' && mode !== 'small-block') {
        mode = 'list';
      }
      stream.setAttribute('data-view', mode);
      switcher.querySelectorAll('.view-btn').forEach(function (btn) {
        if (btn.getAttribute('data-view') === mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      localStorage.setItem(storageKey, mode);
    }

    // Initialize with saved or default mode
    setViewMode(savedMode);

    switcher.addEventListener('click', function (e) {
      var btn = e.target.closest('.view-btn');
      if (!btn) return;
      var mode = btn.getAttribute('data-view');
      if (mode) setViewMode(mode);
    });
  }

  /* ── 7. Init on DOM Ready ────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initDropdowns();
    initCodeCopyButtons();
    initInfiniteScroll();
    initTabs();
    initViewSwitcher();
  });
})();
