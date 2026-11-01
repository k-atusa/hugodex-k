/**
 * hugodex Studio : In-browser Web Editor & Visual Wizard Engine
 * Single Page Application directly integrating with GitHub REST API
 */

(function () {
  // State Store
  const state = {
    ghToken: localStorage.getItem('hugodex_gh_token') || '',
    ghOwner: localStorage.getItem('hugodex_gh_owner') || '',
    ghRepo: localStorage.getItem('hugodex_gh_repo') || '',
    ghBranch: localStorage.getItem('hugodex_gh_branch') || 'main',
    
    currentFilePath: '',
    currentFileSha: '',
    isDirty: false,
    filesList: []
  };

  // DOM Elements
  const el = {
    // App Bar
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    newPostBtn: document.getElementById('newPostBtn'),
    publishBtn: document.getElementById('publishBtn'),
    currentFileName: document.getElementById('currentFileName'),
    fileStatusIndicator: document.getElementById('fileStatusIndicator'),
    draftBadge: document.getElementById('draftBadge'),

    // Sidebar
    fileTreeContainer: document.getElementById('fileTreeContainer'),
    refreshRepoBtn: document.getElementById('refreshRepoBtn'),

    // Metadata Form
    postTitleInput: document.getElementById('postTitleInput'),
    postFolderInput: document.getElementById('postFolderInput'),
    postLangSelect: document.getElementById('postLangSelect'),
    postDraftCheckbox: document.getElementById('postDraftCheckbox'),
    postTagsInput: document.getElementById('postTagsInput'),
    postCategoriesInput: document.getElementById('postCategoriesInput'),

    // Editor & Preview
    markdownEditor: document.getElementById('markdownEditor'),
    livePreview: document.getElementById('livePreview'),
    splitViewContainer: document.getElementById('splitViewContainer'),
    toggleSplitViewBtn: document.getElementById('toggleSplitViewBtn'),

    // Feature Buttons
    openMathPaletteBtn: document.getElementById('openMathPaletteBtn'),
    openMermaidWizardBtn: document.getElementById('openMermaidWizardBtn'),
    openCalloutWizardBtn: document.getElementById('openCalloutWizardBtn'),
    openSvgWizardBtn: document.getElementById('openSvgWizardBtn'),
    openInteractiveWizardBtn: document.getElementById('openInteractiveWizardBtn'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    imageFileInput: document.getElementById('imageFileInput'),

    // Modals
    mathPaletteModal: document.getElementById('mathPaletteModal'),
    mermaidWizardModal: document.getElementById('mermaidWizardModal'),
    calloutWizardModal: document.getElementById('calloutWizardModal'),
    settingsModal: document.getElementById('settingsModal'),

    // Settings Inputs
    ghTokenInput: document.getElementById('ghTokenInput'),
    ghOwnerInput: document.getElementById('ghOwnerInput'),
    ghRepoInput: document.getElementById('ghRepoInput'),
    ghBranchInput: document.getElementById('ghBranchInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),

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

    // Toast
    toast: document.getElementById('toastNotification')
  };

  // Preset Mermaid Templates
  const mermaidPresets = {
    flowchart: `graph TD
    A[사용자 요청] --> B{캐시 확인}
    B -- 캐시 있음 --> C[캐시된 결과 반환]
    B -- 캐시 없음 --> D[데이터베이스 조회]
    D --> E[캐시 갱신]
    E --> C`,
    
    sequence: `sequenceDiagram
    autonumber
    actor User as 사용자
    participant Client as 클라이언트 웹
    participant Server as GitHub Pages
    participant API as GitHub REST API

    User->>Client: 글 작성 및 발행 클릭
    Client->>API: PUT /repos/.../contents (Base64)
    API-->>Client: 201 Created (Commit SHA)
    Client->>User: "발행 완료!" 토스트 표시`,

    class: `classDiagram
    class Post {
        +String title
        +Date date
        +Boolean draft
        +Array tags
        +render()
    }
    class MathPost {
        +String latexEngine
        +renderEquations()
    }
    Post <|-- MathPost`,

    state: `stateDiagram-v2
    [*] --> 초안작성
    초안작성 --> 검토중: Draft 해제
    검토중 --> 배포완료: GitHub Commit & Push
    배포완료 --> [*]`,

    git: `gitGraph
    commit id: "초기 설정"
    branch develop
    checkout develop
    commit id: "LaTeX 수식 엔진 추가"
    commit id: "웹 에디터 추가"
    checkout main
    merge develop id: "릴리즈 v1.0"`
  };

  /* ==========================================================================
     Initialization
     ========================================================================== */
  function init() {
    bindEvents();
    loadSettingsInputs();
    
    // URL 파라미터에서 파일 경로 확인 (예: ?file=content/posts/my-post/index.ko.md)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedFile = urlParams.get('file');

    if (state.ghToken && state.ghOwner && state.ghRepo) {
      fetchRepositoryFiles().then(() => {
        if (requestedFile) {
          loadFileFromRepo(requestedFile);
        } else {
          loadDefaultTemplate();
        }
      });
    } else {
      loadDefaultTemplate();
      showToast('GitHub 연동 설정을 입력하면 저장소 글을 관리할 수 있습니다.', 'info');
    }

    updatePreview();
  }

  function loadSettingsInputs() {
    el.ghTokenInput.value = state.ghToken;
    el.ghOwnerInput.value = state.ghOwner;
    el.ghRepoInput.value = state.ghRepo;
    el.ghBranchInput.value = state.ghBranch;
  }

  function loadDefaultTemplate() {
    el.postTitleInput.value = "새로운 학술 & 프로그래밍 포스트";
    el.postFolderInput.value = "posts/new-topic";
    el.postLangSelect.value = "ko";
    el.postDraftCheckbox.checked = false;
    el.postTagsInput.value = "수학, 알고리즘";
    el.postCategoriesInput.value = "Computer Science";

    el.markdownEditor.value = `## 개요

이곳에 글의 서론을 작성합니다.

### 1. 고급 수학 공식

학부 이상의 고급 수학 공식이나 정리를 간편하게 작성할 수 있습니다.

$$
\\oint_{C} \\mathbf{B} \\cdot d\\boldsymbol{\\ell} = \\mu_0 \\left( I_{\\text{enc}} + \\varepsilon_0 \\frac{d\\Phi_E}{dt} \\right)
$$

### 2. 아키텍처 다이어그램

\`\`\`mermaid
graph TD
    A[입력 데이터] --> B[수학적 모델링]
    B --> C{수렴 판정}
    C -- Yes --> D[최종 결과 출력]
    C -- No --> B
\`\`\`

### 3. 알고리즘 코드

\`\`\`python
def fibonacci(n: int) -> int:
    """메모이제이션 기반 피보나치 수열"""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`
`;
    state.currentFilePath = '';
    state.currentFileSha = '';
    el.currentFileName.textContent = "새 글 (미저장)";
    updatePreview();
  }

  /* ==========================================================================
     Event Bindings
     ========================================================================== */
  function bindEvents() {
    // Editor typing & preview
    let debounceTimer;
    el.markdownEditor.addEventListener('input', () => {
      setDirty(true);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updatePreview, 250);
    });

    // Metadata changes
    [el.postTitleInput, el.postFolderInput, el.postLangSelect, el.postTagsInput, el.postCategoriesInput].forEach(input => {
      input.addEventListener('input', () => setDirty(true));
    });

    el.postDraftCheckbox.addEventListener('change', () => {
      setDirty(true);
      el.draftBadge.style.display = el.postDraftCheckbox.checked ? 'inline-block' : 'none';
    });

    // Format Toolbar buttons
    document.querySelectorAll('.tb-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleToolbarAction(btn.getAttribute('data-action')));
    });

    // New Post
    el.newPostBtn.addEventListener('click', () => {
      if (state.isDirty && !confirm('저장되지 않은 변경사항이 있습니다. 새 글을 작성하시겠습니까?')) return;
      loadDefaultTemplate();
      setDirty(false);
    });

    // Settings Modal
    el.openSettingsBtn.addEventListener('click', () => openModal(el.settingsModal));
    el.saveSettingsBtn.addEventListener('click', handleSaveSettings);

    // Refresh Repo
    el.refreshRepoBtn.addEventListener('click', fetchRepositoryFiles);

    // Publish (Commit) Button
    el.publishBtn.addEventListener('click', handlePublishPost);

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) closeModal(modal);
      });
    });

    // LaTeX Palette Wizard
    el.openMathPaletteBtn.addEventListener('click', () => {
      openModal(el.mathPaletteModal);
      updateMathPreview();
    });

    document.querySelectorAll('.palette-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.palette-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.palette-grid').forEach(g => g.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`tab-${btn.getAttribute('data-tab')}`);
        if (target) target.classList.add('active');
      });
    });

    document.querySelectorAll('.pal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const latex = btn.getAttribute('data-latex');
        el.mathFormulaInput.value += (el.mathFormulaInput.value ? ' ' : '') + latex;
        updateMathPreview();
      });
    });

    el.mathFormulaInput.addEventListener('input', updateMathPreview);

    el.insertInlineMathBtn.addEventListener('click', () => {
      const code = el.mathFormulaInput.value.trim();
      if (code) insertAtCursor(`$${code}$`);
      closeModal(el.mathPaletteModal);
    });

    el.insertBlockMathBtn.addEventListener('click', () => {
      const code = el.mathFormulaInput.value.trim();
      if (code) insertAtCursor(`\n\n$$\n${code}\n$$\n\n`);
      closeModal(el.mathPaletteModal);
    });

    // Mermaid Wizard
    el.openMermaidWizardBtn.addEventListener('click', () => {
      openModal(el.mermaidWizardModal);
      if (!el.mermaidCodeInput.value) {
        el.mermaidCodeInput.value = mermaidPresets.flowchart;
      }
      updateMermaidPreview();
    });

    document.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const type = card.getAttribute('data-type');
        if (mermaidPresets[type]) {
          el.mermaidCodeInput.value = mermaidPresets[type];
          updateMermaidPreview();
        }
      });
    });

    el.mermaidCodeInput.addEventListener('input', updateMermaidPreview);

    el.insertDiagramBtn.addEventListener('click', () => {
      const code = el.mermaidCodeInput.value.trim();
      if (code) insertAtCursor(`\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`);
      closeModal(el.mermaidWizardModal);
    });

    // Callout Wizard
    el.openCalloutWizardBtn.addEventListener('click', () => openModal(el.calloutWizardModal));
    el.insertCalloutBtn.addEventListener('click', () => {
      const type = el.calloutTypeSelect.value;
      const title = el.calloutTitleInput.value.trim();
      const content = el.calloutContentInput.value.trim();
      const titleAttr = title ? ` title="${title}"` : '';
      insertAtCursor(`\n\n{{< callout type="${type}"${titleAttr} >}}\n${content}\n{{< /callout >}}\n\n`);
      closeModal(el.calloutWizardModal);
    });

    // SVG Wizard
    el.openSvgWizardBtn.addEventListener('click', () => {
      const sampleSvg = `\n\n{{< svg-inline >}}
<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" style="max-width: 300px; margin: 0 auto; display: block;">
  <rect x="10" y="10" width="80" height="80" fill="#3b82f6" rx="8" />
  <circle cx="150" cy="50" r="40" fill="#10b981" />
  <text x="50" y="55" fill="#fff" font-size="12" text-anchor="middle">Box</text>
  <text x="150" y="55" fill="#fff" font-size="12" text-anchor="middle">Node</text>
</svg>
{{< /svg-inline >}}\n\n`;
      insertAtCursor(sampleSvg);
    });

    // Interactive Wizard
    el.openInteractiveWizardBtn.addEventListener('click', () => {
      const sampleInteractive = `\n\n{{< interactive id="interactive-demo" height="280px" title="캔버스 실시간 인터랙션" >}}
<canvas id="cv" width="400" height="200" style="width: 100%; max-width: 400px; background: #0f172a; border-radius: 8px; display: block; margin: 0 auto;"></canvas>
<script>
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < cv.width; x++) {
      const y = cv.height / 2 + Math.sin((x + t) * 0.05) * 40;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    t += 2;
    requestAnimationFrame(draw);
  }
  draw();
</script>
{{< /interactive >}}\n\n`;
      insertAtCursor(sampleInteractive);
    });

    // Image Upload
    el.uploadImageBtn.addEventListener('click', () => el.imageFileInput.click());
    el.imageFileInput.addEventListener('change', handleImageUpload);
  }

  function setDirty(isDirty) {
    state.isDirty = isDirty;
    if (isDirty) {
      el.fileStatusIndicator.classList.add('dirty');
      el.fileStatusIndicator.title = "수정됨 (미발행)";
    } else {
      el.fileStatusIndicator.classList.remove('dirty');
      el.fileStatusIndicator.title = "동기화됨";
    }
  }

  function openModal(modal) { modal.classList.add('active'); }
  function closeModal(modal) { modal.classList.remove('active'); }

  function showToast(msg, type = 'info') {
    el.toast.textContent = msg;
    el.toast.className = `toast-notification show ${type}`;
    setTimeout(() => {
      el.toast.className = 'toast-notification';
    }, 3500);
  }

  /* ==========================================================================
     Editor Text Manipulation
     ========================================================================== */
  function insertAtCursor(textToInsert) {
    const area = el.markdownEditor;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const original = area.value;

    area.value = original.substring(0, start) + textToInsert + original.substring(end);
    area.selectionStart = area.selectionEnd = start + textToInsert.length;
    area.focus();
    setDirty(true);
    updatePreview();
  }

  function handleToolbarAction(action) {
    const area = el.markdownEditor;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = area.value.substring(start, end) || '텍스트';

    let replacement = '';
    switch (action) {
      case 'heading1': replacement = `\n# ${selected}\n`; break;
      case 'heading2': replacement = `\n## ${selected}\n`; break;
      case 'heading3': replacement = `\n### ${selected}\n`; break;
      case 'bold': replacement = `**${selected}**`; break;
      case 'italic': replacement = `*${selected}*`; break;
      case 'strike': replacement = `~~${selected}~~`; break;
      case 'ul': replacement = `\n- ${selected}\n`; break;
      case 'ol': replacement = `\n1. ${selected}\n`; break;
      case 'quote': replacement = `\n> ${selected}\n`; break;
      case 'table':
        replacement = `\n| 항목 | 설명 | 비고 |\n| :--- | :--- | :--- |\n| 데이터 1 | 설명 1 | 상세 |\n| 데이터 2 | 설명 2 | 상세 |\n`;
        break;
    }

    if (replacement) {
      insertAtCursor(replacement);
    }
  }

  /* ==========================================================================
     Real-time Live Preview Engine
     ========================================================================== */
  function updatePreview() {
    const rawMarkdown = el.markdownEditor.value;

    // 1. 단축코드 임시 변환
    let html = rawMarkdown
      // Callout 단축코드 변환
      .replace(/{{<\s*callout\s+type="([^"]+)"(?:\s+title="([^"]+)")?\s*>}}([\s\S]*?){{<\s*\/callout\s*>}}/g, (match, type, title, inner) => {
        const titleText = title || type.toUpperCase();
        return `<div class="callout callout-${type}"><div class="callout-header"><span class="callout-title">${titleText}</span></div><div class="callout-content">${inner}</div></div>`;
      })
      // Interactive 단축코드 변환 (미리보기 배너)
      .replace(/{{<\s*interactive(?:\s+[^>]+)?\s*>}}([\s\S]*?){{<\s*\/interactive\s*>}}/g, () => {
        return `<div class="interactive-sandbox" style="padding:16px; background:#f1f5f9; border-radius:6px; text-align:center; color:#64748b; font-weight:600;">[인터랙티브 컴포넌트 실시간 샌드박스 영역]</div>`;
      })
      // Mermaid 코드 블록 보존
      .replace(/```mermaid([\s\S]*?)```/g, (match, code) => {
        return `<div class="mermaid">${code.trim()}</div>`;
      })
      // Math 코드 블록 보존
      .replace(/```math([\s\S]*?)```/g, (match, code) => {
        return `<div class="math-display">$$${code.trim()}$$</div>`;
      });

    // 2. 기본 마크다운 문법 변환
    html = renderBasicMarkdown(html);

    el.livePreview.innerHTML = html;

    // 3. KaTeX 실시간 렌더링
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(el.livePreview, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }

    // 4. Mermaid 실시간 렌더링
    if (typeof mermaid !== 'undefined') {
      const mermaidElements = el.livePreview.querySelectorAll('.mermaid');
      if (mermaidElements.length > 0) {
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        mermaid.run({ nodes: mermaidElements });
      }
    }
  }

  function renderBasicMarkdown(md) {
    return md
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/~~(.*?)~~/gim, '<del>$1</del>')
      // Quotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Unordered Lists
      .replace(/^\s*\-\s+(.*$)/gim, '<li>$1</li>')
      // Paragraphs & Line Breaks
      .replace(/\n\n/gim, '<p></p>');
  }

  /* ==========================================================================
     LaTeX & Mermaid Modal Previews
     ========================================================================== */
  function updateMathPreview() {
    const formula = el.mathFormulaInput.value.trim();
    if (!formula) {
      el.mathPreviewBox.innerHTML = '<em>수식을 입력하세요</em>';
      return;
    }
    if (typeof katex !== 'undefined') {
      try {
        el.mathPreviewBox.innerHTML = katex.renderToString(formula, { displayMode: true, throwOnError: false });
      } catch (err) {
        el.mathPreviewBox.innerHTML = `<span style="color:#ef4444;">${err.message}</span>`;
      }
    }
  }

  let mermaidDebounce;
  function updateMermaidPreview() {
    clearTimeout(mermaidDebounce);
    mermaidDebounce = setTimeout(() => {
      const code = el.mermaidCodeInput.value.trim();
      if (!code || typeof mermaid === 'undefined') return;

      try {
        mermaid.render('mermaid-svg-temp', code).then(({ svg }) => {
          el.mermaidPreviewBox.innerHTML = svg;
        }).catch(err => {
          el.mermaidPreviewBox.innerHTML = `<span style="color:#ef4444; font-size:0.8rem;">문법 오류: ${err.message || '다이어그램 파싱 실패'}</span>`;
        });
      } catch (err) {
        console.error(err);
      }
    }, 300);
  }

  /* ==========================================================================
     GitHub REST API Integration (Zero-Backend)
     ========================================================================== */
  async function handleSaveSettings() {
    state.ghToken = el.ghTokenInput.value.trim();
    state.ghOwner = el.ghOwnerInput.value.trim();
    state.ghRepo = el.ghRepoInput.value.trim();
    state.ghBranch = el.ghBranchInput.value.trim() || 'main';

    localStorage.setItem('hugodex_gh_token', state.ghToken);
    localStorage.setItem('hugodex_gh_owner', state.ghOwner);
    localStorage.setItem('hugodex_gh_repo', state.ghRepo);
    localStorage.setItem('hugodex_gh_branch', state.ghBranch);

    closeModal(el.settingsModal);
    showToast('설정이 저장되었습니다. 저장소 연결을 테스트합니다...', 'info');
    await fetchRepositoryFiles();
  }

  async function fetchRepositoryFiles() {
    if (!state.ghToken || !state.ghOwner || !state.ghRepo) {
      el.fileTreeContainer.innerHTML = '<div class="loading-state">GitHub 연동 설정을 완료해 주세요.</div>';
      return;
    }

    el.fileTreeContainer.innerHTML = '<div class="loading-state">저장소 탐색 중...</div>';

    try {
      // Git Tree API (재귀적으로 content/ 디렉토리 탐색)
      const res = await fetch(`https://api.github.com/repos/${state.ghOwner}/${state.ghRepo}/git/trees/${state.ghBranch}?recursive=1`, {
        headers: {
          'Authorization': `Bearer ${state.ghToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: 저장소를 찾을 수 없거나 토큰 권한이 부족합니다.`);

      const data = await res.json();
      const postFiles = data.tree.filter(item => 
        item.type === 'blob' && 
        item.path.startsWith('content/posts/') && 
        item.path.endsWith('.md')
      );

      state.filesList = postFiles;
      renderFileTree(postFiles);
      showToast(`저장소 글 목록 동기화 완료 (${postFiles.length}개 파일)`, 'success');
    } catch (err) {
      console.error(err);
      el.fileTreeContainer.innerHTML = `<div class="loading-state" style="color:#ef4444;">오류: ${err.message}</div>`;
      showToast(err.message, 'error');
    }
  }

  function renderFileTree(files) {
    if (files.length === 0) {
      el.fileTreeContainer.innerHTML = '<div class="loading-state">작성된 게시글이 없습니다. 새 글을 작성해 보세요!</div>';
      return;
    }

    el.fileTreeContainer.innerHTML = '';
    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'tree-item';
      if (file.path === state.currentFilePath) item.classList.add('active');

      const relativeName = file.path.replace('content/posts/', '');
      item.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${relativeName}</span>
      `;

      item.addEventListener('click', () => {
        if (state.isDirty && !confirm('저장되지 않은 변경사항이 있습니다. 이 파일을 여시겠습니까?')) return;
        loadFileFromRepo(file.path);
      });

      el.fileTreeContainer.appendChild(item);
    });
  }

  async function loadFileFromRepo(filePath) {
    showToast(`파일 불러오는 중: ${filePath}...`, 'info');
    try {
      const res = await fetch(`https://api.github.com/repos/${state.ghOwner}/${state.ghRepo}/contents/${filePath}?ref=${state.ghBranch}`, {
        headers: {
          'Authorization': `Bearer ${state.ghToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`파일 로드 실패: HTTP ${res.status}`);

      const data = await res.json();
      state.currentFilePath = filePath;
      state.currentFileSha = data.sha;
      el.currentFileName.textContent = filePath.replace('content/posts/', '');

      // Base64 디코딩 (UTF-8 지원)
      const decodedContent = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      parseFrontMatterAndContent(decodedContent);

      setDirty(false);
      renderFileTree(state.filesList);
      showToast('파일을 성공적으로 열었습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  }

  function parseFrontMatterAndContent(raw) {
    if (raw.startsWith('---')) {
      const parts = raw.split('---');
      if (parts.length >= 3) {
        const yaml = parts[1];
        const body = parts.slice(2).join('---').trim();

        // Simple YAML parsing
        yaml.split('\n').forEach(line => {
          const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            let val = match[2].trim().replace(/^["']|["']$/g, '');
            if (key === 'title') el.postTitleInput.value = val;
            if (key === 'draft') el.postDraftCheckbox.checked = (val === 'true');
            if (key === 'tags') el.postTagsInput.value = val.replace(/[\[\]]/g, '');
            if (key === 'categories') el.postCategoriesInput.value = val.replace(/[\[\]]/g, '');
          }
        });

        // 언어 판단 (.ko.md / .en.md)
        if (state.currentFilePath.endsWith('.en.md')) {
          el.postLangSelect.value = 'en';
        } else {
          el.postLangSelect.value = 'ko';
        }

        el.postDraftCheckbox.dispatchEvent(new Event('change'));
        el.markdownEditor.value = body;
        updatePreview();
        return;
      }
    }
    el.markdownEditor.value = raw;
    updatePreview();
  }

  /* ==========================================================================
     Publish Post (Direct GitHub Commit & Push)
     ========================================================================== */
  async function handlePublishPost() {
    if (!state.ghToken || !state.ghOwner || !state.ghRepo) {
      openModal(el.settingsModal);
      showToast('GitHub 연동 설정을 먼저 입력해 주세요.', 'error');
      return;
    }

    const title = el.postTitleInput.value.trim() || 'Untitled Post';
    const folder = el.postFolderInput.value.trim().replace(/^\/|\/$/g, '') || 'posts';
    const lang = el.postLangSelect.value;
    const isDraft = el.postDraftCheckbox.checked;
    const tags = el.postTagsInput.value.split(',').map(t => `"${t.trim()}"`).filter(Boolean).join(', ');
    const categories = el.postCategoriesInput.value.split(',').map(c => `"${c.trim()}"`).filter(Boolean).join(', ');
    const body = el.markdownEditor.value;

    const nowIso = new Date().toISOString();

    // YAML Front Matter 빌드
    const fullContent = `---
title: "${title}"
date: ${nowIso}
draft: ${isDraft}
tags: [${tags}]
categories: [${categories}]
math: true
mermaid: true
---

${body}
`;

    // 파일 경로 결정
    let targetPath = state.currentFilePath;
    if (!targetPath) {
      const slug = title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 'post';
      targetPath = `content/${folder}/${slug}/index.${lang}.md`;
    }

    // Base64 인코딩 (UTF-8 완벽 지원)
    const base64Content = btoa(unescape(encodeURIComponent(fullContent)));

    showToast('GitHub에 커밋하는 중...', 'info');

    try {
      const payload = {
        message: `feat(blog): publish "${title}" via hugodex Studio`,
        content: base64Content,
        branch: state.ghBranch
      };

      if (state.currentFileSha) {
        payload.sha = state.currentFileSha;
      }

      const res = await fetch(`https://api.github.com/repos/${state.ghOwner}/${state.ghRepo}/contents/${targetPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.ghToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`커밋 실패: ${errorData.message || res.status}`);
      }

      const resData = await res.json();
      state.currentFilePath = targetPath;
      state.currentFileSha = resData.content.sha;
      el.currentFileName.textContent = targetPath.replace('content/posts/', '');
      setDirty(false);

      showToast('🎉 GitHub 커밋 완료! GitHub Actions에 의해 자동 빌드 & 배포됩니다.', 'success');
      await fetchRepositoryFiles();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  }

  /* ==========================================================================
     Direct Image Upload to GitHub Repository
     ========================================================================== */
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!state.ghToken || !state.ghOwner || !state.ghRepo) {
      showToast('이미지를 커밋하려면 GitHub 설정을 먼저 등록해야 합니다.', 'error');
      return;
    }

    showToast(`이미지 업로드 중: ${file.name}...`, 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const imagePath = `static/images/posts/${timestamp}_${sanitizedName}`;

      try {
        const res = await fetch(`https://api.github.com/repos/${state.ghOwner}/${state.ghRepo}/contents/${imagePath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${state.ghToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `upload: add image ${sanitizedName}`,
            content: base64Data,
            branch: state.ghBranch
          })
        });

        if (!res.ok) throw new Error('이미지 업로드에 실패했습니다.');

        // 마크다운 이미지 삽입
        const markdownImageUrl = `/images/posts/${timestamp}_${sanitizedName}`;
        insertAtCursor(`\n\n![${file.name}](${markdownImageUrl})\n\n`);
        showToast('이미지가 성공적으로 저장소에 업로드되었습니다!', 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);
})();

