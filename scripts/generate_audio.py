"""
Generate ElevenLabs speech for every line in dialogue.json, then measure each
clip with ffprobe into audioDurations.json (frames at 30 fps).

Usage:
    python scripts/generate_audio.py             # skip lines whose mp3 already exists
    python scripts/generate_audio.py --force     # regenerate every line
    python scripts/generate_audio.py --dry-run   # print what would be sent; no API calls, no files

Reads from .env (python-dotenv):
    ELEVENLABS_API_KEY        (falls back to ELEVEN_LABS_API_KEY)
    ELEVENLABS_VOICE_HUMAN    (falls back to HUMAN_VOICE_ID)
    ELEVENLABS_VOICE_AI       (falls back to AI_AGENT_VOICE_ID)
    ELEVENLABS_MODEL          (optional, default eleven_multilingual_v2)

Each line's mp3 goes to public/<line.audio>, e.g. public/audio/degree/001.mp3,
because Remotion's staticFile() serves from public/. Lines whose audio is null
are skipped: no API call and no file.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIALOGUE = PROJECT_ROOT / "src" / "episodes" / "ep01-degree" / "dialogue.json"
DURATIONS = DIALOGUE.parent / "audioDurations.json"
PUBLIC_DIR = PROJECT_ROOT / "public"

FPS = 30

# ── ElevenLabs ───────────────────────────────────────────────────────────────
API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
DEFAULT_MODEL = "eleven_multilingual_v2"

# Each setting is [primary .env name, fallback .env name already used by this project].
ENV_NAMES = {
    "api_key": ["ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY"],
    "human": ["ELEVENLABS_VOICE_HUMAN", "HUMAN_VOICE_ID"],
    "ai": ["ELEVENLABS_VOICE_AI", "AI_AGENT_VOICE_ID"],
}

# Voice settings by intensity level.
STYLE = {"low": 0.20, "medium": 0.42, "high": 0.68}
STABILITY = {"low": 0.55, "medium": 0.45, "high": 0.32}


def env_value(key: str) -> str:
    for name in ENV_NAMES[key]:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


# ── Text preparation ─────────────────────────────────────────────────────────
def head(field: str) -> str:
    """First phrase of a direction field: text before the first dash or comma, lower-cased."""
    return re.split(r"\s*[—,]\s*", field.strip(), maxsplit=1)[0].strip().lower()


def emotion_tag(line: dict) -> str:
    """[emotion, tone] from the first phrase of each field, e.g. [ashamed, dry]."""
    parts = [head(line["emotion"]), head(line["tone"])]
    unique = [p for i, p in enumerate(parts) if p and p not in parts[:i]]
    return f"[{', '.join(unique)}]"


def capitalize_emphasis(text: str, emphasis: str) -> str:
    """Upper-cases every whole-word occurrence of the emphasis word (case-insensitive)."""
    if not emphasis:
        return text
    pattern = re.compile(rf"(?<![\w']){re.escape(emphasis)}(?![\w'])", re.IGNORECASE)
    return pattern.sub(lambda m: m.group(0).upper(), text)


def is_slow(line: dict) -> bool:
    """True when pacing has the word "slow" (so "slowing on the last sentence" does not count)."""
    return re.search(r"\bslow\b", line["pacing"], re.IGNORECASE) is not None


def prepared_text(line: dict) -> str:
    prefix = "[slowly] " if is_slow(line) else ""
    return f"{prefix}{emotion_tag(line)} {capitalize_emphasis(line['text'], line['emphasis'])}"


def intensity_level(line: dict) -> str:
    """The first of low/medium/high named in the intensity field."""
    match = re.search(r"low|medium|high", line["intensity"], re.IGNORECASE)
    if not match:
        raise ValueError(f"line {line['id']}: intensity {line['intensity']!r} names no level")
    return match.group(0).lower()


def voice_settings(line: dict) -> dict:
    level = intensity_level(line)
    return {"stability": STABILITY[level], "style": STYLE[level]}


# ── API call ─────────────────────────────────────────────────────────────────
def synthesize(api_key: str, voice_id: str, model: str, text: str, settings: dict) -> bytes:
    body = json.dumps({"text": text, "model_id": model, "voice_settings": settings}).encode("utf-8")
    request = urllib.request.Request(
        API_URL.format(voice_id=voice_id),
        data=body,
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


# ── ffprobe ──────────────────────────────────────────────────────────────────
def ffprobe_seconds(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="regenerate files that already exist")
    parser.add_argument("--dry-run", action="store_true", help="print each request; no API calls, no files")
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env")
    model = os.environ.get("ELEVENLABS_MODEL", "").strip() or DEFAULT_MODEL
    api_key = env_value("api_key")
    voices = {"human": env_value("human"), "ai": env_value("ai")}

    if not args.dry_run:
        if not api_key:
            sys.exit(f"ERROR: set {ENV_NAMES['api_key'][0]} in .env")
        for speaker, voice in voices.items():
            if not voice:
                sys.exit(f"ERROR: set {ENV_NAMES[speaker][0]} in .env")

    lines = json.loads(DIALOGUE.read_text(encoding="utf-8"))["lines"]
    print(f"{len(lines)} lines from {DIALOGUE.relative_to(PROJECT_ROOT)}, model {model}\n")

    generated, skipped, failures = 0, 0, []
    for line in lines:
        label = f"[{line['id']:03d}] {line['speaker']:<5}"
        if not line.get("audio"):
            print(f"  NULL  {label} audio is null, skipped")
            continue

        out_path = PUBLIC_DIR / line["audio"]
        text = prepared_text(line)
        settings = voice_settings(line)

        if args.dry_run:
            print(f"  DRY   {label} {settings}\n        {text}")
            continue
        if out_path.exists() and not args.force:
            print(f"  SKIP  {label} {out_path.relative_to(PROJECT_ROOT)} exists")
            skipped += 1
            continue

        print(f"  GEN   {label} {text}")
        try:
            audio = synthesize(api_key, voices[line["speaker"]], model, text, settings)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = out_path.with_suffix(".tmp.mp3")
            tmp_path.write_bytes(audio)
            tmp_path.replace(out_path)
            generated += 1
        except Exception as error:
            print(f"    ERROR: {error}")
            failures.append((line["id"], str(error)))

    if args.dry_run:
        return

    # ── Durations ────────────────────────────────────────────────────────────
    durations, missing = {}, []
    for line in lines:
        if not line.get("audio"):
            continue
        path = PUBLIC_DIR / line["audio"]
        try:
            frames = round(ffprobe_seconds(path) * FPS, 1)
            durations[str(line["id"])] = {"file": line["audio"], "frames": frames}
        except Exception as error:
            missing.append((line["id"], str(error)))

    DURATIONS.write_text(json.dumps(durations, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {len(durations)} durations to {DURATIONS.relative_to(PROJECT_ROOT)}")
    print(f"Generated {generated}, skipped {skipped}, failed {len(failures)}, unmeasured {len(missing)}")

    for line_id, error in failures:
        print(f"  generate [{line_id}] {error}")
    for line_id, error in missing:
        print(f"  ffprobe  [{line_id}] {error}")
    if failures or missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
