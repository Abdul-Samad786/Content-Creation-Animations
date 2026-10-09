"""
Hear candidate ElevenLabs voices for a character before choosing one.

Usage:
    python scripts/audition_voices.py left-on-seen mia          # candidates from series.json
    python scripts/audition_voices.py left-on-seen byte --text "[giggles] Hi!"
    python scripts/audition_voices.py --list                    # every voice on your account

Writes public/auditions/<series>/<character>/<voice-name>.mp3 — listen, then put
the winner's id and name in that character's "voice" in series.json and run
make_voices.py again.
"""
import argparse
import base64
import re
import sys

from content_lib import PUBLIC, ApiError, request, series


def list_voices():
    data = request("GET", "/v1/voices")
    for v in sorted(data.get("voices", []), key=lambda v: v["name"]):
        labels = ", ".join(f"{k}: {val}" for k, val in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v['name']:<24} {labels}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("series", nargs="?")
    p.add_argument("character", nargs="?")
    p.add_argument("--text", help="line to read (default: the character's audition line)")
    p.add_argument("--list", action="store_true")
    a = p.parse_args()

    if a.list:
        return list_voices()
    if not (a.series and a.character):
        sys.exit("Give a series and character, or --list")

    s = series(a.series)
    who = next((c for c in s["cast"] if c["id"] == a.character), None)
    if not who:
        sys.exit(f"No '{a.character}' in {a.series}. Cast: {', '.join(c['id'] for c in s['cast'])}")
    voice = who.get("voice") or {}
    text = a.text or voice.get("audition") or "Hi! This is how I sound."
    model = s.get("tts", {}).get("model", "eleven_v3")
    candidates = voice.get("candidates") or [{"id": voice.get("id"), "name": voice.get("name", "current")}]

    out_dir = PUBLIC / "auditions" / a.series / a.character
    out_dir.mkdir(parents=True, exist_ok=True)
    for c in candidates:
        name = re.sub(r"[^a-z0-9-]+", "-", c["name"].lower())
        print(f"  {c['name']} ({c['id']}): {text}")
        try:
            res = request("POST", f"/v1/text-to-speech/{c['id']}/with-timestamps?output_format=mp3_44100_128",
                          {"text": text, "model_id": model, "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}})
        except ApiError as e:
            print(f"    failed: {e}")
            continue
        path = out_dir / f"{name}.mp3"
        path.write_bytes(base64.b64decode(res["audio_base64"]))
        print(f"    → {path.relative_to(PUBLIC.parent)}")


if __name__ == "__main__":
    main()
