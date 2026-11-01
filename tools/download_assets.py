"""
hugodex-k : Vendor Assets Downloader (Complete Edition)
Downloads KaTeX (all fonts & modules) and Mermaid.js into static/vendor/ for 100% offline self-hosting.
"""

import os
import urllib.request
import ssl

ctx = ssl.create_default_context()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static", "vendor")

KATEX_VERSION = "0.16.11"
MERMAID_VERSION = "10.9.1"

KATEX_BASE_URL = f"https://cdn.jsdelivr.net/npm/katex@{KATEX_VERSION}/dist"
MERMAID_URL = f"https://cdn.jsdelivr.net/npm/mermaid@{MERMAID_VERSION}/dist/mermaid.min.js"

FONTS = [
    "KaTeX_AMS-Regular.woff2",
    "KaTeX_Caligraphic-Regular.woff2",
    "KaTeX_Fraktur-Bold.woff2",
    "KaTeX_Fraktur-Regular.woff2",
    "KaTeX_Main-Bold.woff2",
    "KaTeX_Main-BoldItalic.woff2",
    "KaTeX_Main-Italic.woff2",
    "KaTeX_Main-Regular.woff2",
    "KaTeX_Math-BoldItalic.woff2",
    "KaTeX_Math-Italic.woff2",
    "KaTeX_SansSerif-Bold.woff2",
    "KaTeX_SansSerif-Italic.woff2",
    "KaTeX_SansSerif-Regular.woff2",
    "KaTeX_Script-Regular.woff2",
    "KaTeX_Size1-Regular.woff2",
    "KaTeX_Size2-Regular.woff2",
    "KaTeX_Size3-Regular.woff2",
    "KaTeX_Size4-Regular.woff2",
    "KaTeX_Typewriter-Regular.woff2",
]

FILES_TO_DOWNLOAD = [
    (f"{KATEX_BASE_URL}/katex.min.css", os.path.join(STATIC_DIR, "katex", "katex.min.css")),
    (f"{KATEX_BASE_URL}/katex.min.js", os.path.join(STATIC_DIR, "katex", "katex.min.js")),
    (f"{KATEX_BASE_URL}/contrib/auto-render.min.js", os.path.join(STATIC_DIR, "katex", "contrib", "auto-render.min.js")),
    (MERMAID_URL, os.path.join(STATIC_DIR, "mermaid", "mermaid.min.js")),
]

for font in FONTS:
    FILES_TO_DOWNLOAD.append((
        f"{KATEX_BASE_URL}/fonts/{font}",
        os.path.join(STATIC_DIR, "katex", "fonts", font)
    ))

def download_file(url, target_path):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        return
    print(f"다운로드 중: {font_name(url)}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response, open(target_path, 'wb') as out_file:
        out_file.write(response.read())

def font_name(url):
    return url.split('/')[-1]

if __name__ == "__main__":
    print(f"==> 추가 KaTeX 폰트 전체 동기화 시작")
    for url, path in FILES_TO_DOWNLOAD:
        download_file(url, path)
    print("==> 모든 KaTeX 폰트 19종 및 스크립트 완벽 준비 완료!")
