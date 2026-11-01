# 🚀 hugodex-k : Extended Static Knowledge Blog & Studio

> **외부 서버·유료 서비스·CDN 의존성 제로(Zero)!**  
> 단일 GitHub 레포지토리(GitHub Pages)만으로 구동되는 프로그래밍·고급 수학·구조도 특화 다국어 정적 블로그 및 브라우저 내장 WYSIWYG 웹 에디터 스튜디오.

---

## 📚 문서 바로가기
- 📖 [**상세 사용자 매뉴얼 & 완벽 가이드 (USAGE.md)**](file:///c:/Users/427ta/Desktop/hugodex-k/USAGE.md) : 초기 셋업부터 웹 에디터 발행, 수식/다이어그램/인터랙티브 컴포넌트 전체 사용법
- 🧪 [**종합 렌더링 검증 테스트 페이지**](file:///c:/Users/427ta/Desktop/hugodex-k/content/posts/testing/comprehensive-showcase/index.ko.md) : 수식, 10종 다이어그램, 샌드박스 풀 스펙트럼 쇼케이스
- 📋 [**프로젝트 마스터 계획서 (temp/PLAN.md)**](file:///c:/Users/427ta/Desktop/hugodex-k/temp/PLAN.md)
- 📊 [**진행 상황 추적 (temp/PROGRESS.md)**](file:///c:/Users/427ta/Desktop/hugodex-k/temp/PROGRESS.md)
- 💡 [**기술 노트 및 주의사항 (temp/NOTES.md)**](file:///c:/Users/427ta/Desktop/hugodex-k/temp/NOTES.md)

---

## ✨ 핵심 기능 및 특징

1. **완전한 무서버·단일 레포지토리 (Serverless & Single Repo)**
   - 별도 데이터베이스, Node.js/Python 백엔드 서버 없이 GitHub Pages와 GitHub Actions로 100% 운영.
   - 단일 GitHub 저장소 내에서 콘텐츠(Markdown), 테마 레이아웃, 웹 에디터 SPA, 로컬 에셋을 모두 관리.

2. **외부 CDN 의존성 제로 (100% Self-hosted Assets)**
   - **KaTeX (v0.16.11)** 및 **필수 WOFF2 폰트 19종**(Blackboard, Fraktur, Caligraphic, SansSerif, Math, Script 등), **Mermaid.js (v10.9.1)**를 `static/vendor/`에 완전 로컬 번들링.
   - 외부 CDN 차단이나 오프라인 환경에서도 모든 수학 공식과 다이어그램이 완벽하게 렌더링.

3. **고급 학술 & 프로그래밍 콘텐츠 특화**
   - **수학 (LaTeX / KaTeX)**: 인라인 `$..$`, 블록 `$$..$$`, 행렬, 편미분, 플랑슈렐 정리, 수식 번호 매기기 완벽 지원.
   - **구조도 (Mermaid)**: 순서도(Flowchart), 시퀀스 다이어그램(Sequence), 클래스 구조도(Class), 상태 머신(State), Git 그래프 등 10대 다이어그램 지원.
   - **인터랙티브 컴포넌트**: `{{< interactive >}}` 단축코드를 통해 마크다운 내부에 격리된 실시간 Canvas / WebGL / JS 시뮬레이션 삽입 지원.
   - **학술 콜아웃 블록**: 정리(Theorem), 정의(Definition), 증명(Proof), 참고(Note), 팁(Tip), 주의(Warning) 전용 디자인.
   - **코드 구문 강조 (Chroma)**: 정적 빌드 타임 컴파일로 초고속 렌더링, 줄 번호, 원클릭 복사 버튼.

4. **웹 기반 WYSIWYG 에디터 & 스튜디오 (`/editor/`)**
   - 별도 데스크톱 앱이나 플러그인 설치 없이 웹 브라우저에서 `/editor/`로 접속하여 글을 작성하고 즉시 배포.
   - **LaTeX 수식 비주얼 빌더**: 기호/분수/적분/행렬 클릭형 팔레트와 실시간 KaTeX 프리뷰.
   - **Mermaid 다이어그램 위자드**: 다이어그램 템플릿과 노드 관계 시각적 폼 제공.
   - **GitHub REST API 직접 연동**: 브라우저 로컬 스토리지에 보관된 PAT를 사용하여 GitHub 저장소에 직접 Commit & Push.
   - **이미지 업로드**: 이미지 파일을 드래그하면 저장소(`static/images/posts/`)에 자동 커밋 및 마크다운 경로 삽입.

5. **다국어(i18n) & SEO 최적화**
   - Hugo 네이티브 i18n 기반 한국어(`ko`) 및 영어(`en`) 완벽 페어링 지원 (`index.ko.md` / `index.en.md`).
   - 언어 스위처, `hreflang`, 다국어 Sitemap, OpenGraph, JSON-LD(`TechArticle`, `BlogPosting`) 자동 생성.

6. **무서버 댓글 시스템 (Giscus)**
   - GitHub Discussions를 기반으로 하는 Giscus를 연동하여 안전하고 스팸 없는 댓글 운영.

---

## 📂 디렉터리 구조

```text
hugodex-k/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 자동 배포 CI/CD
├── assets/
│   ├── css/
│   │   ├── main.css            # 모던 반응형 스타일 & 다크/라이트 테마
│   │   └── chroma.css          # 문법 하이라이팅 스타일
│   └── js/
│       └── blog.js             # 테마 토글, 코드 복사, 탭, 스크롤스파이
├── content/
│   └── posts/                  # 블로그 포스트 디렉터리
│       ├── testing/            # 종합 렌더링 검증 포스트 (Showcase)
│       ├── mathematics/        # 수학 카테고리 (LaTeX 샘플 글)
│       ├── architecture/       # 아키텍처 카테고리 (Mermaid 샘플 글)
│       └── interactive/        # 인터랙티브 시뮬레이션 샘플 글
├── layouts/                    # Hugo 레이아웃 및 템플릿
│   ├── _default/
│   │   ├── baseof.html         # 기본 HTML 골격
│   │   ├── list.html           # 글 목록/카테고리/태그 페이지
│   │   ├── single.html         # 개별 글 상세 페이지
│   │   └── _markup/            # 코드 블록 렌더 훅 (Mermaid, Math, Code)
│   ├── partials/               # 헤더, 푸터, 목차(TOC), Giscus 댓글, 메타태그
│   └── shortcodes/             # callout, interactive, svg, tabs 단축코드
├── static/
│   ├── editor/                 # 웹 WYSIWYG 에디터 SPA (index.html, css, js)
│   └── vendor/                 # 로컬 번들링된 KaTeX 및 Mermaid.js 엔진
├── temp/                       # 개발 계획, 진행상황, 기술 노트
│   ├── PLAN.md                 # 마스터 계획서
│   ├── PROGRESS.md             # 진행 상황 트래커
│   └── NOTES.md                # 기술 노트 및 알아둘 점
├── hugo.yaml                   # 블로그 통합 설정 파일
├── USAGE.md                    # 상세 사용자 매뉴얼
└── README.md
```

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. GitHub Pages 배포 설정
1. GitHub 저장소의 **Settings > Pages** 메뉴로 이동합니다.
2. **Build and deployment > Source** 항목에서 **GitHub Actions**를 선택합니다.
3. 코드를 `main` 브랜치에 Push하면 `.github/workflows/deploy.yml`이 실행되어 자동으로 사이트가 빌드되고 배포됩니다.

### 2. 웹 에디터 접속 및 첫 글 발행
1. 브라우저에서 `https://<username>.github.io/<repo>/editor/`로 접속합니다.
2. 우측 상단의 **[⚙️ GitHub 연동]**을 눌러 본인의 Fine-grained PAT를 등록합니다.
   - 필수 권한: `Contents: Read and write`, `Metadata: Read-only`
3. 툴바의 **[∑ 수학 수식]** 및 **[❖ 구조도]** 비주얼 도구를 활용해 글을 작성합니다.
4. **[발행 (Commit)]** 버튼을 누르면 GitHub에 즉시 커밋 및 자동 배포됩니다!

더 자세한 사용법은 [**USAGE.md**](file:///c:/Users/427ta/Desktop/hugodex-k/USAGE.md)를 참고하세요.
