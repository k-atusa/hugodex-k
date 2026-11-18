/**
 * hugodex-k : Local-First Web Editor & Studio SPA
 * Pure vanilla JavaScript communicating with Python dev.py REST API.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    posts: [],
    currentPost: {
      slug: '',
      lang: 'ko',
      frontmatter: {
        title: '',
        date: '',
        draft: false, // false = 공개(Visible), true = 비공개(Hidden)
        category: '',
        tags: [],
        math: true,
        mermaid: false
      },
      content: '',
      thumbnail: null,
      files: [],
      dirty: false
    },
    autoSaveTimer: null,
    splitMode: 'both' // 'both', 'editor', 'preview'
  };

  // DOM Elements
  const el = {
    // Header
    currentSlugDisplay: document.getElementById('currentSlugDisplay'),
    visibilityToggleBtn: document.getElementById('visibilityToggleBtn'),
    visibilityText: document.getElementById('visibilityText'),
    langKoBtn: document.getElementById('langKoBtn'),
    langEnBtn: document.getElementById('langEnBtn'),
    syncStatusDot: document.getElementById('syncStatusDot'),
    syncStatusText: document.getElementById('syncStatusText'),
    newPostBtn: document.getElementById('newPostBtn'),
    deletePostBtn: document.getElementById('deletePostBtn'),
    savePostBtn: document.getElementById('savePostBtn'),

    // Sidebar
    sidebarCount: document.getElementById('sidebarCount'),
    postSearchInput: document.getElementById('postSearchInput'),
    postList: document.getElementById('postList'),

    // Metadata Strip
    postTitleInput: document.getElementById('postTitleInput'),
    postCategoryInput: document.getElementById('postCategoryInput'),
    postTagsInput: document.getElementById('postTagsInput'),

    // Toolbar
    editorToolbar: document.querySelector('.editor-toolbar'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    imageFileInput: document.getElementById('imageFileInput'),
    quickMathBtn: document.getElementById('quickMathBtn'),
    quickMermaidBtn: document.getElementById('quickMermaidBtn'),
    quickCalloutBtn: document.getElementById('quickCalloutBtn'),
    quickSvgBtn: document.getElementById('quickSvgBtn'),
    quickInteractiveBtn: document.getElementById('quickInteractiveBtn'),
    splitViewToggleBtn: document.getElementById('splitViewToggleBtn'),

    // Split Workspace
    splitWorkspace: document.getElementById('splitWorkspace'),
    editorPane: document.getElementById('editorPane'),
    markdownEditor: document.getElementById('markdownEditor'),
    previewPane: document.getElementById('previewPane'),
    livePreview: document.getElementById('livePreview'),

    // Modal
    newPostModal: document.getElementById('newPostModal'),
    newPostSlug: document.getElementById('newPostSlug'),
    newPostTitle: document.getElementById('newPostTitle'),
    newPostCategory: document.getElementById('newPostCategory'),
    newPostLang: document.getElementById('newPostLang'),
    submitNewPostBtn: document.getElementById('submitNewPostBtn'),

    // Toast
    toast: document.getElementById('toastBar')
  };

  /* ==========================================================================
     Initialization & Event Binding
     ========================================================================== */
  function init() {
    bindEvents();
    bindKeyboardShortcuts();
    setupDragDropAndPaste();

    fetchPosts().then((posts) => {
      const urlParams = new URLSearchParams(window.location.search);
      const reqSlug = urlParams.get('slug');
      const reqLang = urlParams.get('lang') || 'ko';

      if (reqSlug) {
        loadPost(reqSlug, reqLang);
      } else if (posts && posts.length > 0) {
        loadPost(posts[0].slug, posts[0].lang || 'ko');
      } else {
        resetEditor();
      }
    });
  }

  function bindEvents() {
    // Top Bar Actions
    el.newPostBtn.addEventListener('click', openNewPostModal);
    el.savePostBtn.addEventListener('click', () => savePost(false));
    el.deletePostBtn.addEventListener('click', () => deletePost(state.currentPost.slug));
    el.visibilityToggleBtn.addEventListener('click', toggleVisibility);

    // Language Toggles
    el.langKoBtn.addEventListener('click', () => switchLanguage('ko'));
    el.langEnBtn.addEventListener('click', () => switchLanguage('en'));

    // Sidebar search
    el.postSearchInput.addEventListener('input', renderPostList);

    // Metadata changes
    el.postTitleInput.addEventListener('input', () => {
      state.currentPost.frontmatter.title = el.postTitleInput.value;
      markDirty();
    });

    el.postCategoryInput.addEventListener('input', () => {
      state.currentPost.frontmatter.category = el.postCategoryInput.value.trim();
      markDirty();
    });

    el.postTagsInput.addEventListener('input', () => {
      state.currentPost.frontmatter.tags = el.postTagsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      markDirty();
    });

    // Editor Text Input
    el.markdownEditor.addEventListener('input', () => {
      state.currentPost.content = el.markdownEditor.value;
      markDirty();
      updatePreview();
    });

    // Toolbar formatting buttons
    el.editorToolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tb-btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action) {
        e.preventDefault();
        handleToolbarAction(action);
      }
    });

    // Quick insertion buttons (Direct snippet insertion without intrusive modals!)
    el.quickMathBtn.addEventListener('click', () => {
      insertAtCursor('\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}\n$$\n');
    });

    el.quickMermaidBtn.addEventListener('click', () => {
      insertAtCursor('\n```mermaid\ngraph TD\n    A[시작] --> B{조건 분기}\n    B -- 예 --> C[실행 1]\n    B -- 아니오 --> D[실행 2]\n    C --> E[종료]\n    D --> E\n```\n');
    });

    el.quickCalloutBtn.addEventListener('click', () => {
      insertAtCursor('\n{{< callout type="theorem" title="정리 제목" >}}\n여기에 정리 또는 증명 내용을 작성하세요.\n{{< /callout >}}\n');
    });

    el.quickSvgBtn.addEventListener('click', () => {
      const svgTemplate = `
<svg viewBox="0 0 520 120" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto;">
  <rect x="10" y="20" width="140" height="70" rx="8" fill="var(--bg-secondary, #f8fafc)" stroke="var(--border-color, #cbd5e1)" stroke-width="2"/>
  <text x="80" y="60" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text-main, #0f172a)">클라이언트</text>
  
  <line x1="150" y1="55" x2="220" y2="55" stroke="var(--accent, #059669)" stroke-width="2" stroke-dasharray="4"/>
  <polygon points="220,50 230,55 220,60" fill="var(--accent, #059669)"/>
  
  <rect x="230" y="20" width="150" height="70" rx="8" fill="var(--bg-secondary, #f8fafc)" stroke="var(--accent, #059669)" stroke-width="2"/>
  <text x="305" y="60" text-anchor="middle" font-size="13" font-weight="600" fill="var(--accent, #059669)">API 게이트웨이</text>
  
  <line x1="380" y1="55" x2="450" y2="55" stroke="var(--accent, #059669)" stroke-width="2"/>
  <polygon points="450,50 460,55 450,60" fill="var(--accent, #059669)"/>
  
  <rect x="460" y="20" width="50" height="70" rx="8" fill="var(--bg-secondary, #f8fafc)" stroke="var(--border-color, #cbd5e1)" stroke-width="2"/>
  <text x="485" y="60" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text-main, #0f172a)">DB</text>
</svg>
`;
      insertAtCursor(`\n${svgTemplate.trim()}\n\n`);
    });

    el.quickInteractiveBtn.addEventListener('click', () => {
      const interactiveTemplate = `
<div class="interactive-widget">
  <div style="font-weight: 600; margin-bottom: 0.5rem;">⚡ 인터랙티브 시뮬레이터</div>
  <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
    <label for="stepRange" style="font-size: 0.85rem;">파동 진폭:</label>
    <input type="range" id="stepRange" min="10" max="100" value="50" oninput="document.getElementById('rangeVal').innerText = this.value">
    <span id="rangeVal" style="font-family: monospace; font-weight: bold; color: var(--accent, #059669);">50</span>
  </div>
  <canvas id="interactiveCanvas" width="480" height="80" style="width: 100%; max-width: 480px; height: 80px; background: #0f172a; border-radius: 4px; display: block;"></canvas>
  <script>
    (function() {
      const c = document.getElementById('interactiveCanvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const slider = document.getElementById('stepRange');
      function draw() {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const amp = slider ? Number(slider.value) : 50;
        for (let x = 0; x < c.width; x++) {
          const y = 40 + Math.sin(x * 0.05) * (amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (slider) slider.oninput = function() {
        const valEl = document.getElementById('rangeVal');
        if (valEl) valEl.innerText = this.value;
        draw();
      };
      draw();
    })();
  <\/script>
</div>
`;
      insertAtCursor(`\n${interactiveTemplate.trim()}\n\n`);
    });

    // View mode switch
    el.splitViewToggleBtn.addEventListener('click', toggleSplitView);

    // Image upload trigger
    el.uploadImageBtn.addEventListener('click', () => el.imageFileInput.click());
    el.imageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadImage(e.target.files[0]);
        el.imageFileInput.value = '';
      }
    });

    // Modal close
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', closeAllModals);
    });

    el.newPostModal.addEventListener('click', (e) => {
      if (e.target === el.newPostModal) closeAllModals();
    });

    el.submitNewPostBtn.addEventListener('click', submitNewPost);
  }

  /* ==========================================================================
     Keyboard Shortcuts
     ========================================================================== */
  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        savePost(false);
      } else if (isCtrl && (e.key === 'b' || e.key === 'B')) {
        if (document.activeElement === el.markdownEditor) {
          e.preventDefault();
          handleToolbarAction('bold');
        }
      } else if (isCtrl && (e.key === 'i' || e.key === 'I')) {
        if (document.activeElement === el.markdownEditor) {
          e.preventDefault();
          handleToolbarAction('italic');
        }
      } else if (e.key === 'Escape') {
        closeAllModals();
      }
    });
  }

  /* ==========================================================================
     Visibility (가시성) Toggle Logic: 공개 / 비공개
     ========================================================================== */
  function toggleVisibility() {
    const isDraft = !state.currentPost.frontmatter.draft;
    state.currentPost.frontmatter.draft = isDraft;
    updateVisibilityUI(isDraft);
    markDirty();
    showToast(isDraft ? '가시성 변경: [비공개]' : '가시성 변경: [공개]', 'info');
  }

  function updateVisibilityUI(isDraft) {
    if (isDraft) {
      el.visibilityToggleBtn.className = 'visibility-toggle hidden';
      el.visibilityText.textContent = '비공개';
      el.visibilityToggleBtn.title = '현재 비공개 상태입니다. 클릭하여 공개로 전환';
    } else {
      el.visibilityToggleBtn.className = 'visibility-toggle public';
      el.visibilityText.textContent = '공개';
      el.visibilityToggleBtn.title = '현재 공개 상태입니다. 클릭하여 비공개로 전환';
    }
  }

  /* ==========================================================================
     Language Switching
     ========================================================================== */
  function switchLanguage(targetLang) {
    if (state.currentPost.lang === targetLang) return;
    if (!state.currentPost.slug) return;

    if (state.currentPost.dirty) {
      savePost(true);
    }
    loadPost(state.currentPost.slug, targetLang);
  }

  function updateLangUI(lang) {
    if (lang === 'en') {
      el.langEnBtn.classList.add('active');
      el.langKoBtn.classList.remove('active');
    } else {
      el.langKoBtn.classList.add('active');
      el.langEnBtn.classList.remove('active');
    }
  }

  /* ==========================================================================
     REST API Communication
     ========================================================================== */
  // 1. GET /api/posts
  async function fetchPosts() {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.posts = data;
      renderPostList();
      return data;
    } catch (err) {
      console.warn('포스트 목록 로드 실패:', err);
      showToast('포스트 목록 로드 실패 (dev.py 연결 확인)', 'error');
      el.postList.innerHTML = '<div class="empty-placeholder">서버와 연결할 수 없습니다.</div>';
      return [];
    }
  }

  // 2. GET /api/posts/{slug}?lang=...
  async function loadPost(slug, lang = 'ko') {
    if (!slug) return;
    try {
      updateStatusIndicator('로딩 중...', false);
      const url = `/api/posts/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 404 && lang === 'en') {
          const createEn = confirm(`'${slug}' 게시글의 영문(index.en.md) 파일이 아직 없습니다.\n새로 작성하시겠습니까?`);
          if (createEn) {
            state.currentPost.slug = slug;
            state.currentPost.lang = 'en';
            state.currentPost.frontmatter = {
              ...state.currentPost.frontmatter,
              title: (state.currentPost.frontmatter.title || '') + ' (EN)'
            };
            state.currentPost.content = '';
            populateFormFromState();
            markDirty();
            updatePreview();
            return;
          } else {
            updateLangUI(state.currentPost.lang);
            return;
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      state.currentPost.slug = slug;
      state.currentPost.lang = lang;
      state.currentPost.frontmatter = data.frontmatter || {};
      state.currentPost.content = data.content || '';
      state.currentPost.thumbnail = data.thumbnail || null;
      state.currentPost.files = data.files || [];
      state.currentPost.dirty = false;

      populateFormFromState();
      updateStatusIndicator('동기화됨', false);
      updatePreview();
      highlightActivePost(slug);
      el.deletePostBtn.style.display = 'inline-flex';

      showToast(`'${slug}' (${lang.toUpperCase()}) 로드 완료`, 'info');
    } catch (err) {
      console.error('글 불러오기 실패:', err);
      showToast('글 불러오기 실패: ' + err.message, 'error');
      updateStatusIndicator('오류', false);
    }
  }

  // 3. PUT /api/posts/{slug}
  async function savePost(isAutoSave = false) {
    if (!state.currentPost.slug) {
      if (!isAutoSave) showToast('저장할 포스트를 선택하세요.', 'info');
      return;
    }

    syncStateFromForm();
    updateStatusIndicator(isAutoSave ? '자동 저장 중...' : '저장 중...', false);

    const bodyText = state.currentPost.content;
    const hasMath = bodyText.includes('$') || bodyText.includes('```math');
    const hasMermaid = bodyText.includes('```mermaid');

    state.currentPost.frontmatter.math = hasMath || Boolean(state.currentPost.frontmatter.math);
    state.currentPost.frontmatter.mermaid = hasMermaid || Boolean(state.currentPost.frontmatter.mermaid);

    const payload = {
      frontmatter: state.currentPost.frontmatter,
      content: state.currentPost.content,
      lang: state.currentPost.lang || 'ko'
    };

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(state.currentPost.slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      state.currentPost.dirty = false;
      updateStatusIndicator(isAutoSave ? '자동 저장됨' : '저장 완료', false);

      if (!isAutoSave) {
        showToast('저장 완료되었습니다.', 'success');
      }

      await fetchPosts();
      highlightActivePost(state.currentPost.slug);
    } catch (err) {
      console.error('저장 실패:', err);
      showToast('저장 실패: ' + err.message, 'error');
      updateStatusIndicator('저장 실패', true);
    }
  }

  // 4. POST /api/posts
  async function createPost(slug, frontmatter, content, lang = 'ko') {
    try {
      updateStatusIndicator('새 글 생성 중...', false);
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, frontmatter, content, lang })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      showToast(`'${slug}' 생성 완료`, 'success');
      closeAllModals();
      await fetchPosts();
      await loadPost(slug, lang);
      return true;
    } catch (err) {
      console.error('글 생성 실패:', err);
      showToast('글 생성 실패: ' + err.message, 'error');
      return false;
    }
  }

  // 5. DELETE /api/posts/{slug}
  async function deletePost(slug) {
    if (!slug) return;
    const ok = confirm(`정말 포스트 폴더 'content/posts/${slug}/'을(를) 완전히 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      updateStatusIndicator('삭제 중...', false);
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      showToast(`'${slug}' 삭제 완료`, 'success');
      resetEditor();
      const updatedList = await fetchPosts();
      if (updatedList.length > 0) {
        await loadPost(updatedList[0].slug, updatedList[0].lang || 'ko');
      }
    } catch (err) {
      console.error('삭제 실패:', err);
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }

  // 6. POST /api/upload/{slug}
  async function uploadImage(file) {
    if (!state.currentPost.slug) {
      showToast('이미지를 첨부할 글을 먼저 선택하세요.', 'info');
      return;
    }
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast(`'${file.name}' 업로드 중...`, 'info');
      const res = await fetch(`/api/upload/${encodeURIComponent(state.currentPost.slug)}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const resData = await res.json().catch(() => ({}));
      const filename = resData.filename || (resData.files && resData.files[0]) || file.name;

      insertAtCursor(`\n![${filename}](${filename})\n`);
      showToast(`'${filename}' 업로드 및 본문 삽입 완료`, 'success');
      fetchPosts(); // Refresh thumbnails
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      showToast('이미지 업로드 실패: ' + err.message, 'error');
    }
  }

  /* ==========================================================================
     State & Form Synchronization
     ========================================================================== */
  function populateFormFromState() {
    const fm = state.currentPost.frontmatter || {};
    el.currentSlugDisplay.textContent = state.currentPost.slug || '선택된 글 없음';
    el.postTitleInput.value = fm.title || '';

    // Single category
    let category = fm.category || '';
    if (!category && fm.categories) {
      category = Array.isArray(fm.categories) ? (fm.categories[0] || '') : String(fm.categories);
    }
    el.postCategoryInput.value = category;

    // Tags
    el.postTagsInput.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');

    // Visibility
    const isDraft = Boolean(fm.draft);
    updateVisibilityUI(isDraft);

    // Language
    updateLangUI(state.currentPost.lang || 'ko');

    // Markdown content
    el.markdownEditor.value = state.currentPost.content || '';
  }

  function syncStateFromForm() {
    const fm = state.currentPost.frontmatter || {};
    fm.title = el.postTitleInput.value.trim() || state.currentPost.slug;

    // Single category
    const cat = el.postCategoryInput.value.trim();
    fm.category = cat;
    fm.categories = cat ? [cat] : [];

    // Tags
    fm.tags = el.postTagsInput.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!fm.date) {
      fm.date = formatISODate(new Date());
    }

    state.currentPost.content = el.markdownEditor.value;
  }

  function markDirty() {
    state.currentPost.dirty = true;
    updateStatusIndicator('수정됨 (미저장)', true);

    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(() => {
      if (state.currentPost.slug && state.currentPost.dirty) {
        savePost(true);
      }
    }, 2000);
  }

  function updateStatusIndicator(text, isDirty) {
    el.syncStatusText.textContent = text;
    if (isDirty) {
      el.syncStatusDot.className = 'status-dot dirty';
    } else {
      el.syncStatusDot.className = 'status-dot synced';
    }
  }

  function formatISODate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+09:00`;
  }

  function resetEditor() {
    state.currentPost = {
      slug: '',
      lang: 'ko',
      frontmatter: { title: '', draft: false, category: '', tags: [] },
      content: '',
      thumbnail: null,
      files: [],
      dirty: false
    };
    populateFormFromState();
    el.deletePostBtn.style.display = 'none';
    el.currentSlugDisplay.textContent = '선택된 글 없음';
    updateStatusIndicator('준비됨', false);
    updatePreview();
  }

  /* ==========================================================================
     Sidebar Post List Rendering
     ========================================================================== */
  function renderPostList() {
    const query = el.postSearchInput.value.trim().toLowerCase();
    const filtered = state.posts.filter((p) => {
      const title = (p.title || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const tags = (Array.isArray(p.tags) ? p.tags.join(' ') : '').toLowerCase();
      return title.includes(query) || slug.includes(query) || category.includes(query) || tags.includes(query);
    });

    el.sidebarCount.textContent = filtered.length;

    if (filtered.length === 0) {
      el.postList.innerHTML = '<div class="empty-placeholder">등록된 포스트가 없습니다.</div>';
      return;
    }

    let html = '';
    filtered.forEach((p) => {
      const isActive = state.currentPost.slug === p.slug;
      const dateDisplay = p.date ? p.date.substring(0, 10) : '';
      const isHidden = Boolean(p.draft);
      const langs = Array.isArray(p.langs) && p.langs.length ? p.langs : [p.lang || 'ko'];

      const thumbHtml = p.thumbnail
        ? `<img src="${escapeHtml(p.thumbnail)}" alt="" class="item-thumb-img">`
        : `<span class="thumb-icon">📄</span>`;

      html += `
        <div class="post-list-item ${isActive ? 'active' : ''}" data-slug="${escapeHtml(p.slug)}" data-lang="${escapeHtml(p.lang || 'ko')}">
          <div class="item-thumb-box">${thumbHtml}</div>
          <div class="item-info">
            <h4 class="item-title">${escapeHtml(p.title || p.slug)}</h4>
            <div class="item-meta">
              <span class="item-date">${dateDisplay}</span>
              ${p.category ? `<span class="item-cat">📁 ${escapeHtml(p.category)}</span>` : ''}
            </div>
            <div class="item-badges">
              <span class="badge-mini ${isHidden ? 'vis-hidden' : 'vis-public'}">${isHidden ? '비공개' : '공개'}</span>
              ${langs.map((l) => `<span class="badge-mini lang-tag">${l.toUpperCase()}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    });

    el.postList.innerHTML = html;

    el.postList.querySelectorAll('.post-list-item').forEach((item) => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        if (state.currentPost.slug === slug) return;

        if (state.currentPost.dirty) {
          savePost(true);
        }
        loadPost(slug, state.currentPost.lang || 'ko');
      });
    });
  }

  function highlightActivePost(slug) {
    el.postList.querySelectorAll('.post-list-item').forEach((item) => {
      if (item.getAttribute('data-slug') === slug) item.classList.add('active');
      else item.classList.remove('active');
    });
  }

  /* ==========================================================================
     Editor Text Manipulation & Toolbar
     ========================================================================== */
  function insertAtCursor(text, selectOffset = 0, selectLength = 0) {
    const area = el.markdownEditor;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const val = area.value;

    area.value = val.substring(0, start) + text + val.substring(end);
    const newPos = start + text.length + selectOffset;
    area.selectionStart = newPos;
    area.selectionEnd = newPos + selectLength;
    area.focus();

    state.currentPost.content = area.value;
    markDirty();
    updatePreview();
  }

  function handleToolbarAction(action) {
    const area = el.markdownEditor;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = area.value.substring(start, end);

    switch (action) {
      case 'h2':
        insertAtCursor(`\n## ${selected || '제목 2'}\n`);
        break;
      case 'h3':
        insertAtCursor(`\n### ${selected || '제목 3'}\n`);
        break;
      case 'bold':
        insertAtCursor(`**${selected || '굵은 텍스트'}**`);
        break;
      case 'italic':
        insertAtCursor(`*${selected || '기울임 텍스트'}*`);
        break;
      case 'quote':
        insertAtCursor(`\n> ${selected || '인용문'}\n`);
        break;
      case 'code':
        if (selected.includes('\n')) {
          insertAtCursor(`\n\`\`\`python\n${selected}\n\`\`\`\n`);
        } else {
          insertAtCursor(`\`${selected || '코드'}\``);
        }
        break;
      case 'ul':
        insertAtCursor(`\n- ${selected || '목록 항목'}\n`);
        break;
      case 'table':
        insertAtCursor(`\n| 항목 | 기술 | 설명 |\n| :--- | :--- | :--- |\n| 1 | Python | 로컬 개발 서버 |\n| 2 | Hugo | 고속 정적 빌드 |\n\n`);
        break;
      case 'link':
        insertAtCursor(`[${selected || '링크 텍스트'}](https://example.com)`);
        break;
      case 'image':
        el.imageFileInput.click();
        break;
    }
  }

  /* ==========================================================================
     Real-time Markdown, KaTeX & Mermaid Live Preview
     ========================================================================== */
  function updatePreview() {
    const rawMarkdown = el.markdownEditor.value;
    if (!rawMarkdown.trim()) {
      el.livePreview.innerHTML = '<p class="preview-placeholder">본문을 입력하면 실시간 렌더링 결과가 표시됩니다.</p>';
      return;
    }

    el.livePreview.innerHTML = parseMarkdownForPreview(rawMarkdown);

    // KaTeX auto-render
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(el.livePreview, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX render warning:', err);
      }
    }

    // Mermaid auto-render
    if (typeof mermaid !== 'undefined') {
      const mermaidNodes = el.livePreview.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose'
          });
          mermaid.run({ nodes: mermaidNodes });
        } catch (err) {
          console.warn('Mermaid render warning:', err);
        }
      }
    }

    // Re-execute scripts inside live preview for interactive widgets
    const scripts = el.livePreview.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      try {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      } catch (e) {
        console.warn('Script execution notice:', e);
      }
    });
  }

  function parseMarkdownForPreview(md) {
    const blockTokens = [];
    function saveToken(content) {
      const id = `%%%PTOKEN_${blockTokens.length}%%%`;
      blockTokens.push(content);
      return id;
    }

    let text = md;

    // 0. Protect Raw SVG and Interactive HTML Blocks
    text = text.replace(/<svg[\s\S]*?<\/svg>/gi, (m) => saveToken(m));
    text = text.replace(/<div class="interactive-widget"[\s\S]*?<\/div>/gi, (m) => saveToken(m));
    text = text.replace(/<script[\s\S]*?<\/script>/gi, (m) => saveToken(m));

    // 1. Callout Shortcode
    text = text.replace(/{{<\s*callout\s+(?:type="([^"]+)"|([a-zA-Z0-9_-]+))(?:\s+title="([^"]+)"|\s+"([^"]+)")?\s*>}}([\s\S]*?){{<\s*\/callout\s*>}}/gi, (m, t1, t2, tit1, tit2, inner) => {
      const type = (t1 || t2 || 'note').toLowerCase();
      let title = tit1 || tit2 || (type === 'theorem' ? '정리' : type === 'tip' ? '팁' : '참고');
      const renderedInner = renderMarkdownInline(inner.trim());
      const block = `
        <div class="callout callout--${type}">
          <div class="callout-header">
            <span class="callout-icon">💡</span>
            <span class="callout-title">${escapeHtml(title)}</span>
          </div>
          <div class="callout-content">${renderedInner}</div>
        </div>
      `;
      return saveToken(block);
    });

    // 2. Mermaid code blocks
    text = text.replace(/```mermaid\s*\n([\s\S]*?)```/gi, (m, code) => {
      const block = `
        <div class="mermaid-wrap">
          <div class="mermaid">${escapeHtml(code.trim())}</div>
        </div>
      `;
      return saveToken(block);
    });

    // 3. Math code blocks
    text = text.replace(/```(?:math|latex)\s*\n([\s\S]*?)```/gi, (m, code) => {
      return saveToken(`<div class="math-block">$$${code.trim()}$$</div>`);
    });

    // 4. Regular code blocks
    text = text.replace(/```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g, (m, lang, code) => {
      const langLabel = lang || 'text';
      const block = `
        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">${escapeHtml(langLabel)}</span>
          </div>
          <div class="highlight">
            <pre><code class="language-${escapeHtml(langLabel)}">${escapeHtml(code)}</code></pre>
          </div>
        </div>
      `;
      return saveToken(block);
    });

    // 5. Display Math ($$...$$)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => {
      return saveToken(`<div class="katex-display">$$${math.trim()}$$</div>`);
    });

    // 6. Inline Math ($...$)
    text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (m, prefix, math) => {
      return prefix + saveToken(`$${math}$`);
    });

    // 7. Standard Markdown
    text = renderMarkdownCore(text);

    // 8. Restore tokens
    blockTokens.forEach((saved, idx) => {
      text = text.split(`%%%PTOKEN_${idx}%%%`).join(saved);
    });

    return text;
  }

  function renderMarkdownCore(md) {
    let html = md;
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^\s*(?:---|\*\*\*)\s*$/gim, '<hr>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Tables
    html = html.replace(/((?:^\|.+?\|(?:\r?\n|$))+)/gm, (match) => {
      const lines = match.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return match;
      const parseCells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
      const ths = parseCells(lines[0]).map((h) => `<th>${renderMarkdownInline(h)}</th>`).join('');
      let tbody = '';
      for (let i = 2; i < lines.length; i++) {
        const tds = parseCells(lines[i]).map((c) => `<td>${renderMarkdownInline(c)}</td>`).join('');
        tbody += `<tr>${tds}</tr>`;
      }
      return `<table><thead><tr>${ths}</tr></thead><tbody>${tbody}</tbody></table>`;
    });

    // Lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>(\r?\n)?)+/g, '<ul>$&</ul>');

    html = renderMarkdownInline(html);

    // Paragraphs
    const paras = html.split(/\n\s*\n/);
    html = paras.map((p) => {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-6]|ul|ol|table|blockquote|hr|div|p)/i.test(p) || p.startsWith('%%%PTOKEN_')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  function renderMarkdownInline(str) {
    return str
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     New Post Modal Flow
     ========================================================================== */
  function openNewPostModal() {
    el.newPostSlug.value = '';
    el.newPostTitle.value = '';
    el.newPostCategory.value = '';
    el.newPostLang.value = 'ko';
    el.newPostModal.classList.add('active');
    setTimeout(() => el.newPostSlug.focus(), 100);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
  }

  async function submitNewPost() {
    let slug = el.newPostSlug.value.trim().toLowerCase();
    slug = slug.replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const title = el.newPostTitle.value.trim();
    const category = el.newPostCategory.value.trim();
    const lang = el.newPostLang.value || 'ko';

    if (!slug) {
      alert('슬러그를 입력해주세요 (영문, 숫자, 하이픈).');
      el.newPostSlug.focus();
      return;
    }
    if (!title) {
      alert('제목을 입력해주세요.');
      el.newPostTitle.focus();
      return;
    }

    const frontmatter = {
      title,
      date: formatISODate(new Date()),
      draft: false, // 기본 공개
      category,
      tags: [],
      math: true,
      mermaid: false
    };

    const initialContent = `## 개요\n\n이곳에 **${title}**의 내용을 작성하세요.\n\n### 1. 주요 개념\n\n- 핵심 내용\n`;

    await createPost(slug, frontmatter, initialContent, lang);
  }

  /* ==========================================================================
     Drag & Drop and Paste for Co-located Images
     ========================================================================== */
  function setupDragDropAndPaste() {
    const area = el.markdownEditor;

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag-over');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('drag-over');
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadImage(e.dataTransfer.files[0]);
      }
    });

    area.addEventListener('paste', (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          uploadImage(file);
        }
      }
    });
  }

  /* ==========================================================================
     Split View Toggle
     ========================================================================== */
  function toggleSplitView() {
    if (state.splitMode === 'both') {
      state.splitMode = 'editor';
      el.previewPane.style.display = 'none';
      el.editorPane.style.flex = '1';
      el.splitViewToggleBtn.textContent = '✎ 에디터만';
    } else if (state.splitMode === 'editor') {
      state.splitMode = 'preview';
      el.editorPane.style.display = 'none';
      el.previewPane.style.display = 'flex';
      el.previewPane.style.flex = '1';
      el.splitViewToggleBtn.textContent = '👁 미리보기만';
    } else {
      state.splitMode = 'both';
      el.editorPane.style.display = 'flex';
      el.previewPane.style.display = 'flex';
      el.editorPane.style.flex = '1';
      el.previewPane.style.flex = '1';
      el.splitViewToggleBtn.textContent = '◫ 분할 뷰';
    }
  }

  /* ==========================================================================
     Toast Bar
     ========================================================================== */
  function showToast(message, type = 'info') {
    el.toast.textContent = message;
    el.toast.className = `toast-bar show ${type}`;
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => {
      el.toast.className = 'toast-bar';
    }, 2800);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
