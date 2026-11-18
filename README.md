# hugodex-k

> 프로그래밍·수학·다이어그램 특화 정적 블로그 & 로컬 웹 에디터

외부 서버·CDN 의존성 제로. Hugo + GitHub Pages로 운영하고, 로컬에서 `python dev.py` 하나로 관리·편집합니다.

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
| **수학 수식 (KaTeX)** | 로컬 번들, `$...$` 인라인 / `$$...$$` 블록, 모바일 가로 넘침 방지 터치 스크롤 |
| **다이어그램 (Mermaid)** | 로컬 번들, 순서도·시퀀스·상태도 등 텍스트 기반 다이어그램 자동 렌더링 |
| **글 목록 3종 뷰** | 썸네일 없는 리스트형 / 대형 카드 블록 / 소형 카드 블록 (상태 영구 보존) |
| **고속 썸네일 파이프라인** | 포스트 폴더의 첫 이미지를 감지하여 `256x256 WebP` 저용량 썸네일 자동 생성 |
| **단일 카테고리 체계** | 폴더 기반 배타적 1개 카테고리 지정 (공백 분리 버그 원천 차단) |
| **가시성 제어** | 복잡한 초안 개념 없이 `공개` / `비공개` 원클릭 제어 |
| **미니멀 웹 에디터** | 노션/GitHub 스타일 미니멀 2열 분할 에디터, 실시간 수식·다이어그램 프리뷰 |
| **다국어 (i18n)** | 한국어(기본) + 영어 완벽 분리 및 언어 스위처 연동 |
| **다크/라이트 테마** | 시스템 연동 테마 토글 및 수식/다이어그램 테마 동기화 |

## 디렉터리 구조

```
hugodex-k/
├── content/posts/{slug}/    # 포스트 번들 (index.md + index.en.md + 이미지)
├── layouts/                 # Hugo 템플릿
├── static/
│   ├── css/                 # 블로그 스타일 (반응형 & 수식 스크롤)
│   ├── js/                  # 클라이언트 스크립트 (3종 뷰, 테마, 무한스크롤)
│   ├── editor/              # 미니멀 웹 에디터 SPA
│   └── vendor/              # KaTeX · Mermaid 로컬 번들
├── i18n/                    # 다국어 번역 (ko.yaml, en.yaml)
├── hugo.yaml                # 사이트 설정
├── dev.py                   # 로컬 개발 서버 및 REST API
└── .github/workflows/       # GitHub Actions 자동 배포
```

## 글 작성

### 에디터로 작성
`python dev.py` 실행 → `http://localhost:3000/editor/` 접속 → `＋ 새 글` 버튼 클릭

### 수동 작성
```bash
mkdir content/posts/my-post
```

`content/posts/my-post/index.md`:
```markdown
---
title: "글 제목"
date: 2026-11-18T10:00:00+09:00
draft: false               # 공개: false, 비공개: true
category: "분산 시스템"     # 단일 카테고리
tags: ["알고리즘", "네트워크"]
math: true
mermaid: true
---

포스트 본문 내용 작성...
```

포스트 폴더에 이미지(예: `image.jpg`)를 넣으면 본문에서는 고화질로, 글 목록에서는 `256x256` 최적화 썸네일로 자동 로드됩니다. 영문본은 같은 폴더에 `index.en.md`로 추가합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 및 배포합니다.

```bash
git add -A
git commit -m "새 글 추가"
git push origin main
```

**사전 설정**: GitHub 저장소 → Settings → Pages → Source → **GitHub Actions** 선택

## 라이선스

MIT License
