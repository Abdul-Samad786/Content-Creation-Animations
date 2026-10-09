"""
Generate the shared sound-effect library with ElevenLabs sound effects.

Usage:
    python scripts/make_sfx.py              # generate any missing sounds
    python scripts/make_sfx.py boing pop    # just these
    python scripts/make_sfx.py --force      # regenerate all
    python scripts/make_sfx.py --dry-run

Sounds are defined in src/content/sfx-library.json (id → prompt, length,
volume). Files go to public/sfx/<id>.mp3 and the list of generated ids is
recorded in src/content/_generated/assets.json, which the video reads.
"""
import argparse
import sys

from content_lib import (ASSETS_MANIFEST, PUBLIC, SFX_LIBRARY, ApiError, assets_manifest, load_json,
                         request, save_json)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("ids", nargs="*")
    p.add_argument("--force", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    lib = load_json(SFX_LIBRARY)["sounds"]
    ids = a.ids or list(lib)
    unknown = [i for i in ids if i not in lib]
    if unknown:
        sys.exit(f"Not in sfx-library.json: {', '.join(unknown)}")

    for sid in ids:
        out = PUBLIC / "sfx" / f"{sid}.mp3"
        if out.exists() and not a.force:
            print(f"  {sid}: exists")
            continue
        d = lib[sid]
        print(f"  {sid}: {d['prompt']} ({d.get('seconds', 'auto')}s)")
        if a.dry_run:
            continue
        body = {"text": d["prompt"], "prompt_influence": d.get("influence", 0.45), "model_id": "eleven_text_to_sound_v2"}
        if d.get("seconds"):
            body["duration_seconds"] = max(0.5, min(30, d["seconds"]))
        try:
            audio = request("POST", "/v1/sound-generation?output_format=mp3_44100_128", body, accept="audio/mpeg")
        except ApiError as e:
            print(f"    failed: {e}")
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(audio)

    if not a.dry_run:
        m = assets_manifest()
        m["sfx"] = sorted(sid for sid in lib if (PUBLIC / "sfx" / f"{sid}.mp3").exists())
        save_json(ASSETS_MANIFEST, m)
        print(f"Recorded {len(m['sfx'])} sounds in {ASSETS_MANIFEST.relative_to(ASSETS_MANIFEST.parents[2])}")


if __name__ == "__main__":
    main()
