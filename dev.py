#!/usr/bin/env python3
"""
hugodex-k Local Development Server & REST API
Pure Python standard library implementation.
Zero external dependencies.
"""

import sys
import os
import re
import json
import shutil
import time
import mimetypes
import threading
import webbrowser
from pathlib import Path
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import urllib.parse

# -----------------------------------------------------------------------------
# Configuration & Constants
# -----------------------------------------------------------------------------
DEFAULT_PORT = 3000
HOST = "127.0.0.1"

ROOT_DIR = Path(__file__).resolve().parent
STATIC_DIR = ROOT_DIR / "static"
POSTS_DIR = ROOT_DIR / "content" / "posts"

mimetypes.init()
CUSTOM_MIMETYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}

# -----------------------------------------------------------------------------
# Front Matter Parser & Serializer
# -----------------------------------------------------------------------------
def parse_scalar(val_str: str):
    """Parse YAML scalar values (booleans, numbers, quoted strings, arrays)."""
    s = val_str.strip()
    if s.lower() == "true":
        return True
    if s.lower() == "false":
        return False
    if s.lower() in ("null", "~", "none"):
        return None

    # Quoted string
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        try:
            return json.loads(s)
        except Exception:
            return s[1:-1]

    # Inline array [a, b, c]
    if s.startswith("[") and s.endswith("]"):
        try:
            return json.loads(s)
        except Exception:
            inner = s[1:-1].strip()
            if not inner:
                return []
            items = []
            curr = []
            in_quote = False
            q_char = ""
            for ch in inner:
                if ch in ('"', "'"):
                    if not in_quote:
                        in_quote = True
                        q_char = ch
                    elif ch == q_char:
                        in_quote = False
                    curr.append(ch)
                elif ch == "," and not in_quote:
                    items.append("".join(curr).strip())
                    curr = []
                else:
                    curr.append(ch)
            if curr:
                items.append("".join(curr).strip())
            return [parse_scalar(item) for item in items if item]

    # Integers
    if re.match(r"^-?\d+$", s):
        try:
            return int(s)
        except ValueError:
            pass

    # Floats
    if re.match(r"^-?\d+\.\d+$", s):
        try:
            return float(s)
        except ValueError:
            pass

    return s


def parse_yaml_frontmatter(fm_text: str) -> dict:
    """Parse YAML front matter dictionary from text."""
    data = {}
    lines = fm_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            if not val:
                # Check for multi-line list (- item)
                items = []
                while i < len(lines) and (lines[i].strip().startswith("- ") or not lines[i].strip()):
                    subline = lines[i].strip()
                    i += 1
                    if subline.startswith("- "):
                        items.append(parse_scalar(subline[2:].strip()))
                data[key] = items
            else:
                data[key] = parse_scalar(val)
    return data


def parse_post_file(content_str: str):
    """Split and parse --- delimited YAML front matter from markdown body."""
    content_str = content_str.lstrip("\ufeff")
    lines = content_str.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return {}, content_str

    fm_lines = []
    end_idx = -1
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
        fm_lines.append(lines[idx])

    if end_idx == -1:
        return {}, content_str

    fm = parse_yaml_frontmatter("".join(fm_lines))
    body = "".join(lines[end_idx + 1:])
    return fm, body


def serialize_yaml(data: dict) -> str:
    """Serialize dictionary to YAML front matter string."""
    lines = ["---"]
    preferred_order = [
        "title",
        "date",
        "draft",
        "category",
        "categories",
        "tags",
        "math",
        "mermaid",
        "description",
    ]
    keys = [k for k in preferred_order if k in data] + [
        k for k in data if k not in preferred_order
    ]

    for key in keys:
        val = data[key]
        if isinstance(val, bool):
            lines.append(f"{key}: {'true' if val else 'false'}")
        elif isinstance(val, (int, float)):
            lines.append(f"{key}: {val}")
        elif isinstance(val, list):
            items = []
            for item in val:
                if isinstance(item, str):
                    items.append(json.dumps(item, ensure_ascii=False))
                elif isinstance(item, bool):
                    items.append("true" if item else "false")
                else:
                    items.append(str(item))
            lines.append(f"{key}: [{', '.join(items)}]")
        elif isinstance(val, str):
            if key in ("title", "description", "category"):
                lines.append(f"{key}: {json.dumps(val, ensure_ascii=False)}")
            elif re.match(r"^\d{4}-\d{2}-\d{2}T", val):
                lines.append(f"{key}: {val}")
            elif (
                any(c in val for c in (":", '"', "#", "{", "}", "[", "]"))
                or val.strip() != val
                or val.lower() in ("true", "false", "null")
            ):
                lines.append(f"{key}: {json.dumps(val, ensure_ascii=False)}")
            else:
                lines.append(f"{key}: {val}")
        elif val is None:
            lines.append(f"{key}: null")
        else:
            lines.append(f"{key}: {json.dumps(val, ensure_ascii=False)}")

    lines.append("---")
    return "\n".join(lines)


# -----------------------------------------------------------------------------
# Post Management Helpers
# -----------------------------------------------------------------------------
def find_post_dir(slug: str) -> Path | None:
    """Find post directory by slug under content/posts/."""
    if not POSTS_DIR.exists():
        return None
    direct = POSTS_DIR / slug
    if direct.is_dir():
        return direct
    for p in POSTS_DIR.rglob(slug):
        if p.is_dir() and p != POSTS_DIR:
            return p
    return None


def get_post_files_list(post_dir: Path) -> list[str]:
    """Return list of co-located non-markdown asset files in post folder."""
    files = []
    try:
        for item in sorted(post_dir.iterdir()):
            if item.is_file() and not item.name.endswith(".md") and not item.name.startswith("."):
                files.append(item.name)
    except Exception:
        pass
    return files


def scan_all_posts() -> list[dict]:
    """Scan content/posts/, parse front matter, and return list sorted by date desc."""
    posts = []
    seen_slugs = set()
    if not POSTS_DIR.exists():
        return posts

    for root, _, files in os.walk(POSTS_DIR):
        root_path = Path(root)
        if root_path == POSTS_DIR:
            continue

        target_file = None
        lang = "ko"
        if (root_path / "index.md").exists():
            target_file = root_path / "index.md"
            lang = "ko"
        elif (root_path / "index.ko.md").exists():
            target_file = root_path / "index.ko.md"
            lang = "ko"
        elif (root_path / "index.en.md").exists():
            target_file = root_path / "index.en.md"
            lang = "en"

        if target_file:
            slug = root_path.name
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            try:
                content_str = target_file.read_text(encoding="utf-8", errors="replace")
                fm, _ = parse_post_file(content_str)
            except Exception:
                fm = {}

            title = fm.get("title") or slug
            date_val = fm.get("date")
            date_str = str(date_val) if date_val is not None else ""
            draft = bool(fm.get("draft", False))

            # Single category handling (ensuring folder-like categorization without space splitting)
            cat_val = fm.get("category")
            if not cat_val:
                cats = fm.get("categories")
                if isinstance(cats, list) and cats:
                    cat_val = cats[0]
                elif isinstance(cats, str):
                    cat_val = cats
            category = str(cat_val).strip() if cat_val else ""

            tags = fm.get("tags")
            if not isinstance(tags, list):
                tags = [tags] if tags else []

            # Check available languages for this post
            langs = []
            if (root_path / "index.md").exists() or (root_path / "index.ko.md").exists():
                langs.append("ko")
            if (root_path / "index.en.md").exists():
                langs.append("en")

            # Check for first image thumbnail
            thumbnail = None
            try:
                for item in sorted(root_path.iterdir()):
                    if item.is_file() and item.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                        thumbnail = f"/posts/{slug}/{item.name}"
                        break
            except Exception:
                pass

            posts.append({
                "slug": slug,
                "title": title,
                "date": date_str,
                "draft": draft,
                "visibility": "hidden" if draft else "public",
                "lang": lang,
                "langs": langs,
                "category": category,
                "tags": tags,
                "thumbnail": thumbnail,
            })

    posts.sort(key=lambda p: str(p.get("date", "")), reverse=True)
    return posts


# -----------------------------------------------------------------------------
# Multipart/Form-Data Parser
# -----------------------------------------------------------------------------
def parse_multipart(body: bytes, content_type: str) -> list[dict]:
    """Parse multipart/form-data payload into list of uploaded files."""
    match = re.search(r"boundary=([^;]+)", content_type)
    if not match:
        return []
    boundary = match.group(1).strip("\"'").encode("latin1")

    parts = body.split(b"--" + boundary)
    files = []
    for part in parts:
        if not part or part.startswith(b"--"):
            continue
        if part.startswith(b"\r\n"):
            part = part[2:]
        if part.endswith(b"\r\n"):
            part = part[:-2]
        if not part:
            continue

        if b"\r\n\r\n" in part:
            header_bytes, file_bytes = part.split(b"\r\n\r\n", 1)
        elif b"\n\n" in part:
            header_bytes, file_bytes = part.split(b"\n\n", 1)
        else:
            continue

        headers_str = header_bytes.decode("latin1", errors="replace")
        fn_match = (
            re.search(r'filename="([^"]+)"', headers_str)
            or re.search(r"filename='([^']+)'", headers_str)
            or re.search(r"filename=([^\s;]+)", headers_str)
        )
        if fn_match:
            raw_filename = fn_match.group(1)
            filename = os.path.basename(raw_filename)
            files.append({"filename": filename, "data": file_bytes})
    return files


# -----------------------------------------------------------------------------
# HTTP Request Handler
# -----------------------------------------------------------------------------
class DevServerHandler(BaseHTTPRequestHandler):
    server_version = "hugodex-k/2.0"

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} - {args[1]}")

    def add_cors_headers(self):
        """Add permissive CORS headers to all responses."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        )
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With, X-Filename, *",
        )

    def send_json(self, data, status=200):
        """Send JSON response with CORS headers."""
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.add_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, file_path: Path):
        """Serve a static file with appropriate Content-Type and CORS headers."""
        try:
            resolved = file_path.resolve()
            if ROOT_DIR.resolve() not in resolved.parents and resolved != ROOT_DIR.resolve():
                self.send_json({"error": "Forbidden"}, 403)
                return

            if not resolved.is_file():
                self.send_json({"error": "File Not Found"}, 404)
                return

            ext = resolved.suffix.lower()
            content_type = (
                CUSTOM_MIMETYPES.get(ext)
                or mimetypes.guess_type(str(resolved))[0]
                or "application/octet-stream"
            )

            file_bytes = resolved.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(file_bytes)))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.add_cors_headers()
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(file_bytes)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(204)
        self.add_cors_headers()
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    # -------------------------------------------------------------------------
    # GET Handlers
    # -------------------------------------------------------------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        # 1. API: GET /api/posts
        if path == "/api/posts":
            posts = scan_all_posts()
            self.send_json(posts, 200)
            return

        # 2. API: GET /api/posts/{slug}
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/") :].strip("/")
            slug = urllib.parse.unquote(slug)
            if not slug:
                self.send_json({"error": "Missing slug"}, 400)
                return

            post_dir = find_post_dir(slug)
            if not post_dir or not post_dir.is_dir():
                self.send_json({"error": f"Post '{slug}' not found"}, 404)
                return

            lang = qs.get("lang", ["ko"])[0].lower()
            if lang == "en":
                target_file = post_dir / "index.en.md"
                if not target_file.exists():
                    self.send_json(
                        {"error": f"English version not found for post '{slug}'"}, 404
                    )
                    return
            else:
                target_file = post_dir / "index.md"
                if not target_file.exists():
                    if (post_dir / "index.ko.md").exists():
                        target_file = post_dir / "index.ko.md"
                    else:
                        self.send_json(
                            {"error": f"Korean version not found for post '{slug}'"}, 404
                        )
                        return

            try:
                content_str = target_file.read_text(encoding="utf-8", errors="replace")
                fm, body = parse_post_file(content_str)
                files = get_post_files_list(post_dir)

                # Thumbnail detection
                thumbnail = None
                for f in sorted(post_dir.iterdir()):
                    if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                        thumbnail = f"/posts/{slug}/{f.name}"
                        break

                self.send_json(
                    {
                        "frontmatter": fm,
                        "content": body,
                        "files": files,
                        "thumbnail": thumbnail,
                    },
                    200,
                )
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        # 3. Static: GET /editor and GET /editor/*
        if path in ("/editor", "/editor/"):
            self.serve_file(STATIC_DIR / "editor" / "index.html")
            return

        if path.startswith("/editor/"):
            rel = path[len("/editor/") :].lstrip("/")
            self.serve_file(STATIC_DIR / "editor" / rel)
            return

        # 4. Static: GET /vendor/*, /css/*, /js/*
        if path.startswith("/vendor/"):
            rel = path[len("/vendor/") :].lstrip("/")
            self.serve_file(STATIC_DIR / "vendor" / rel)
            return

        if path.startswith("/css/"):
            rel = path[len("/css/") :].lstrip("/")
            self.serve_file(STATIC_DIR / "css" / rel)
            return

        if path.startswith("/js/"):
            rel = path[len("/js/") :].lstrip("/")
            self.serve_file(STATIC_DIR / "js" / rel)
            return

        # 5. Co-located image serving support: /posts/{slug}/{file} or /content/posts/{slug}/{file}
        if path.startswith("/posts/") or path.startswith("/content/posts/"):
            subpath = path[len("/posts/") :] if path.startswith("/posts/") else path[len("/content/posts/") :]
            subpath = urllib.parse.unquote(subpath.lstrip("/"))
            parts = subpath.split("/", 1)
            if len(parts) == 2:
                p_slug, f_name = parts[0], parts[1]
                p_dir = find_post_dir(p_slug)
                if p_dir and (p_dir / f_name).is_file():
                    self.serve_file(p_dir / f_name)
                    return

        # 6. Fallback static: GET /*
        rel = path.lstrip("/")
        if not rel:
            # Root path '/' redirects to editor
            self.send_response(302)
            self.send_header("Location", "/editor/")
            self.add_cors_headers()
            self.end_headers()
            return

        target_file = STATIC_DIR / rel
        if target_file.is_file():
            self.serve_file(target_file)
        elif (target_file / "index.html").is_file():
            self.serve_file(target_file / "index.html")
        else:
            self.send_json({"error": "Not Found"}, 404)

    # -------------------------------------------------------------------------
    # POST Handlers
    # -------------------------------------------------------------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API: POST /api/posts - create new post folder + index.md
        if path == "/api/posts":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self.send_json({"error": "Empty request body"}, 400)
                return

            try:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_body)
            except Exception as e:
                self.send_json({"error": f"Invalid JSON body: {e}"}, 400)
                return

            slug = body.get("slug", "").strip()
            fm = body.get("frontmatter", {})
            content = body.get("content", "")
            lang = str(body.get("lang", "ko")).lower()

            if not slug:
                title = fm.get("title", "new-post")
                slug = re.sub(r"[^a-zA-Z0-9가-힣\-_]", "-", str(title)).strip("-").lower() or "new-post"
            else:
                slug = os.path.basename(slug.replace("/", "-").replace("\\", "-"))

            post_dir = POSTS_DIR / slug
            if post_dir.exists():
                self.send_json({"error": f"Post '{slug}' already exists"}, 409)
                return

            try:
                post_dir.mkdir(parents=True, exist_ok=True)

                if "title" not in fm:
                    fm["title"] = slug
                if "date" not in fm:
                    now = datetime.now().astimezone()
                    fm["date"] = now.isoformat(timespec="seconds")
                if "draft" not in fm:
                    fm["draft"] = False

                # Ensure single category
                category = fm.get("category", "").strip()
                if not category and fm.get("categories"):
                    cats = fm.get("categories")
                    category = cats[0] if isinstance(cats, list) and cats else str(cats)
                fm["category"] = category
                fm["categories"] = [category] if category else []

                if "tags" not in fm:
                    fm["tags"] = []

                serialized = serialize_yaml(fm) + "\n\n" + content.lstrip("\r\n")
                target_file = post_dir / ("index.en.md" if lang == "en" else "index.md")
                target_file.write_text(serialized, encoding="utf-8")

                self.send_json(
                    {
                        "success": True,
                        "slug": slug,
                        "path": f"content/posts/{slug}/{target_file.name}",
                    },
                    201,
                )
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        # 2. API: POST /api/upload/{slug} - save uploaded file to post folder
        if path.startswith("/api/upload/"):
            slug = path[len("/api/upload/") :].strip("/")
            slug = urllib.parse.unquote(slug)
            if not slug:
                self.send_json({"error": "Missing slug"}, 400)
                return

            post_dir = find_post_dir(slug)
            if not post_dir:
                post_dir = POSTS_DIR / os.path.basename(slug)
                post_dir.mkdir(parents=True, exist_ok=True)

            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self.send_json({"error": "Empty upload payload"}, 400)
                return

            content_type = self.headers.get("Content-Type", "")
            body_bytes = self.rfile.read(content_length)

            files = []
            if "multipart/form-data" in content_type:
                files = parse_multipart(body_bytes, content_type)
            else:
                custom_fn = self.headers.get("X-Filename")
                if custom_fn:
                    files = [{"filename": os.path.basename(custom_fn), "data": body_bytes}]

            if not files:
                self.send_json(
                    {"error": "No valid file found in upload request"}, 400
                )
                return

            saved_files = []
            try:
                for item in files:
                    filename = item.get("filename") or f"upload_{int(time.time())}.png"
                    filename = os.path.basename(filename)
                    dest = post_dir / filename
                    dest.write_bytes(item["data"])
                    saved_files.append(filename)

                self.send_json(
                    {
                        "success": True,
                        "slug": slug,
                        "files": saved_files,
                        "filename": saved_files[0] if saved_files else None,
                    },
                    200,
                )
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        self.send_json({"error": "Not Found"}, 404)

    # -------------------------------------------------------------------------
    # PUT Handlers
    # -------------------------------------------------------------------------
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API: PUT /api/posts/{slug} - write post, body: {frontmatter, content, lang}
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/") :].strip("/")
            slug = urllib.parse.unquote(slug)
            if not slug:
                self.send_json({"error": "Missing slug"}, 400)
                return

            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self.send_json({"error": "Empty request body"}, 400)
                return

            try:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_body)
            except Exception as e:
                self.send_json({"error": f"Invalid JSON body: {e}"}, 400)
                return

            fm = body.get("frontmatter", {})
            content = body.get("content", "")
            lang = str(body.get("lang", "ko")).lower()

            post_dir = find_post_dir(slug)
            if not post_dir:
                post_dir = POSTS_DIR / os.path.basename(slug)
                post_dir.mkdir(parents=True, exist_ok=True)

            try:
                # Ensure single category and both category/categories keys
                category = fm.get("category", "").strip()
                if not category and fm.get("categories"):
                    cats = fm.get("categories")
                    category = cats[0] if isinstance(cats, list) and cats else str(cats)
                category = category.strip()
                fm["category"] = category
                fm["categories"] = [category] if category else []

                if lang == "en":
                    target_file = post_dir / "index.en.md"
                else:
                    target_file = post_dir / "index.md"
                    legacy_ko = post_dir / "index.ko.md"
                    if legacy_ko.exists() and legacy_ko != target_file:
                        try:
                            legacy_ko.unlink()
                        except Exception:
                            pass

                serialized = serialize_yaml(fm) + "\n\n" + content.lstrip("\r\n")
                target_file.write_text(serialized, encoding="utf-8")

                self.send_json(
                    {
                        "success": True,
                        "slug": slug,
                        "lang": lang,
                        "file": target_file.name,
                    },
                    200,
                )
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        self.send_json({"error": "Not Found"}, 404)

    # -------------------------------------------------------------------------
    # DELETE Handlers
    # -------------------------------------------------------------------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API: DELETE /api/posts/{slug} - removes folder
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/") :].strip("/")
            slug = urllib.parse.unquote(slug)
            if not slug:
                self.send_json({"error": "Missing slug"}, 400)
                return

            post_dir = find_post_dir(slug)
            if not post_dir or not post_dir.is_dir():
                self.send_json({"error": f"Post '{slug}' not found"}, 404)
                return

            resolved_posts = POSTS_DIR.resolve()
            resolved_target = post_dir.resolve()
            if resolved_target == resolved_posts or resolved_posts not in resolved_target.parents:
                self.send_json({"error": "Invalid post directory path"}, 403)
                return

            try:
                shutil.rmtree(resolved_target)
                self.send_json(
                    {"success": True, "slug": slug, "message": "Post folder removed"},
                    200,
                )
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        self.send_json({"error": "Not Found"}, 404)


# -----------------------------------------------------------------------------
# Startup Banner & Browser Launch
# -----------------------------------------------------------------------------
def print_banner(host: str, port: int):
    editor_url = f"http://localhost:{port}/editor/"
    api_url = f"http://localhost:{port}/api/posts"
    print("=" * 64)
    print("   hugodex-k Local Development Server")
    print("=" * 64)
    print(f"  * Web Editor : {editor_url}")
    print(f"  * REST API   : {api_url}")
    print(f"  * Posts Path : {POSTS_DIR}")
    print("=" * 64)
    print("  Ready! Press Ctrl+C to terminate.")
    print("=" * 64)


def open_browser_delayed(url: str, delay: float = 0.5):
    """Open browser in background after short delay."""
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception:
        pass


def run_server(port: int = DEFAULT_PORT):
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    ThreadingHTTPServer.allow_reuse_address = True
    server_address = ("", port)

    try:
        httpd = ThreadingHTTPServer(server_address, DevServerHandler)
    except OSError as e:
        print(f"[Error] Failed to bind to port {port}: {e}")
        sys.exit(1)

    print_banner(HOST, port)

    browser_thread = threading.Thread(
        target=open_browser_delayed,
        args=(f"http://localhost:{port}/editor/", 0.5),
        daemon=True,
    )
    browser_thread.start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down gracefully...")
    finally:
        httpd.server_close()
        print("[Server] Server closed.")


if __name__ == "__main__":
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
