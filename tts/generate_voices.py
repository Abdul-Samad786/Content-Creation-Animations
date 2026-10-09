"""
Generate voice audio for every line in dialogue.json using Chatterbox TTS.

Usage:
    python tts/generate_voices.py           # skip lines whose file already exists
    python tts/generate_voices.py --force   # regenerate everything

Audio files are written to public/<line.audio> (e.g. public/audio/ep01/001.mp3).
The script reads the ep01 dialogue; every spoken word comes from that JSON,
nothing is hard-coded here.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DIALOGUE     = PROJECT_ROOT / "src" / "episodes" / "ep01-degree" / "dialogue.json"
PUBLIC_DIR   = PROJECT_ROOT / "public"

# ── Tone → delivery preset ────────────────────────────────────────────────────
# exaggeration: 0.0 (flat/robotic) → 1.0 (very expressive)
# cfg_weight:   low = faster/looser, high = slower/more deliberate

def tone_to_preset(tone: str) -> dict:
    t = tone.lower()

    # flat / tired / hollow / exhausted / matter-of-fact
    if any(k in t for k in ("tired", "flat", "hollow", "exhausted",
                             "matter-of-fact", "counting", "stated a fact")):
        return {"exaggeration": 0.20, "cfg_weight": 0.70}

    # sharp / frustrated / bitter / defensive / quick / breaking / raw
    if any(k in t for k in ("sharp", "quick", "bitter", "defensive",
                             "breaking", "raw", "breaking open",
                             "frustrated", "sarcastic")):
        return {"exaggeration": 0.60, "cfg_weight": 0.35}

    # soft / hopeful / gentle / warm / acknowledging / wry / amused / respect
    if any(k in t for k in ("soft", "hopeful", "gentle", "warm",
                             "acknowledging", "wry", "amused", "respect",
                             "loosening", "recognition")):
        return {"exaggeration": 0.30, "cfg_weight": 0.45}

    # default: calm / neutral / factual / observational / clinical / honest
    return {"exaggeration": 0.25, "cfg_weight": 0.50}


# ── Speaker → base voice params (applied on top of tone preset) ───────────────
# These nudge the two characters apart even when tone presets overlap.
SPEAKER_BIAS = {
    "human": {"exaggeration_delta": +0.05, "cfg_weight_delta": +0.0},
    "ai":    {"exaggeration_delta": -0.05, "cfg_weight_delta": +0.05},
}


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def delivery_params(speaker: str, tone: str) -> dict:
    preset = tone_to_preset(tone)
    bias   = SPEAKER_BIAS.get(speaker, {"exaggeration_delta": 0, "cfg_weight_delta": 0})
    return {
        "exaggeration": clamp(preset["exaggeration"] + bias["exaggeration_delta"], 0.05, 0.95),
        "cfg_weight":   clamp(preset["cfg_weight"]   + bias["cfg_weight_delta"],   0.10, 0.95),
    }


def load_voice_prompt(speaker: str) -> "str | None":
    """Return path to a voice reference WAV if provided in env, else None."""
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
    key = f"TTS_{speaker.upper()}_VOICE"
    val = os.environ.get(key, "").strip()
    if val:
        p = Path(val)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        if p.exists():
            return str(p)
        print(f"  [WARN] {key}={val} set but file not found — using default voice")
    return None


def wav_to_mp3(wav_path: str, mp3_path: str) -> None:
    """Convert WAV to MP3 via ffmpeg (must be on PATH)."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-q:a", "2", mp3_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="Regenerate files even if they already exist")
    args = parser.parse_args()

    # ── Load model ────────────────────────────────────────────────────────────
    print("Loading Chatterbox TTS model…")
    try:
        import torch
        import torchaudio
        from chatterbox.tts import ChatterboxTTS
    except ImportError as e:
        print(f"ERROR: {e}\nRun: pip install -r tts/requirements.txt")
        sys.exit(1)

    device = os.environ.get("TTS_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    model = ChatterboxTTS.from_pretrained(device=device)

    # ── Load dialogue ─────────────────────────────────────────────────────────
    dialogue = json.loads(DIALOGUE.read_text())
    total    = len(dialogue)
    print(f"Loaded {total} lines from {DIALOGUE.relative_to(PROJECT_ROOT)}\n")

    # Cache voice prompts per speaker so we don't re-read them each iteration
    voice_cache: dict[str, "str | None"] = {}

    skipped  = 0
    ok       = 0
    failures = []

    for line in dialogue:
        line_id  = str(line["id"]).zfill(3)
        speaker  = line["speaker"]
        text     = line["text"]
        tone     = line.get("tone", "")
        audio    = line["audio"]          # e.g. "audio/ep01/001.mp3"

        out_path = PUBLIC_DIR / audio     # public/audio/ep01/001.mp3
        preview  = text[:48] + "…" if len(text) > 48 else text

        # Skip if exists and not forcing
        if out_path.exists() and not args.force:
            print(f"  [{line_id}] SKIP  {speaker:<6}  {preview}")
            skipped += 1
            continue

        print(f"  [{line_id}] GEN   {speaker:<6}  {preview}")

        # Ensure output directory exists
        out_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            params = delivery_params(speaker, tone)

            # Load voice prompt once per speaker
            if speaker not in voice_cache:
                voice_cache[speaker] = load_voice_prompt(speaker)
            voice_prompt = voice_cache[speaker]

            wav = model.generate(
                text,
                audio_prompt_path=voice_prompt,
                **params,
            )

            # Save as WAV first, then convert to MP3
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_wav = tmp.name

            torchaudio.save(tmp_wav, wav, model.sr)
            wav_to_mp3(tmp_wav, str(out_path))
            os.unlink(tmp_wav)

            ok += 1

        except Exception as exc:
            print(f"    ERROR on line {line_id}: {exc}")
            failures.append({"id": line_id, "error": str(exc)})
            # Clean up partial file if any
            if out_path.exists() and out_path.stat().st_size == 0:
                out_path.unlink()

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print(f"  Total lines : {total}")
    print(f"  Generated   : {ok}")
    print(f"  Skipped     : {skipped}")
    print(f"  Failed      : {len(failures)}")
    if failures:
        print("\nFailed lines:")
        for f in failures:
            print(f"  [{f['id']}] {f['error']}")
        sys.exit(1)
    else:
        print("\nAll lines generated successfully.")


if __name__ == "__main__":
    main()
