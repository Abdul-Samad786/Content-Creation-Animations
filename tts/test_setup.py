"""Verify the Chatterbox TTS setup by generating one short test line."""
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

def main():
    print("Loading Chatterbox TTS model (first run downloads ~1 GB of weights)…")
    try:
        import torch
        import torchaudio
        from chatterbox.tts import ChatterboxTTS
    except ImportError as e:
        print(f"ERROR: Missing dependency — {e}")
        print("Run: pip install -r tts/requirements.txt")
        sys.exit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    model = ChatterboxTTS.from_pretrained(device=device)

    print("Generating test line…")
    wav = model.generate(
        "Hello. This is a test of the Chatterbox voice system.",
        exaggeration=0.3,
        cfg_weight=0.5,
    )

    out_path = SCRIPT_DIR / "test_output.wav"
    torchaudio.save(str(out_path), wav, model.sr)
    print(f"Test audio saved → {out_path}")
    print(f"File size: {out_path.stat().st_size:,} bytes")
    print("Setup OK.")

if __name__ == "__main__":
    main()
