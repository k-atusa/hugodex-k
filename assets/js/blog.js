/**
 * hugodex-k : Global Client Utilities
 * Robust Theme switcher, code copier, tabs initializer, TOC scrollspy, Mermaid re-render
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initCodeCopyButtons();
  initTabs();
  initDropdowns();
  initMobileMenu();
  initTOCScrollSpy();
});

/* 1. Theme Toggle & Mermaid Synchronization */
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hugodex_theme', newTheme);

    // Giscus 테마 동기화 (iframe postMessage)
    updateGiscusTheme(newTheme);

    // Mermaid 재렌더링
    reRenderMermaid(newTheme);
  });
}

function updateGiscusTheme(theme) {
  const iframe = document.querySelector('iframe.giscus-frame');
  if (!iframe) return;
  const giscusTheme = theme === 'dark' ? 'dark_dimmed' : 'light';
  iframe.contentWindow.postMessage({
    giscus: { setConfig: { theme: giscusTheme } }
  }, 'https://giscus.app');
}

function reRenderMermaid(theme) {
  if (typeof mermaid === 'undefined') return;
  
  const mermaidNodes = document.querySelectorAll('.mermaid');
  if (mermaidNodes.length === 0) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  });

  mermaidNodes.forEach((node) => {
    // 원본 소스 복원 후 재렌더링 플래그 초기화
    const originalSrc = node.getAttribute('data-mermaid-src');
    if (originalSrc) {
      node.removeAttribute('data-processed');
      node.innerHTML = originalSrc;
    }
  });

  mermaid.run({
    nodes: mermaidNodes
  });
}

/* 2. One-click Code & Diagram Copy Buttons */
function initCodeCopyButtons() {
  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parent = btn.closest('.code-block-container, .mermaid-container');
      if (!parent) return;

      let codeToCopy = '';
      const pre = parent.querySelector('pre');
      const mermaidNode = parent.querySelector('.mermaid');

      if (pre) {
        // 일반 코드 블록 (줄번호 제외 텍스트 추출)
        const codeLines = pre.querySelectorAll('.lntd:last-child code, code');
        if (codeLines.length > 0) {
          codeToCopy = codeLines[0].innerText;
        } else {
          codeToCopy = pre.innerText;
        }
      } else if (mermaidNode) {
        // 머메이드 다이어그램 원문 추출
        codeToCopy = mermaidNode.getAttribute('data-mermaid-src') || mermaidNode.innerText;
      }

      if (!codeToCopy) return;

      try {
        await navigator.clipboard.writeText(codeToCopy.trim());
        const textSpan = btn.querySelector('.copy-text');
        const originalText = textSpan ? textSpan.textContent : '복사';
        if (textSpan) textSpan.textContent = '복사됨!';
        btn.classList.add('copied');

        setTimeout(() => {
          if (textSpan) textSpan.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
      }
    });
  });
}

/* 3. Shortcode: Tabs Initialization */
function initTabs() {
  document.querySelectorAll('.tabs-container').forEach(container => {
    const header = container.querySelector('.tabs-header');
    const panes = container.querySelectorAll('.tab-pane');
    if (!header || panes.length === 0) return;

    header.innerHTML = '';
    panes.forEach((pane, idx) => {
      const tabName = pane.getAttribute('data-tab-name') || `Tab ${idx + 1}`;
      const btn = document.createElement('button');
      btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
      btn.type = 'button';
      btn.textContent = tabName;

      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        pane.classList.add('active');
      });

      header.appendChild(btn);
      if (idx === 0) pane.classList.add('active');
    });
  });
}

/* 4. Dropdowns (Language Switcher) */
function initDropdowns() {
  const langBtn = document.getElementById('langToggleBtn');
  const langMenu = document.getElementById('langMenu');

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      langMenu.classList.remove('show');
    });
  }
}

/* 5. Mobile Navigation Menu */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('headerNav');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

/* 6. TOC ScrollSpy */
function initTOCScrollSpy() {
  const tocLinks = document.querySelectorAll('.toc-body a');
  if (tocLinks.length === 0) return;

  const headings = Array.from(document.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4'))
    .filter(h => h.id);

  if (headings.length === 0) return;

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 100;
    let currentId = '';

    for (let i = 0; i < headings.length; i++) {
      if (headings[i].offsetTop <= scrollPos) {
        currentId = headings[i].id;
      } else {
        break;
      }
    }

    tocLinks.forEach(link => {
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }, { passive: true });
}
