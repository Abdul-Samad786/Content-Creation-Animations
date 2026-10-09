"""
Generate voice audio for every line in dialogue.json using the ElevenLabs API,
then measure each clip with ffprobe into audioDurations.json.

Usage:
    python tts/generate_elevenlabs.py           # skip lines whose file already exists
    python tts/generate_elevenlabs.py --force   # regenerate everything

Reads ELEVEN_LABS_API_KEY, HUMAN_VOICE_ID and AI_AGENT_VOICE_ID from .env.
Audio goes to public/<line.audio>; durations go to audioDurations.json next to dialogue.json.
Only text from dialogue.json is spoken. Nothing is hard-coded or retyped here.
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

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DIALOGUE     = PROJECT_ROOT / "src" / "episodes" / "ep01-degree" / "dialogue.json"
DURATIONS    = DIALOGUE.parent / "audioDurations.json"
PUBLIC_DIR   = PROJECT_ROOT / "public"
ENV_FILE     = PROJECT_ROOT / ".env"

# ── ElevenLabs ───────────────────────────────────────────────────────────────
API_URL      = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
MODEL_ID     = "eleven_multilingual_v2"   # supports stability / similarity / style / speed
SPEAKER_ENV  = {"human": "HUMAN_VOICE_ID", "ai": "AI_AGENT_VOICE_ID"}


def load_env(path: Path) -> dict:
    """Parse KEY=VALUE lines from .env into os.environ (existing vars win)."""
    if not path.exists():
        return {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return os.environ


# ── AUDIO block → voice settings ─────────────────────────────────────────────
LEVEL_SCORE = {"low": 0.2, "medium": 0.5, "high": 0.8}


def intensity_score(intensity: str) -> float:
    """'Medium rising to High' → mean of the level words it contains."""
    levels = re.findall(r"low|medium|high", intensity.lower())
    if not levels:
        return 0.5
    return sum(LEVEL_SCORE[l] for l in levels) / len(levels)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def voice_settings(line: dict) -> dict:
    """
    High intensity → lower stability, higher style (more expressive).
    Calm / steady → higher stability, lower style.
    Pacing nudges stability and speed.
    """
    intensity = intensity_score(line["intensity"])
    pacing    = line["pacing"].lower()

    stability_adj = 0.0
    speed         = 1.0
    if "slow" in pacing:
        stability_adj, speed = 0.10, 0.90
    elif "fast" in pacing:
        stability_adj, speed = -0.05, 1.10

    return {
        "stability":        round(clamp(0.75 - 0.5 * intensity + stability_adj), 2),
        "similarity_boost": 0.75,
        "style":            round(clamp(0.10 + 0.6 * intensity), 2),
        "speed":            speed,
        "use_speaker_boost": True,
    }


# ── API call ─────────────────────────────────────────────────────────────────
def synthesize(api_key: str, voice_id: str, text: str, settings: dict) -> bytes:
    body = json.dumps({
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": settings,
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL.format(voice_id=voice_id),
        data=body,
        headers={
            "xi-api-key":   api_key,
            "Content-Type": "application/json",
            "Accept":       "audio/mpeg",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e


# ── ffprobe ──────────────────────────────────────────────────────────────────
def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="Regenerate files even if they already exist")
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    api_key = env.get("ELEVEN_LABS_API_KEY", "").strip()
    voice_ids = {spk: env.get(var, "").strip() for spk, var in SPEAKER_ENV.items()}
    if not api_key:
        sys.exit("ERROR: ELEVEN_LABS_API_KEY is not set in .env")
    for spk, vid in voice_ids.items():
        if not vid:
            sys.exit(f"ERROR: {SPEAKER_ENV[spk]} is not set in .env")

    data  = json.loads(DIALOGUE.read_text(encoding="utf-8"))
    lines = data["lines"]
    total = len(lines)
    print(f"Loaded {total} lines from {DIALOGUE.relative_to(PROJECT_ROOT)}\n")

    skipped, ok, failures = 0, 0, []

    for line in lines:
        line_id = str(line["id"])
        speaker = line["speaker"]
        text    = line["text"]
        out_path = PUBLIC_DIR / line["audio"]
        preview  = text if len(text) <= 48 else text[:48] + "…"
        label    = f"[{int(line_id):03d}] {speaker:<6}  {preview}"

        if out_path.exists() and not args.force:
            print(f"  SKIP  {label}")
            skipped += 1
            continue

        print(f"  GEN   {label}")
        out_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            settings = voice_settings(line)
            audio = synthesize(api_key, voice_ids[speaker], text, settings)
            tmp_path = out_path.with_suffix(".tmp.mp3")
            tmp_path.write_bytes(audio)
            tmp_path.replace(out_path)
            ok += 1
        except Exception as exc:
            print(f"    ERROR on line {line_id}: {exc}")
            failures.append({"id": line_id, "error": str(exc)})

    # ── Durations via ffprobe ────────────────────────────────────────────────
    print("\nMeasuring durations with ffprobe…")
    durations, missing = {}, []
    for line in lines:
        line_id  = str(line["id"])
        out_path = PUBLIC_DIR / line["audio"]
        try:
            durations[line_id] = round(ffprobe_duration(out_path), 3)
        except Exception as exc:
            missing.append({"id": line_id, "error": str(exc)})

    DURATIONS.write_text(json.dumps(durations, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(durations)} durations to {DURATIONS.relative_to(PROJECT_ROOT)}")

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print(f"  Total lines : {total}")
    print(f"  Generated   : {ok}")
    print(f"  Skipped     : {skipped}")
    print(f"  Failed      : {len(failures)}")
    print(f"  No duration : {len(missing)}")
    if failures or missing:
        print("\nFailures:")
        for f in failures:
            print(f"  generate [{f['id']}] {f['error']}")
        for f in missing:
            print(f"  ffprobe  [{f['id']}] {f['error']}")
        sys.exit(1)
    print("\nAll lines generated and measured successfully.")


if __name__ == "__main__":
    main()
