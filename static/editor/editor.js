/**
 * hugodex-k : Local-First Web Editor & Studio SPA
 * Communicates directly with pure Python dev.py REST API on localhost
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
        draft: false,
        tags: [],
        categories: [],
        math: true,
        mermaid: false,
        description: ''
      },
      content: '',
      files: [],
      dirty: false
    },
    autoSaveTimer: null,
    mermaidTimer: null,
    splitMode: 'both' // 'both', 'editor', 'preview'
  };

  // DOM Elements Cache
  const el = {
    // App Bar
    homeLink: document.getElementById('homeLink'),
    fileStatusIndicator: document.getElementById('fileStatusIndicator'),
    currentFileName: document.getElementById('currentFileName'),
    statusText: document.getElementById('statusText'),
    draftBadge: document.getElementById('draftBadge'),
    langBadge: document.getElementById('langBadge'),
    newPostBtn: document.getElementById('newPostBtn'),
    deletePostBtn: document.getElementById('deletePostBtn'),
    savePostBtn: document.getElementById('savePostBtn'),

    // Sidebar
    sidebarPane: document.getElementById('sidebarPane'),
    sidebarPostCount: document.getElementById('sidebarPostCount'),
    refreshPostsBtn: document.getElementById('refreshPostsBtn'),
    postSearchInput: document.getElementById('postSearchInput'),
    postList: document.getElementById('postList'),

    // Metadata Form
    postTitleInput: document.getElementById('postTitleInput'),
    postSlugInput: document.getElementById('postSlugInput'),
    postLangSelect: document.getElementById('postLangSelect'),
    postDraftCheckbox: document.getElementById('postDraftCheckbox'),
    draftToggleLabel: document.getElementById('draftToggleLabel'),
    postCategoriesInput: document.getElementById('postCategoriesInput'),
    postTagsInput: document.getElementById('postTagsInput'),
    postDescInput: document.getElementById('postDescInput'),

    // Toolbar
    editorToolbar: document.querySelector('.editor-toolbar'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    imageFileInput: document.getElementById('imageFileInput'),
    openMathPaletteBtn: document.getElementById('openMathPaletteBtn'),
    openMermaidWizardBtn: document.getElementById('openMermaidWizardBtn'),
    openCalloutWizardBtn: document.getElementById('openCalloutWizardBtn'),
    toggleSplitViewBtn: document.getElementById('toggleSplitViewBtn'),

    // Split Container
    splitViewContainer: document.getElementById('splitViewContainer'),
    editorPane: document.getElementById('editorPane'),
    markdownEditor: document.getElementById('markdownEditor'),
    previewPane: document.getElementById('previewPane'),
    livePreview: document.getElementById('livePreview'),

    // Modals
    mathPaletteModal: document.getElementById('mathPaletteModal'),
    mermaidWizardModal: document.getElementById('mermaidWizardModal'),
    calloutWizardModal: document.getElementById('calloutWizardModal'),
    newPostModal: document.getElementById('newPostModal'),

    // Math Modal Elements
    mathFormulaInput: document.getElementById('mathFormulaInput'),
    mathPreviewBox: document.getElementById('mathPreviewBox'),
    insertInlineMathBtn: document.getElementById('insertInlineMathBtn'),
    insertBlockMathBtn: document.getElementById('insertBlockMathBtn'),

    // Mermaid Modal Elements
    mermaidCodeInput: document.getElementById('mermaidCodeInput'),
    mermaidPreviewBox: document.getElementById('mermaidPreviewBox'),
    insertDiagramBtn: document.getElementById('insertDiagramBtn'),

    // Callout Modal Elements
    calloutTypeSelect: document.getElementById('calloutTypeSelect'),
    calloutTitleInput: document.getElementById('calloutTitleInput'),
    calloutContentInput: document.getElementById('calloutContentInput'),
    insertCalloutBtn: document.getElementById('insertCalloutBtn'),

    // New Post Modal Elements
    newPostSlug: document.getElementById('newPostSlug'),
    newPostTitle: document.getElementById('newPostTitle'),
    newPostLang: document.getElementById('newPostLang'),
    newPostCategories: document.getElementById('newPostCategories'),
    newPostTags: document.getElementById('newPostTags'),
    newPostDesc: document.getElementById('newPostDesc'),
    submitNewPostBtn: document.getElementById('submitNewPostBtn'),

    // Toast
    toast: document.getElementById('toastNotification')
  };

  // Preset Mermaid Templates (Korean Labels)
  const mermaidPresets = {
    flowchart: `graph TD
    A[시작: 사용자 요청 수신] --> B{캐시 데이터 확인}
    B -- 캐시 적중 --> C[캐시된 응답 반환]
    B -- 캐시 부재 --> D[데이터베이스 쿼리 실행]
    D --> E[캐시 갱신 및 메모리 적재]
    E --> C
    C --> F[클라이언트에 결과 전송]`,

    sequence: `sequenceDiagram
    autonumber
    actor User as 작성자 (User)
    participant Web as 에디터 브라우저
    participant API as dev.py 서버
    participant Storage as 파일시스템

    User->>Web: 글 작성 및 저장 (Ctrl+S)
    Web->>API: PUT /api/posts/{slug}
    API->>Storage: index.md 파일 기록
    Storage-->>API: 쓰기 완료 확인
    API-->>Web: 200 OK {success: true}
    Web->>User: "저장 완료" 상태 표시`,

    class: `classDiagram
    class PostBundle {
        +String slug
        +String lang
        +Object frontmatter
        +String content
        +Boolean dirty
        +load()
        +save()
    }
    class MathDiagramPost {
        +Boolean math
        +Boolean mermaid
        +renderKaTeX()
        +renderMermaid()
    }
    PostBundle <|-- MathDiagramPost`,

    state: `stateDiagram-v2
    [*] --> 초안작성: 새 글 생성
    초안작성 --> 본문작성: 수식 및 다이어그램 편집
    본문작성 --> 초안보관: 임시 저장 (draft=true)
    본문작성 --> 발행검토: 초안 해제 (draft=false)
    발행검토 --> 배포완료: GitHub Pages 자동 빌드
    배포완료 --> [*]`,

    git: `gitGraph
    commit id: "초기 블로그 엔진 구성"
    branch develop
    checkout develop
    commit id: "dev.py 로컬 API 구현"
    commit id: "웹 에디터 SPA 구축"
    checkout main
    merge develop id: "정식 릴리즈 v1.0"`
  };

  /* ==========================================================================
     Initialization & Event Binding
     ========================================================================== */
  function init() {
    bindEvents();
    bindKeyboardShortcuts();
    setupMermaidPresetSelector();
    setupMathPaletteTabs();
    setupDragDropAndPaste();

    // Load posts from server
    fetchPosts().then(posts => {
      // Check URL search params for slug and lang
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

    // Initialize Math Preview with default formula
    updateMathFormulaPreview();
    // Initialize Mermaid Modal code
    el.mermaidCodeInput.value = mermaidPresets.flowchart;
  }

  function bindEvents() {
    // Top Bar Actions
    el.newPostBtn.addEventListener('click', openNewPostModal);
    el.savePostBtn.addEventListener('click', () => savePost(false));
    el.deletePostBtn.addEventListener('click', () => deletePost(state.currentPost.slug));
    el.refreshPostsBtn.addEventListener('click', () => fetchPosts());

    // Search filter
    el.postSearchInput.addEventListener('input', () => renderPostList());

    // Metadata form change listeners
    el.postTitleInput.addEventListener('input', () => {
      state.currentPost.frontmatter.title = el.postTitleInput.value;
      markDirty();
    });

    el.postLangSelect.addEventListener('change', () => {
      const newLang = el.postLangSelect.value;
      if (state.currentPost.slug) {
        if (state.currentPost.dirty) {
          if (!confirm('저장되지 않은 변경사항이 있습니다. 언어를 전환하시겠습니까?')) {
            el.postLangSelect.value = state.currentPost.lang;
            return;
          }
        }
        loadPost(state.currentPost.slug, newLang);
      }
    });

    el.postDraftCheckbox.addEventListener('change', () => {
      const isDraft = el.postDraftCheckbox.checked;
      state.currentPost.frontmatter.draft = isDraft;
      el.draftToggleLabel.textContent = isDraft ? '초안' : '발행';
      el.draftBadge.style.display = isDraft ? 'inline-block' : 'none';
      markDirty();
    });

    el.postCategoriesInput.addEventListener('input', () => {
      state.currentPost.frontmatter.categories = el.postCategoriesInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      markDirty();
    });

    el.postTagsInput.addEventListener('input', () => {
      state.currentPost.frontmatter.tags = el.postTagsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      markDirty();
    });

    el.postDescInput.addEventListener('input', () => {
      state.currentPost.frontmatter.description = el.postDescInput.value;
      markDirty();
    });

    // Markdown textarea input
    el.markdownEditor.addEventListener('input', () => {
      state.currentPost.content = el.markdownEditor.value;
      markDirty();
      updatePreview();
    });

    // Toolbar actions
    el.editorToolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tb-btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action) {
        e.preventDefault();
        handleToolbarAction(action);
      }
    });

    // Feature Wizard Buttons
    el.openMathPaletteBtn.addEventListener('click', () => openModal(el.mathPaletteModal));
    el.openMermaidWizardBtn.addEventListener('click', () => {
      openModal(el.mermaidWizardModal);
      updateMermaidModalPreview();
    });
    el.openCalloutWizardBtn.addEventListener('click', () => openModal(el.calloutWizardModal));

    // Split view toggle
    el.toggleSplitViewBtn.addEventListener('click', toggleSplitView);

    // Image upload trigger
    el.uploadImageBtn.addEventListener('click', () => el.imageFileInput.click());
    el.imageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadImage(e.target.files[0]);
        el.imageFileInput.value = '';
      }
    });

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAllModals();
      });
    });

    // Math Modal Actions
    el.mathFormulaInput.addEventListener('input', updateMathFormulaPreview);
    el.insertInlineMathBtn.addEventListener('click', () => {
      const formula = el.mathFormulaInput.value.trim();
      if (formula) {
        insertAtCursor(`$${formula}$`);
        closeModal(el.mathPaletteModal);
      }
    });
    el.insertBlockMathBtn.addEventListener('click', () => {
      const formula = el.mathFormulaInput.value.trim();
      if (formula) {
        insertAtCursor(`\n$$\n${formula}\n$$\n`);
        closeModal(el.mathPaletteModal);
      }
    });

    // Mermaid Modal Actions
    el.mermaidCodeInput.addEventListener('input', updateMermaidModalPreview);
    el.insertDiagramBtn.addEventListener('click', () => {
      const code = el.mermaidCodeInput.value.trim();
      if (code) {
        insertAtCursor(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`);
        closeModal(el.mermaidWizardModal);
      }
    });

    // Callout Modal Actions
    el.insertCalloutBtn.addEventListener('click', () => {
      const type = el.calloutTypeSelect.value || 'note';
      const title = el.calloutTitleInput.value.trim();
      const content = el.calloutContentInput.value.trim() || '내용을 작성하세요.';

      let tag = `{{< callout type="${type}"`;
      if (title) tag += ` title="${title}"`;
      tag += ` >}}\n${content}\n{{< /callout >}}\n`;

      insertAtCursor(`\n${tag}\n`);
      el.calloutTitleInput.value = '';
      el.calloutContentInput.value = '';
      closeModal(el.calloutWizardModal);
    });

    // New Post Modal Submit
    el.submitNewPostBtn.addEventListener('click', submitNewPost);
  }

  /* ==========================================================================
     Keyboard Shortcuts (Ctrl+S, Ctrl+B, Ctrl+I)
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
     REST API Client
     All endpoints use relative paths: /api/posts, /api/upload/{slug}
     ========================================================================== */

  // 1. GET /api/posts -> [{slug, title, date, draft, lang, categories, tags}]
  async function fetchPosts() {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Sort posts flat by date descending
      data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      state.posts = data;
      renderPostList();
      return data;
    } catch (err) {
      console.warn('게시글 목록 불러오기 실패:', err);
      showToast('게시글 목록을 불러올 수 없습니다 (dev.py 연결 확인 필요)', 'warning');
      el.postList.innerHTML = '<div class="empty-placeholder">게시글 목록을 불러올 수 없습니다.</div>';
      return [];
    }
  }

  // 2. GET /api/posts/{slug}?lang=en
  async function loadPost(slug, lang = 'ko') {
    if (!slug) return;
    try {
      updateStatusIndicator('로딩 중...', false);
      const url = `/api/posts/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        if (res.status === 404 && lang === 'en') {
          // Offer to create English index.en.md
          const shouldCreate = confirm(`'${slug}' 게시글의 영문(index.en.md) 문서가 아직 없습니다.\n새로 작성하시겠습니까?`);
          if (shouldCreate) {
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
            el.postLangSelect.value = 'ko';
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
      state.currentPost.files = data.files || [];
      state.currentPost.dirty = false;

      populateFormFromState();
      updateStatusIndicator('동기화됨', false);
      updatePreview();
      highlightActivePost(slug, lang);
      el.deletePostBtn.style.display = 'inline-flex';

      showToast(`'${slug}' (${lang.toUpperCase()}) 게시글을 불러왔습니다.`, 'success');
    } catch (err) {
      console.error('게시글 로드 실패:', err);
      showToast('게시글 로드 실패: ' + err.message, 'error');
      updateStatusIndicator('오류', false);
    }
  }

  // 3. PUT /api/posts/{slug} -> body: {frontmatter, content, lang}
  async function savePost(isAutoSave = false) {
    if (!state.currentPost.slug) {
      if (!isAutoSave) showToast('저장할 게시글을 먼저 선택하세요.', 'warning');
      return;
    }

    syncStateFromForm();
    updateStatusIndicator(isAutoSave ? '자동 저장 중...' : '저장 중...', false);

    // Auto-detect math & mermaid usage
    const bodyText = state.currentPost.content;
    const hasMath = bodyText.includes('$') || bodyText.includes('```math') || bodyText.includes('```latex');
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
        showToast('게시글이 성공적으로 저장되었습니다.', 'success');
      }

      // Refresh post list in background to sync dates/titles
      await fetchPosts();
      highlightActivePost(state.currentPost.slug, state.currentPost.lang);
    } catch (err) {
      console.error('저장 실패:', err);
      showToast('저장 실패: ' + err.message, 'error');
      updateStatusIndicator('저장 실패', true);
    }
  }

  // 4. POST /api/posts -> body: {slug, frontmatter, content}
  async function createPost(slug, frontmatter, content) {
    try {
      updateStatusIndicator('새 글 생성 중...', false);
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, frontmatter, content })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      showToast(`게시글 '${slug}'이(가) 생성되었습니다.`, 'success');
      closeModal(el.newPostModal);
      await fetchPosts();
      await loadPost(slug, frontmatter.lang || 'ko');
      return true;
    } catch (err) {
      console.error('게시글 생성 실패:', err);
      showToast('게시글 생성 실패: ' + err.message, 'error');
      return false;
    }
  }

  // 5. DELETE /api/posts/{slug} -> removes folder
  async function deletePost(slug) {
    if (!slug) return;
    const ok = confirm(`정말 게시글 폴더 'content/posts/${slug}/'을(를) 영구 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다.`);
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

      showToast(`'${slug}' 폴더가 완전히 삭제되었습니다.`, 'success');
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

  // 6. POST /api/upload/{slug} -> multipart file -> saves to post folder
  async function uploadImage(file) {
    if (!state.currentPost.slug) {
      showToast('이미지를 첨부할 게시글을 먼저 선택하세요.', 'warning');
      return;
    }
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast(`이미지 '${file.name}' 업로드 중...`, 'info');
      const res = await fetch(`/api/upload/${encodeURIComponent(state.currentPost.slug)}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const resData = await res.json().catch(() => ({}));
      const filename = resData.filename || resData.file || file.name;
      
      // Co-located image reference in Hugo post bundle
      const imgMarkdown = `\n![${filename}](${filename})\n`;
      insertAtCursor(imgMarkdown);

      showToast(`이미지 '${filename}' 업로드 및 삽입 완료`, 'success');
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      showToast('이미지 업로드 실패: ' + err.message, 'error');
    }
  }

  /* ==========================================================================
     Auto-save Logic (2s Debounce)
     ========================================================================== */
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
    el.statusText.textContent = text;
    if (isDirty) {
      el.fileStatusIndicator.className = 'status-dot dirty';
      el.fileStatusIndicator.title = '수정됨 (미저장)';
    } else {
      el.fileStatusIndicator.className = 'status-dot synced';
      el.fileStatusIndicator.title = '동기화 완료';
    }
  }

  /* ==========================================================================
     State & Form Synchronization
     ========================================================================== */
  function populateFormFromState() {
    const fm = state.currentPost.frontmatter || {};
    el.postTitleInput.value = fm.title || '';
    el.postSlugInput.value = state.currentPost.slug || '';
    el.postLangSelect.value = state.currentPost.lang || 'ko';
    
    const isDraft = Boolean(fm.draft);
    el.postDraftCheckbox.checked = isDraft;
    el.draftToggleLabel.textContent = isDraft ? '초안' : '발행';
    el.draftBadge.style.display = isDraft ? 'inline-block' : 'none';

    el.langBadge.textContent = (state.currentPost.lang || 'ko').toUpperCase();

    el.postCategoriesInput.value = Array.isArray(fm.categories) ? fm.categories.join(', ') : (fm.categories || '');
    el.postTagsInput.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');
    el.postDescInput.value = fm.description || '';

    el.markdownEditor.value = state.currentPost.content || '';
    el.currentFileName.textContent = fm.title || state.currentPost.slug || '선택된 글 없음';
  }

  function syncStateFromForm() {
    const fm = state.currentPost.frontmatter || {};
    fm.title = el.postTitleInput.value.trim() || state.currentPost.slug;
    fm.draft = el.postDraftCheckbox.checked;
    
    // Parse categories
    fm.categories = el.postCategoriesInput.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Parse tags
    fm.tags = el.postTagsInput.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    fm.description = el.postDescInput.value.trim();
    
    if (!fm.date) {
      // ISO timestamp with timezone
      fm.date = formatISODate(new Date());
    }

    state.currentPost.lang = el.postLangSelect.value;
    state.currentPost.content = el.markdownEditor.value;
  }

  function formatISODate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
  }

  function resetEditor() {
    state.currentPost = {
      slug: '',
      lang: 'ko',
      frontmatter: { title: '', draft: false, tags: [], categories: [], description: '' },
      content: '',
      files: [],
      dirty: false
    };
    populateFormFromState();
    el.deletePostBtn.style.display = 'none';
    el.currentFileName.textContent = '게시글을 선택하세요';
    updateStatusIndicator('준비됨', false);
    updatePreview();
  }

  /* ==========================================================================
     Sidebar Post List Rendering & Filtering
     ========================================================================== */
  function renderPostList() {
    const query = el.postSearchInput.value.trim().toLowerCase();
    const filtered = state.posts.filter(p => {
      const title = (p.title || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();
      const tags = (Array.isArray(p.tags) ? p.tags.join(' ') : '').toLowerCase();
      return title.includes(query) || slug.includes(query) || tags.includes(query);
    });

    el.sidebarPostCount.textContent = filtered.length;

    if (filtered.length === 0) {
      el.postList.innerHTML = '<div class="empty-placeholder">게시글이 없습니다.</div>';
      return;
    }

    let html = '';
    filtered.forEach(p => {
      const isActive = state.currentPost.slug === p.slug && state.currentPost.lang === (p.lang || 'ko');
      const dateDisplay = p.date ? p.date.substring(0, 10) : '';
      const isDraft = Boolean(p.draft);
      const lang = (p.lang || 'ko').toUpperCase();

      html += `
        <div class="post-item ${isActive ? 'active' : ''}" data-slug="${escapeHtml(p.slug)}" data-lang="${escapeHtml(p.lang || 'ko')}">
          <div class="post-item-header">
            <h4 class="post-item-title">${escapeHtml(p.title || p.slug)}</h4>
          </div>
          <div class="post-item-meta">
            <span class="post-item-date">${dateDisplay}</span>
            <div class="post-item-badges">
              <span class="badge-mini badge-lang">${lang}</span>
              ${isDraft ? '<span class="badge-mini badge-draft">Draft</span>' : ''}
            </div>
          </div>
          <div class="post-item-slug">${escapeHtml(p.slug)}</div>
        </div>
      `;
    });

    el.postList.innerHTML = html;

    // Attach click listeners
    el.postList.querySelectorAll('.post-item').forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        const lang = item.getAttribute('data-lang') || 'ko';
        if (state.currentPost.slug === slug && state.currentPost.lang === lang) return;

        if (state.currentPost.dirty) {
          savePost(true); // Save current changes first
        }
        loadPost(slug, lang);
      });
    });
  }

  function highlightActivePost(slug, lang) {
    el.postList.querySelectorAll('.post-item').forEach(item => {
      const match = item.getAttribute('data-slug') === slug && item.getAttribute('data-lang') === lang;
      if (match) item.classList.add('active');
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
      case 'h1':
        insertAtCursor(`\n# ${selected || '제목 1'}\n`);
        break;
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
      case 'strike':
        insertAtCursor(`~~${selected || '취소선 텍스트'}~~`);
        break;
      case 'quote':
        insertAtCursor(`\n> ${selected || '인용문 내용'}\n`);
        break;
      case 'code':
        if (selected.includes('\n')) {
          insertAtCursor(`\n\`\`\`javascript\n${selected}\n\`\`\`\n`);
        } else {
          insertAtCursor(`\`${selected || '코드'}\``);
        }
        break;
      case 'ul':
        insertAtCursor(`\n- ${selected || '목록 항목'}\n`);
        break;
      case 'ol':
        insertAtCursor(`\n1. ${selected || '첫 번째 항목'}\n`);
        break;
      case 'table':
        insertAtCursor(`\n| 열 1 | 열 2 | 열 3 |\n| :--- | :---: | ---: |\n| 내용 A | 내용 B | 내용 C |\n| 내용 D | 내용 E | 내용 F |\n\n`);
        break;
      case 'hr':
        insertAtCursor(`\n\n---\n\n`);
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
      el.livePreview.innerHTML = '<p class="preview-placeholder">본문을 입력하면 실시간으로 렌더링됩니다.</p>';
      return;
    }

    const html = parseMarkdownForPreview(rawMarkdown);
    el.livePreview.innerHTML = html;

    // Trigger KaTeX Auto-render
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(el.livePreview, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false,
          macros: {
            "\\R": "\\mathbb{R}",
            "\\C": "\\mathbb{C}",
            "\\N": "\\mathbb{N}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\inner": "\\langle #1, #2 \\rangle",
            "\\norm": "\\|#1\\|"
          }
        });
      } catch (err) {
        console.warn('KaTeX render warning:', err);
      }
    }

    // Trigger Mermaid Rendering
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
  }

  /**
   * Markdown parser protecting math, mermaid and shortcodes from collision
   */
  function parseMarkdownForPreview(md) {
    const blockTokens = [];
    function saveToken(content) {
      const id = `%%%PTOKEN_${blockTokens.length}%%%`;
      blockTokens.push(content);
      return id;
    }

    let text = md;

    // 1. Process Hugo Callout Shortcode
    text = text.replace(/{{<\s*callout\s+(?:type="([^"]+)"|([a-zA-Z0-9_-]+))(?:\s+title="([^"]+)"|\s+"([^"]+)")?\s*>}}([\s\S]*?){{<\s*\/callout\s*>}}/gi, (m, t1, t2, tit1, tit2, inner) => {
      const type = (t1 || t2 || 'note').toLowerCase();
      let title = tit1 || tit2 || '';
      
      let icon = 'ℹ';
      if (type === 'theorem') { icon = '📐'; if (!title) title = 'Theorem'; }
      else if (type === 'definition') { icon = '📖'; if (!title) title = 'Definition'; }
      else if (type === 'proof') { icon = '∎'; if (!title) title = 'Proof'; }
      else if (type === 'tip') { icon = '💡'; if (!title) title = 'Tip'; }
      else if (type === 'warning') { icon = '⚠'; if (!title) title = 'Warning'; }
      else { icon = 'ℹ'; if (!title) title = 'Note'; }

      const renderedInner = renderMarkdownInline(inner.trim());
      const block = `
        <div class="callout callout--${type}">
          <div class="callout-header">
            <span class="callout-icon">${icon}</span>
            <span class="callout-title">${escapeHtml(title)}</span>
          </div>
          <div class="callout-content">${renderedInner}</div>
        </div>
      `;
      return saveToken(block);
    });

    // 2. Process Interactive shortcode
    text = text.replace(/{{<\s*interactive(?:\s+[^>]+)?\s*>}}([\s\S]*?){{<\s*\/interactive\s*>}}/gi, () => {
      const block = `
        <div class="interactive-wrap">
          <div class="interactive-sandbox">[인터랙티브 샌드박스 컴포넌트 렌더 영역]</div>
        </div>
      `;
      return saveToken(block);
    });

    // 3. Process Mermaid code blocks
    text = text.replace(/```mermaid\s*\n([\s\S]*?)```/gi, (m, code) => {
      const block = `
        <div class="mermaid-wrap">
          <div class="mermaid" data-mermaid-src="${escapeHtml(code.trim())}">
            ${code.trim()}
          </div>
        </div>
      `;
      return saveToken(block);
    });

    // 4. Process Math/Latex code blocks
    text = text.replace(/```(?:math|latex)\s*\n([\s\S]*?)```/gi, (m, code) => {
      const block = `<div class="math-block">$$${code.trim()}$$</div>`;
      return saveToken(block);
    });

    // 5. Process Regular Code Blocks
    text = text.replace(/```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g, (m, lang, code) => {
      const langLabel = lang || 'text';
      const block = `
        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">${escapeHtml(langLabel)}</span>
            <button type="button" class="copy-code-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').innerText)">복사</button>
          </div>
          <div class="highlight">
            <pre><code class="language-${escapeHtml(langLabel)}">${escapeHtml(code)}</code></pre>
          </div>
        </div>
      `;
      return saveToken(block);
    });

    // 6. Process Display Math ($$...$$)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => {
      const block = `<div class="math-block">$$${math.trim()}$$</div>`;
      return saveToken(block);
    });

    // 7. Process Inline Math ($...$)
    text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (m, prefix, math) => {
      const block = `$${math}$`;
      return prefix + saveToken(block);
    });

    // 8. Process Standard Markdown
    text = renderMarkdownCore(text);

    // 9. Restore Tokens
    blockTokens.forEach((saved, idx) => {
      const token = `%%%PTOKEN_${idx}%%%`;
      text = text.split(token).join(saved);
    });

    return text;
  }

  function renderMarkdownCore(md) {
    let html = md;

    // Headings
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal Rule
    html = html.replace(/^\s*(?:---|\*\*\*|___)\s*$/gim, '<hr>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Tables
    html = html.replace(/((?:^\|.+?\|(?:\r?\n|$))+)/gm, (match) => {
      const lines = match.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return match;
      
      const headerRow = lines[0];
      const isDivider = /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1]);
      if (!isDivider) return match;

      const parseCells = (row) => row.split('|').slice(1, -1).map(c => c.trim());
      const ths = parseCells(headerRow).map(h => `<th>${renderMarkdownInline(h)}</th>`).join('');
      
      let tbody = '';
      for (let i = 2; i < lines.length; i++) {
        const tds = parseCells(lines[i]).map(c => `<td>${renderMarkdownInline(c)}</td>`).join('');
        tbody += `<tr>${tds}</tr>`;
      }

      return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    });

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>(\r?\n)?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<oli>$1</oli>');
    html = html.replace(/(<oli>.*<\/oli>(\r?\n)?)+/g, (match) => {
      return '<ol>' + match.replace(/<\/?oli>/g, (t) => t.replace('oli', 'li')) + '</ol>';
    });

    // Inline elements
    html = renderMarkdownInline(html);

    // Paragraphs
    const paras = html.split(/\n\s*\n/);
    html = paras.map(p => {
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
      // Images: ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="post-img">')
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Inline Code
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
     LaTeX Palette Tabs & Live Preview Box
     ========================================================================== */
  function setupMathPaletteTabs() {
    const tabBtns = el.mathPaletteModal.querySelectorAll('.palette-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tabKey = btn.getAttribute('data-tab');
        el.mathPaletteModal.querySelectorAll('.tab-section').forEach(sec => {
          sec.classList.remove('active');
        });
        const targetSec = document.getElementById(`tab-${tabKey}`);
        if (targetSec) targetSec.classList.add('active');
      });
    });

    // Clicking palette buttons appends to LaTeX formula input
    el.mathPaletteModal.querySelectorAll('.pal-btn').forEach(palBtn => {
      palBtn.addEventListener('click', () => {
        const latex = palBtn.getAttribute('data-latex');
        if (!latex) return;
        const cur = el.mathFormulaInput.value;
        el.mathFormulaInput.value = cur ? `${cur} ${latex}` : latex;
        updateMathFormulaPreview();
      });
    });
  }

  function updateMathFormulaPreview() {
    const formula = el.mathFormulaInput.value.trim();
    if (!formula) {
      el.mathPreviewBox.innerHTML = '<span class="placeholder-text">수식을 입력하세요</span>';
      return;
    }

    if (typeof katex !== 'undefined') {
      try {
        el.mathPreviewBox.innerHTML = katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false,
          macros: {
            "\\R": "\\mathbb{R}",
            "\\C": "\\mathbb{C}",
            "\\N": "\\mathbb{N}",
            "\\Z": "\\mathbb{Z}"
          }
        });
      } catch (err) {
        el.mathPreviewBox.innerHTML = `<span class="err-text">${escapeHtml(err.message)}</span>`;
      }
    }
  }

  /* ==========================================================================
     Mermaid Wizard Presets & Live Preview Box
     ========================================================================== */
  function setupMermaidPresetSelector() {
    const typeCards = el.mermaidWizardModal.querySelectorAll('.type-card');
    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        typeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const presetKey = card.getAttribute('data-preset');
        if (mermaidPresets[presetKey]) {
          el.mermaidCodeInput.value = mermaidPresets[presetKey];
          updateMermaidModalPreview();
        }
      });
    });
  }

  function updateMermaidModalPreview() {
    clearTimeout(state.mermaidTimer);
    state.mermaidTimer = setTimeout(async () => {
      const code = el.mermaidCodeInput.value.trim();
      if (!code || typeof mermaid === 'undefined') {
        el.mermaidPreviewBox.innerHTML = '<span class="placeholder-text">다이어그램 코드를 입력하세요.</span>';
        return;
      }

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose'
        });
        const id = 'mermaid-temp-' + Math.floor(Math.random() * 100000);
        const { svg } = await mermaid.render(id, code);
        el.mermaidPreviewBox.innerHTML = svg;
      } catch (err) {
        el.mermaidPreviewBox.innerHTML = `<span class="err-text">다이어그램 문법 오류: ${escapeHtml(err.message || '렌더링 실패')}</span>`;
      }
    }, 250);
  }

  /* ==========================================================================
     New Post Dialog Workflow
     ========================================================================== */
  function openNewPostModal() {
    el.newPostSlug.value = '';
    el.newPostTitle.value = '';
    el.newPostCategories.value = '';
    el.newPostTags.value = '';
    el.newPostDesc.value = '';
    el.newPostLang.value = 'ko';
    openModal(el.newPostModal);
    setTimeout(() => el.newPostSlug.focus(), 100);
  }

  async function submitNewPost() {
    let slug = el.newPostSlug.value.trim().toLowerCase();
    slug = slug.replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const title = el.newPostTitle.value.trim();
    const lang = el.newPostLang.value || 'ko';

    if (!slug) {
      alert('슬러그(영문, 숫자, 하이픈)를 입력해주세요.');
      el.newPostSlug.focus();
      return;
    }
    if (!title) {
      alert('게시글 제목을 입력해주세요.');
      el.newPostTitle.focus();
      return;
    }

    const categories = el.newPostCategories.value.split(',').map(s => s.trim()).filter(Boolean);
    const tags = el.newPostTags.value.split(',').map(s => s.trim()).filter(Boolean);
    const description = el.newPostDesc.value.trim();

    const frontmatter = {
      title,
      date: formatISODate(new Date()),
      draft: false,
      tags,
      categories,
      math: true,
      mermaid: false,
      description
    };

    const initialContent = `## 개요\n\n이곳에 **${title}**의 서론 및 본문을 작성하세요.\n\n### 1. 주요 개념\n\n- 핵심 요약 내용\n- 추가 설명\n`;

    await createPost(slug, frontmatter, initialContent);
  }

  /* ==========================================================================
     Drag & Drop and Paste for Co-located Image Upload
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
     Split View Modes (Both / Editor Only / Preview Only)
     ========================================================================== */
  function toggleSplitView() {
    if (state.splitMode === 'both') {
      state.splitMode = 'editor';
      el.previewPane.style.display = 'none';
      el.editorPane.style.flex = '1';
      el.toggleSplitViewBtn.textContent = '✎ 에디터 모드';
    } else if (state.splitMode === 'editor') {
      state.splitMode = 'preview';
      el.editorPane.style.display = 'none';
      el.previewPane.style.display = 'flex';
      el.previewPane.style.flex = '1';
      el.toggleSplitViewBtn.textContent = '👁 미리보기 모드';
    } else {
      state.splitMode = 'both';
      el.editorPane.style.display = 'flex';
      el.previewPane.style.display = 'flex';
      el.editorPane.style.flex = '1';
      el.previewPane.style.flex = '1';
      el.toggleSplitViewBtn.textContent = '◫ 분할 뷰';
    }
  }

  /* ==========================================================================
     Modals & Toast Helpers
     ========================================================================== */
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function showToast(message, type = 'info') {
    el.toast.textContent = message;
    el.toast.className = `toast-notification show ${type}`;
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => {
      el.toast.className = 'toast-notification';
    }, 3200);
  }

  // Self Boot
  document.addEventListener('DOMContentLoaded', init);
})();
