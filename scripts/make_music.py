"""
Generate a series' background music loop with ElevenLabs Music.

Usage:
    python scripts/make_music.py left-on-seen
    python scripts/make_music.py left-on-seen --force
    python scripts/make_music.py left-on-seen --dry-run

Reads "music" from series.json (prompt, lengthSeconds, file), writes
public/<file> and records it in src/content/_generated/assets.json. The video
loops it under the dialogue and ducks it while anyone speaks.
Music generation needs a paid ElevenLabs plan; without one, episodes simply
render without music.
"""
import argparse
import sys

from content_lib import ASSETS_MANIFEST, PUBLIC, ApiError, assets_manifest, request, save_json, series


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("series")
    p.add_argument("--force", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    s = series(a.series)
    m = s.get("music")
    if not m or not m.get("prompt"):
        sys.exit(f"series.json for {a.series} has no music.prompt")
    out = PUBLIC / m["file"]
    if out.exists() and not a.force:
        print(f"{m['file']} exists (use --force to regenerate)")
    else:
        print(f"Composing {m.get('lengthSeconds', 60)}s: {m['prompt']}")
        if a.dry_run:
            return
        body = {"prompt": m["prompt"], "music_length_ms": int(m.get("lengthSeconds", 60) * 1000), "force_instrumental": True}
        try:
            audio = request("POST", "/v1/music?output_format=mp3_44100_128", body, accept="audio/mpeg", timeout=600)
        except ApiError as e:
            sys.exit(f"Music generation failed: {e}")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(audio)
        print(f"→ public/{m['file']}")

    if not a.dry_run:
        manifest = assets_manifest()
        manifest["music"][s["id"]] = m["file"]
        save_json(ASSETS_MANIFEST, manifest)


if __name__ == "__main__":
    main()
