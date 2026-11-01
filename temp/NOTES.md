# hugodex-k 기술 노트 및 알아둘 점 (Technical Notes & Caveats)

> 이 문서는 `hugodex-k` 프로젝트를 구축하고 유지보수할 때 반드시 인지해야 할 아키텍처 결정 사항(ADR), 기술적 제약, 해결책, 유의사항을 기록합니다.

---

## 1. 아키텍처 결정 사항 (Architectural Decision Records)

### ADR-01: 외부 서버 없는 웹 에디터 (Serverless In-browser Editor)
- **배경**: 별도 Node.js, Go, Python 백엔드 서버나 Netlify CMS/Decap CMS와 같은 외부 프록시/서버 없이, 오직 브라우저에서 직접 글을 작성하고 GitHub에 발행해야 함.
- **결정 및 구현**:
  - `static/editor/`에 단일 페이지 애플리케이션(SPA) 형태로 웹 에디터를 내장.
  - 사용자의 **GitHub Fine-grained Personal Access Token(PAT)**을 브라우저 로컬 스토리지(`localStorage`)에 저장하여 인증.
  - GitHub REST API v3 (`https://api.github.com`)는 브라우저 교차 출처(CORS)를 기본 허용하므로 프록시 서버 없이 브라우저에서 직접 `GET`, `PUT` 요청 가능.
  - 파일 탐색기: Git Tree API (`GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`)를 통해 `content/posts/` 아래의 모든 `.md` 파일을 단 1회의 요청으로 신속하게 트리 구조화.
  - 새 글 작성 시 `PUT /repos/{owner}/{repo}/contents/{path}`로 Base64 인코딩된 콘텐츠를 직접 커밋.
- **보안 주의점**:
  - PAT는 블로그 소스 코드에 절대 하드코딩하지 않으며 사용자의 브라우저 로컬스토리지에만 저장.
  - 토큰 권한은 최소한으로 권장: 대상 레포지토리 한정, `Contents: Read and write`, `Metadata: Read-only`.

### ADR-02: 댓글 시스템으로 Giscus 선정
- **배경**: 댓글 저장을 위한 별도 DB나 서버 없이, "단일 GitHub 레포" 요구사항을 충족해야 함.
- **결정**:
  - GitHub Discussions 기반의 오픈소스 댓글 시스템인 **Giscus** 사용.
  - 댓글 데이터가 레포지토리 자체의 Discussions 탭에 저장되므로 외부 데이터베이스가 필요 없고, 스팸 방지 및 깃허브 계정 인증이 자연스럽게 연동됨.
- **사전 요구사항**:
  - GitHub 레포지토리가 `Public` 상태여야 함.
  - GitHub 레포 설정에서 `Discussions` 기능이 활성화되어 있어야 함.
  - Giscus GitHub App이 해당 레포에 설치되어 있어야 함.

### ADR-03: 외부 CDN 완전 배제 및 자체 호스팅 번들링 (Zero External CDN)
- **배경**: 네트워크 차단 환경이나 특정 국가/망에서의 CDN 차단, CDN 무결성 이슈를 방지하고 "필요한 라이브러리를 빌드에 포함시켜 외부 의존성 최소화" 요구조건 달성.
- **결정 및 구현**:
  - `tools/download_assets.py`를 통해 KaTeX core, auto-render, CSS, 필수 woff2 폰트 11종과 Mermaid.js를 `static/vendor/`에 완전 로컬화.
  - 문법 하이라이팅: Hugo 내장 정적 컴파일러인 **Chroma**를 사용하여 HTML 빌드 타임에 문법 색상이 정적으로 생성되도록 설정(클라이언트 런타임 하이라이터 JS 불필요).
  - 폰트: 본문 폰트 및 코드 폰트(JetBrains Mono) 또한 woff2 형식으로 로컬 서빙.

---

## 2. Hugo 파서 및 렌더링 주의점 (Caveats & Solutions)

### 2.1 마크다운 파서(Goldmark)와 LaTeX 충돌 방지
- **문제**:
  - 수식 내에 언더스코어(`_`, 예: `x_1, x_2`)나 별표(`*`, 곱셈 기호)가 포함될 경우, Goldmark 마크다운 파서가 이를 이탤릭(`<em>`)이나 볼드(`<strong>`) 태그로 먼저 파싱해버려 KaTeX 렌더링이 깨지는 고질적인 문제가 발생함.
- **해결책**:
  1. 수식 블록은 렌더 훅(Codeblock Render Hook) ` ```math ` 또는 ` ```latex ` 형태로 작성하거나,
  2. 일반 텍스트 내 `$ ... $` 및 `$$ ... $$`를 사용할 경우, KaTeX `auto-render`의 delimiter 설정 및 Hugo의 Goldmark 설정에서 원시 HTML을 허용(`unsafe: true`)하고 typographer 기능을 비활성화(`typographer: false`)해야 함.

```yaml
# hugo.yaml 설정
markup:
  goldmark:
    renderer:
      unsafe: true # raw HTML, SVG, iframe 삽입을 위해 필수
    extensions:
      typographer: false # 수식의 따옴표나 대시가 스마트 변환되어 LaTeX 문법이 깨지는 현상 방지
```

### 2.2 Mermaid 다이어그램 렌더링 및 다크모드 연동
- **문제**:
  - Mermaid는 페이지 로드 시 SVG로 렌더링되며, 블로그의 다크모드/라이트모드 토글 시 자동으로 색상이 변경되지 않는 문제 발생.
- **해결책**:
  - 원본 다이어그램 텍스트를 DOM에 데이터 속성(`data-mermaid-src`)으로 보관.
  - 테마 변경 이벤트(다크 ↔ 라이트) 감지 시, `mermaid.initialize({ theme: isDark ? 'dark' : 'neutral' })`를 재호출하고 기존 SVG를 원본 소스로부터 다시 렌더링.

### 2.3 Hugo 다국어(i18n) 경로 및 기본 URL 처리
- **문제**:
  - GitHub Pages는 보통 `https://<username>.github.io/<repo-name>/` 형태의 서브 디렉터리 경로를 가짐.
  - 절대 경로(`/css/main.css`)로 링크를 걸면 최상위 도메인(`username.github.io/css/...`)을 찾아가 404 에러 발생.
- **해결책**:
  - 모든 정적 자원 및 링크는 Hugo의 `relURL` 또는 `absURL`, `resources.Get` 파이프라인 사용.
  - `baseURL`: `https://<username>.github.io/<repo-name>/`로 설정.
  - 다국어 URL 구조:
    - 한국어(기본): `https://<url>/posts/...` (`defaultContentLanguageInSubdir: false`)
    - 영어: `https://<url>/en/posts/...`
  - 페이지 번들 네이밍 규칙:
    - `content/posts/my-post/index.ko.md`
    - `content/posts/my-post/index.en.md`

---

## 3. 웹 WYSIWYG 에디터 구현 세부 가이드

### 3.1 수식(LaTeX) GUI 팔레트 구조
- 비전문가나 마크다운/LaTeX 초보자도 마우스 클릭으로 수식을 생성할 수 있도록 다음 버튼 그룹 제공:
  - **구조 템플릿**: 분수(`\frac{a}{b}`), 거듭제곱(`x^n`), 아래첨자(`x_i`), 루트(`\sqrt{x}`), 정적분(`\int_a^b`), 시그마(`\sum_{i=1}^n`), 극한(`\lim_{x \to \infty}`), 편미분(`\frac{\partial f}{\partial x}`).
  - **연산자/기호**: $\pm, \times, \div, \cdot, \neq, \approx, \le, \ge, \infty, \nabla, \in, \subset$.
  - **그리스 문자**: $\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega, \Delta, \Sigma$.
  - **행렬/연립식**: 2x2 행렬, 3x3 대괄호 행렬, 연립방정식(cases).
- 실시간 KaTeX 미리보기 창이 하단에 즉시 연동되며, "인라인 수식으로 삽입($)" 또는 "블록 수식으로 삽입($$)"으로 즉시 에디터에 주입.

### 3.2 Mermaid 다이어그램 위자드
- 자주 사용하는 5가지 유형의 템플릿 프리셋 제공:
  1. **Flowchart (순서도)**: 캐시 확인 및 데이터베이스 조회 분기 흐름.
  2. **Sequence Diagram (시퀀스)**: 클라이언트-서버-GitHub API 간 REST 통신 및 커밋 흐름.
  3. **Class Diagram (클래스)**: Post 및 MathPost 상속 객체 다이어그램.
  4. **State Diagram (상태도)**: 초안작성 -> 검토 -> 배포완료 라이프사이클.
  5. **Git Graph**: feature 브랜치 커밋 및 main 병합 맵.
- 사용자가 코드를 수정하면 오른쪽 프리뷰 박스에서 실시간으로 SVG 다이어그램이 렌더링됨.

### 3.3 대화형 인터랙티브 HTML/JS 샌드박스
- 수학 함수 시각화(Canvas 그래프)나 카오스 어트랙터 시뮬레이션을 위해 iframe 격리 단축코드 제공:
  ```html
  {{< interactive id="demo" height="340px" title="..." >}}
    <canvas id="cv"></canvas>
    <script>...</script>
  {{< /interactive >}}
  ```
- 메인 블로그 스크립트와의 충돌 및 오염을 100% 방지하기 위해 `sandbox="allow-scripts"` 및 `srcdoc` 격리 렌더링 적용.

---

## 4. GitHub Actions CI/CD 최적화 가이드

- Hugo 공식 액션(`peaceiris/actions-hugo@v3`)과 GitHub 공식 `actions/deploy-pages@v4`를 활용.
- **핵심 장점**:
  - Hugo Extended 버전 사용으로 최신 정적 파이프라인 완벽 호환.
  - 모든 에셋(KaTeX, Mermaid)이 이미 레포지토리에 커밋되어 있으므로 빌드 시 외부 다운로드 병목 제로 (빌드 시간 5~10초 이내).
