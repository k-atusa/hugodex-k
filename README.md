# hugodex-k

> 프로그래밍·수학·다이어그램 특화 정적 블로그 & 로컬 웹 에디터

외부 서버·CDN 의존성 제로. Hugo + GitHub Pages로 운영하고, 로컬에서 `python dev.py` 하나로 편집합니다.

## 빠른 시작

```bash
git clone https://github.com/k-atusa/hugodex-k.git
cd hugodex-k
python dev.py
# → 브라우저에서 http://localhost:3000/editor/ 자동 오픈
```

## 주요 기능

| 기능 | 설명 |
|------|------|
| **수학 수식** | KaTeX 로컬 번들, `$...$` 인라인 / `$$...$$` 블록 |
| **다이어그램** | Mermaid.js 로컬 번들, 10종 다이어그램 |
| **코드 하이라이팅** | Hugo Chroma 정적 빌드, 줄번호 · 복사 |
| **웹 에디터** | LaTeX 팔레트 · Mermaid 위자드 · 실시간 프리뷰 |
| **다국어** | 한국어(기본) + 영어, 언어 스위처 |
| **다크/라이트** | 시스템 연동 테마 토글 |

## 디렉터리 구조

```
hugodex-k/
├── content/posts/{slug}/    # 포스트 (index.md + index.en.md)
├── layouts/                 # Hugo 템플릿
├── static/
│   ├── css/                 # 블로그 스타일
│   ├── js/                  # 클라이언트 스크립트
│   ├── editor/              # 웹 에디터 SPA
│   └── vendor/              # KaTeX · Mermaid 로컬 번들
├── i18n/                    # 다국어 번역
├── hugo.yaml                # 사이트 설정
├── dev.py                   # 로컬 개발 서버
└── .github/workflows/       # GitHub Actions 배포
```

## 글 작성

### 에디터로 작성
`python dev.py` → `http://localhost:3000/editor/` → 새 글 → 편집 → 저장

### 수동 작성
```bash
mkdir content/posts/my-post
```

`content/posts/my-post/index.md`:
```markdown
---
title: "글 제목"
date: 2026-01-01T00:00:00+09:00
draft: false
tags: ["태그"]
categories: ["카테고리"]
math: true
mermaid: false
---

내용 작성...
```

영문본은 같은 폴더에 `index.en.md`로 추가합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드·배포합니다.

```bash
git add -A
git commit -m "새 글 추가"
git push origin main
```

**사전 설정**: GitHub 저장소 → Settings → Pages → Source → **GitHub Actions** 선택

## 라이선스

MIT License
