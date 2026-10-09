"""
Shared helpers for the content tools (voices, sound effects, music, auditions).

Content lives in src/content/<series>/series.json and
src/content/<series>/<episode>/episode.json. Generated audio goes under public/
(where Remotion serves files from), and small JSON manifests record what exists
so the video never references a missing file.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT = PROJECT_ROOT / "src" / "content"
PUBLIC = PROJECT_ROOT / "public"
ASSETS_MANIFEST = CONTENT / "_generated" / "assets.json"
SFX_LIBRARY = CONTENT / "sfx-library.json"
API = "https://api.elevenlabs.io"


# ── .env / API ───────────────────────────────────────────────────────────────

def api_key(required=True):
    try:
        from dotenv import load_dotenv
        load_dotenv(PROJECT_ROOT / ".env")
    except ImportError:
        pass
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_LABS_API_KEY")
    if required and not key:
        sys.exit("No ElevenLabs key. Copy .env.example to .env and set ELEVENLABS_API_KEY.")
    return key


class ApiError(Exception):
    def __init__(self, status, body):
        super().__init__(f"HTTP {status}: {body[:500]}")
        self.status = status
        self.body = body


def request(method, path, body=None, accept="application/json", timeout=180):
    """Call the ElevenLabs API. Returns parsed JSON or raw bytes (for audio)."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("xi-api-key", api_key())
    req.add_header("accept", accept)
    if data is not None:
        req.add_header("content-type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read().decode("utf-8", "replace")) from None
    return json.loads(raw) if accept == "application/json" else raw


# ── Content ──────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def all_series():
    return sorted(p.parent.name for p in CONTENT.glob("*/series.json"))


def series(series_id):
    path = CONTENT / series_id / "series.json"
    if not path.exists():
        sys.exit(f"No series '{series_id}'. Available: {', '.join(all_series())}")
    return load_json(path)


def episodes(series_id):
    """Episode folder names of a series, in order."""
    return sorted(p.parent.name for p in (CONTENT / series_id).glob("*/episode.json"))


def resolve_episode_args(args):
    """'left-on-seen/ep01-haha-ok', 'left-on-seen' (all its episodes) or 'all'."""
    out = []
    for a in args or ["all"]:
        a = a.strip("/")
        if a == "all":
            out += [(s, e) for s in all_series() for e in episodes(s)]
        elif "/" in a:
            s, e = a.split("/", 1)
            if not (CONTENT / s / e / "episode.json").exists():
                sys.exit(f"No episode src/content/{s}/{e}/episode.json")
            out.append((s, e))
        else:
            series(a)
            out += [(a, e) for e in episodes(a)]
    return out


def assets_manifest():
    if ASSETS_MANIFEST.exists():
        m = load_json(ASSETS_MANIFEST)
    else:
        m = {}
    m.setdefault("sfx", [])
    m.setdefault("music", {})
    return m


# ── Audio files ──────────────────────────────────────────────────────────────

def ffprobe_seconds(path):
    """Duration via Remotion's bundled ffprobe (no system ffmpeg needed)."""
    for cmd in (["ffprobe"], ["npx", "--no-install", "remotion", "ffprobe"]):
        try:
            out = subprocess.run(
                cmd + ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
                capture_output=True, text=True, cwd=PROJECT_ROOT, timeout=60,
            )
            value = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else ""
            if out.returncode == 0 and re.match(r"^\d+(\.\d+)?$", value):
                return float(value)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return None
