"""
Generate ElevenLabs speech for every line in dialogue.json, then measure each
clip with ffprobe into audioDurations.json (frames at 30 fps).

Usage:
    python scripts/generate_audio.py               # (re)generate lines whose request changed
    python scripts/generate_audio.py --only 1,4    # just these line ids
    python scripts/generate_audio.py --force       # regenerate even if unchanged
    python scripts/generate_audio.py --dry-run     # print each request; no API calls, no files

Reads from .env (python-dotenv):
    ELEVENLABS_API_KEY        (falls back to ELEVEN_LABS_API_KEY)
    ELEVENLABS_VOICE_HUMAN    (falls back to HUMAN_VOICE_ID)
    ELEVENLABS_VOICE_AI       (falls back to AI_AGENT_VOICE_ID)
    ELEVENLABS_MODEL          (optional, default eleven_multilingual_v2)

What is spoken: line["text"], exactly as written, nothing else.
What steers the performance, without being spoken:
    voice_settings  stability / style from intensity, speed from pacing
    previous_text   the line before it in the scene, so the reply sounds like a reply
    next_text       a narrative dialogue tag built from delivery, emotion and emphasis,
                    e.g. ', Byte said, quiet and plain, no lift at the end; grave recognition.'
                    The model reads it as the words that follow, which shapes the line's
                    intonation and ending, but it is not part of the generated audio.
pauseAfter is never sent: silence between lines is timeline spacing (buildTimeline.js).

Each mp3 goes to public/<line.audio>, e.g. public/audio/degree/001.mp3, because
Remotion's staticFile() serves from public/. Lines whose audio is null are skipped.

A clip is reused only if a manifest entry shows it was made from the identical
request (model, voice, text, settings, context). Any change to the generation
logic or the line therefore regenerates it, so old and new takes never mix.
"""
import argparse
import hashlib
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
MANIFEST_NAME = "manifest.json"  # written next to the clips, records each clip's request hash

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

# Name used in the unspoken dialogue tag.
SPEAKER_NAME = {"human": "Human", "ai": "Byte"}

# Voice settings by intensity level.
STYLE = {"low": 0.20, "medium": 0.42, "high": 0.68}
STABILITY = {"low": 0.55, "medium": 0.45, "high": 0.32}
SIMILARITY_BOOST = 0.75

# Speed by pacing (eleven_multilingual_v2 accepts 0.7–1.2; outside ~0.9–1.1 quality drops).
SPEED_SLOW = 0.92
SPEED_FAST = 1.08

# Fixed seed so a regenerated line with an unchanged request comes out the same.
SEED = 1234


def env_value(key: str) -> str:
    for name in ENV_NAMES[key]:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


# ── Direction → request ──────────────────────────────────────────────────────
def head(field: str) -> str:
    """First phrase of a direction field: text before the first dash or comma, lower-cased."""
    return re.split(r"\s*[—,]\s*", field.strip(), maxsplit=1)[0].strip().lower()


def intensity_level(line: dict) -> str:
    """The first of low/medium/high named in the intensity field."""
    match = re.search(r"low|medium|high", line["intensity"], re.IGNORECASE)
    if not match:
        raise ValueError(f"line {line['id']}: intensity {line['intensity']!r} names no level")
    return match.group(0).lower()


def speed_for(line: dict) -> float:
    """Whole-word "slow"/"fast" in pacing ("slowing on the last sentence" stays normal)."""
    pacing = line["pacing"]
    if re.search(r"\bslow\b", pacing, re.IGNORECASE):
        return SPEED_SLOW
    if re.search(r"\b(fast|quick)\b", pacing, re.IGNORECASE):
        return SPEED_FAST
    return 1.0


def voice_settings(line: dict) -> dict:
    level = intensity_level(line)
    return {
        "stability": STABILITY[level],
        "similarity_boost": SIMILARITY_BOOST,
        "style": STYLE[level],
        "use_speaker_boost": True,
        "speed": speed_for(line),
    }


def direction_tag(line: dict) -> str:
    """
    Unspoken narrative tag that follows the line, e.g.
    ', Byte said, quiet and plain, no lift at the end; grave recognition, stressing "worst".'
    """
    delivery = line["delivery"].strip().rstrip(".")
    delivery = delivery[:1].lower() + delivery[1:]
    parts = [f", {SPEAKER_NAME[line['speaker']]} said, {delivery}; {head(line['emotion'])}"]
    if line.get("emphasis"):
        parts.append(f', stressing "{line["emphasis"]}"')
    return "".join(parts) + "."


def build_request(line: dict, previous: dict | None, model: str) -> dict:
    """The full JSON body for one line. `text` is the dialogue and nothing else."""
    body = {
        "text": line["text"],
        "model_id": model,
        "voice_settings": voice_settings(line),
        "next_text": direction_tag(line),
        "seed": SEED,
    }
    if previous:
        body["previous_text"] = previous["text"]
    return body


def request_hash(body: dict, voice_id: str) -> str:
    payload = json.dumps({"voice_id": voice_id, **body}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


# ── API call ─────────────────────────────────────────────────────────────────
def synthesize(api_key: str, voice_id: str, body: dict) -> bytes:
    request = urllib.request.Request(
        API_URL.format(voice_id=voice_id),
        data=json.dumps(body).encode("utf-8"),
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


def load_manifest(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="regenerate even when the request is unchanged")
    parser.add_argument("--dry-run", action="store_true", help="print each request; no API calls, no files")
    parser.add_argument("--only", help="comma-separated line ids to process, e.g. 1,4")
    args = parser.parse_args()
    only = {int(x) for x in args.only.split(",")} if args.only else None

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

    manifests: dict[Path, dict] = {}
    generated, skipped, failures = 0, 0, []
    for index, line in enumerate(lines):
        if only and line["id"] not in only:
            continue
        label = f"[{line['id']:03d}] {line['speaker']:<5}"
        if not line.get("audio"):
            print(f"  NULL  {label} audio is null, skipped")
            continue

        out_path = PUBLIC_DIR / line["audio"]
        manifest_path = out_path.parent / MANIFEST_NAME
        manifest = manifests.setdefault(manifest_path, load_manifest(manifest_path))

        body = build_request(line, lines[index - 1] if index > 0 else None, model)
        voice_env = next(n for n in ENV_NAMES[line["speaker"]] if os.environ.get(n, "").strip()) \
            if voices[line["speaker"]] else ENV_NAMES[line["speaker"]][0] + " (unset)"
        digest = request_hash(body, voices[line["speaker"]])

        if args.dry_run:
            print(f"  DRY   {label} voice from {voice_env}")
            print(json.dumps(body, indent=4, ensure_ascii=False).replace("\n", "\n        "))
            continue
        if out_path.exists() and not args.force and manifest.get(out_path.name) == digest:
            print(f"  SKIP  {label} unchanged")
            skipped += 1
            continue

        print(f"  GEN   {label} \"{body['text']}\"  (voice from {voice_env})")
        try:
            audio = synthesize(api_key, voices[line["speaker"]], body)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = out_path.with_suffix(".tmp.mp3")
            tmp_path.write_bytes(audio)
            tmp_path.replace(out_path)
            manifest[out_path.name] = digest
            manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            generated += 1
        except Exception as error:
            print(f"    ERROR: {error}")
            failures.append((line["id"], str(error)))

    if args.dry_run:
        return

    # ── Durations (always every line, so a partial --only run keeps the file complete) ──
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

    stale = []
    for line in lines:
        if not line.get("audio"):
            continue
        path = PUBLIC_DIR / line["audio"]
        if path.name not in load_manifest(path.parent / MANIFEST_NAME):
            stale.append(line["id"])
    if stale:
        print(f"Clips not made by the current logic (regenerate before final render): {stale}")

    for line_id, error in failures:
        print(f"  generate [{line_id}] {error}")
    for line_id, error in missing:
        print(f"  ffprobe  [{line_id}] {error}")
    if failures or missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
