# 📖 hugodex-k 사용자 매뉴얼 & 완벽 가이드 (User Manual)

이 문서는 `hugodex-k` 블로그를 설정하고, 웹 WYSIWYG 에디터를 통해 글을 작성·발행하며, 고급 수학 공식과 구조도 다이어그램, 인터랙티브 컴포넌트를 활용하는 모든 방법을 안내합니다.

---

## 목차
1. [초기 환경 셋업 (GitHub Pages & 댓글)](#1-초기-환경-셋업)
2. [웹 WYSIWYG 에디터 사용법](#2-웹-wysiwyg-에디터-사용법)
3. [수학 수식(LaTeX) 비주얼 작성법](#3-수학-수식latex-비주얼-작성법)
4. [구조도 다이어그램(Mermaid) 작성법](#4-구조도-다이어그램mermaid-작성법)
5. [확장 마크다운 & 인터랙티브 컴포넌트](#5-확장-마크다운--인터랙티브-컴포넌트)
6. [다국어(i18n) 포스팅 작성법](#6-다국어i18n-포스팅-작성법)
7. [로컬 개발 환경 가이드](#7-로컬-개발-환경-가이드)

---

## 1. 초기 환경 셋업

`hugodex-k`는 외부 서버나 데이터베이스 없이 단일 GitHub 레포지토리만으로 동작합니다.

### 1.1 GitHub Pages 활성화
1. GitHub 저장소의 **Settings > Pages** 메뉴로 이동합니다.
2. **Build and deployment > Source** 항목에서 **GitHub Actions**를 선택합니다.
3. 소스 코드를 `main` 브랜치에 Push하면 `.github/workflows/deploy.yml` 워크플로우가 자동으로 실행되어 수 초 내에 배포됩니다.

### 1.2 Giscus 댓글 시스템 연동 (선택 사항)
1. GitHub 저장소의 **Settings > General**에서 **Features > Discussions** 체크박스를 켭니다.
2. [giscus.app](https://giscus.app) 웹사이트에 접속합니다.
3. 본인의 저장소(`username/hugodex-k`)를 입력하고, 카테고리로 **Announcements**를 선택합니다.
4. 화면 하단에 생성된 `data-repo-id`와 `data-category-id` 값을 복사합니다.
5. 저장소의 `hugo.yaml` 파일을 열고 아래 항목을 채웁니다:
   ```yaml
   params:
     giscus:
       enabled: true
       repo: "username/hugodex-k"
       repoId: "발급받은_repo_id"
       category: "Announcements"
       categoryId: "발급받은_category_id"
   ```

---

## 2. 웹 WYSIWYG 에디터 사용법

`hugodex-k`는 별도의 데스크톱 앱이나 Git CLI 설치 없이 웹 브라우저에서 직접 글을 작성하고 배포할 수 있는 내장 스튜디오를 제공합니다.

### 2.1 에디터 접속 및 인증
1. 브라우저에서 `https://<사용자이름>.github.io/<저장소이름>/editor/` 경로로 접속합니다.
2. 우측 상단의 **[⚙️ GitHub 연동]** 버튼을 클릭합니다.
3. 다음 4가지 정보를 입력합니다:
   - **GitHub Personal Access Token (Fine-grained PAT)**:
     - GitHub 계정 **Settings > Developer settings > Personal access tokens > Fine-grained tokens**에서 발급.
     - **Repository access**: 대상 레포지토리(`hugodex-k`)만 선택.
     - **Permissions**:
       - `Contents`: **Read and write** (파일 읽기/커밋 필수)
       - `Metadata`: **Read-only** (필수)
   - **저장소 소유자**: GitHub 아이디
   - **저장소 이름**: `hugodex-k`
   - **브랜치**: `main`
4. **[설정 저장 및 연결 테스트]**를 클릭하면 좌측 사이드바에 기존 글 목록이 로드됩니다.
> 💡 *토큰은 오직 사용자의 브라우저 로컬 스토리지(`localStorage`)에만 저장되며 외부 서버로 전송되지 않습니다.*

### 2.2 새 글 작성 및 메타데이터 설정
- 상단 폼에서 메타데이터를 입력합니다:
  - **제목**: 게시글 제목
  - **폴더/경로**: 카테고리 폴더명 (예: `posts/mathematics` 또는 `posts/algorithms`)
  - **언어**: 한국어(`.ko.md`) 또는 English(`.en.md`)
  - **초안(Draft)**: 활성화 시 배포 사이트 목록에서 숨겨집니다.
  - **태그**: 쉼표로 구분 (예: `수학, 선형대수, 알고리즘`)
  - **카테고리**: 메인 카테고리명

### 2.3 이미지 업로드
- 툴바의 **[🖼 이미지]** 버튼을 클릭하거나 이미지 파일을 선택합니다.
- 이미지가 GitHub API를 통해 `static/images/posts/` 경로에 자동 커밋되며, 본문 커서 위치에 `![파일명](/images/posts/...)` 마크다운 태그가 자동으로 삽입됩니다.

### 2.4 발행 (Commit & Push)
- 작성이 완료되면 우측 상단의 **[발행 (Commit)]** 버튼을 클릭합니다.
- GitHub REST API가 동작하여 Base64로 인코딩된 마크다운을 저장소에 즉시 커밋합니다.
- 커밋 즉시 GitHub Actions가 트리거되어 약 10~15초 후 실제 블로그에 라이브 반영됩니다.

---

## 3. 수학 수식(LaTeX) 비주얼 작성법

LaTeX 문법을 외우지 않고도 클릭만으로 복잡한 수식을 완성할 수 있습니다.

### 3.1 수식 비주얼 빌더 사용법
1. 에디터 툴바에서 **[∑ 수학 수식 (LaTeX)]** 버튼을 클릭합니다.
2. 팔레트 탭을 활용합니다:
   - **구조 템플릿**: 분수($\frac{a}{b}$), 거듭제곱($x^n$), 아래첨자($x_i$), 루트($\sqrt{x}$), 적분($\int$), 시그마($\sum$), 극한($\lim$), 편미분($\frac{\partial f}{\partial x}$)
   - **연산자/기호**: $\pm, \times, \div, \cdot, \neq, \approx, \le, \ge, \infty, \nabla, \in, \subset$
   - **그리스 문자**: $\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega$ 등
   - **행렬/연립식**: 2x2 행렬, 3x3 대괄호 행렬, 연립방정식(cases)
3. 기호를 클릭하면 하단 수식 입력 필드에 조합되며, 실시간으로 KaTeX 미리보기가 렌더링됩니다.
4. **[인라인 수식으로 삽입 ($)]** 또는 **[블록 수식으로 삽입 ($$)]**을 누르면 본문에 주입됩니다.

### 3.2 수식 문법 예시
- **인라인 수식**: `$f(x) = \sin(x) + e^{-x}$`
- **블록 수식**:
  ```latex
  $$
  \oint_C \mathbf{E} \cdot d\boldsymbol{\ell} = -\frac{d\Phi_B}{dt}
  $$
  ```
- **코드블록 수식**:
  ````markdown
  ```math
  \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
  ```
  ````

---

## 4. 구조도 다이어그램(Mermaid) 작성법

### 4.1 다이어그램 위자드 사용법
1. 에디터 툴바에서 **[❖ 구조도 (Mermaid)]** 버튼을 클릭합니다.
2. 유형을 선택합니다:
   - **순서도 (Flowchart)**: 알고리즘 분기, 시스템 처리 흐름
   - **시퀀스 (Sequence)**: API 요청/응답, 객체 간 통신 순서
   - **클래스 (Class)**: 객체 지향 구조, 상속 관계
   - **상태도 (State)**: 라이프사이클 전이도
   - **Git 그래프 (GitGraph)**: 브랜치 병합 흐름
3. 프리셋 템플릿의 텍스트를 원하는 내용으로 변경하면 우측 박스에서 실시간으로 SVG 다이어그램이 렌더링됩니다.
4. **[본문에 다이어그램 삽입]** 버튼을 누르면 Hugo 렌더 훅 규격의 ` ```mermaid ` 블록으로 삽입됩니다.

---

## 5. 확장 마크다운 & 인터랙티브 컴포넌트

### 5.1 학술 콜아웃 (Callouts)
정리, 정의, 증명, 팁, 경고를 미려한 박스로 표현합니다:
```markdown
{{< callout type="theorem" title="정리: 피타고라스 정리" >}}
직각삼각형에서 빗변의 제곱은 다른 두 변의 제곱의 합과 같다: $a^2 + b^2 = c^2$
{{< /callout >}}

{{< callout type="definition" title="정의: 위상공간" >}}
집합 $X$와 부분집합족 $\mathcal{T}$가 개집합 공리를 만족할 때 $(X, \mathcal{T})$를 위상공간이라 한다.
{{< /callout >}}

{{< callout type="proof" title="증명" >}}
좌변과 우변의 내적을 전개하면 유일성이 증명된다. $\blacksquare$
{{< /callout >}}
```
- 사용 가능한 `type`: `theorem`, `definition`, `proof`, `note`, `tip`, `warning`

### 5.2 다중 언어 코드 탭 (Tabs)
```markdown
{{< tabs >}}
{{< tab name="Python" >}}
```python
print("Hello Python")
```
{{< /tab >}}
{{< tab name="Go" >}}
```go
fmt.Println("Hello Go")
```
{{< /tab >}}
{{< /tabs >}}
```

### 5.3 인라인 SVG 벡터 그래픽
```markdown
{{< svg-inline >}}
<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="60" rx="10" fill="#3b82f6" />
  <text x="100" y="35" fill="#fff" font-size="14" text-anchor="middle">SVG 다이어그램</text>
</svg>
{{< /svg-inline >}}
```

### 5.4 대화형 실시간 JS/HTML 시뮬레이터 (Interactive Sandbox)
```markdown
{{< interactive id="my-sim" height="300px" title="실시간 시뮬레이션" >}}
<canvas id="myCanvas" width="400" height="240"></canvas>
<script>
  const cv = document.getElementById('myCanvas');
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(50, 50, 100, 100);
</script>
{{< /interactive >}}
```

---

## 6. 다국어(i18n) 포스팅 작성법

동일한 글의 영문 번역본을 쉽게 연결할 수 있습니다:
1. 폴더 구조:
   ```text
   content/posts/mathematics/linear-algebra/
   ├── index.ko.md    # 한국어 원문
   └── index.en.md    # 영문 번역본
   ```
2. 웹 에디터에서 작성 시:
   - 한국어 버전 작성 시 언어 선택을 **한국어 (.ko.md)**로 두고 발행
   - 동일한 폴더 경로에서 언어 선택을 **English (.en.md)**로 변경하고 영문 내용 작성 후 발행
3. 배포된 글 상단에 자동으로 **"English version으로 읽기 →"** 또는 **"한국어 버전으로 읽기 →"** 배너와 헤더 언어 스위처가 자동 생성됩니다.

---

## 7. 로컬 개발 환경 가이드

로컬 컴퓨터에 Hugo Extended가 설치되어 있는 경우:

```bash
# 의존성 에셋 동기화 (이미 레포에 포함되어 있으므로 필요 시에만)
python tools/download_assets.py

# 로컬 개발 서버 구동 (초안 포함)
hugo server -D

# 정적 빌드 테스트
hugo --minify
```
- 브라우저 접속: `http://localhost:1313/`
- 로컬 웹 에디터: `http://localhost:1313/editor/`

