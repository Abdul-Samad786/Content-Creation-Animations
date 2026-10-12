"""
Generate every spoken line of an episode with ElevenLabs, with word timings.

Usage:
    python scripts/make_voices.py left-on-seen/ep01-haha-ok   # one episode
    python scripts/make_voices.py left-on-seen                # every episode of a series
    python scripts/make_voices.py                             # everything
    python scripts/make_voices.py left-on-seen --only 3,5     # just these line numbers
    python scripts/make_voices.py left-on-seen --force        # regenerate even if unchanged
    python scripts/make_voices.py left-on-seen --dry-run      # show what would be sent

What is spoken: the line's "tts" (falls back to "text"). With eleven_v3 the
bracketed performance tags in "tts" ([giggles], [gasps], [whispers], ...) steer
the delivery and are not spoken. With other models the tags are stripped.

For each line this writes public/audio/<series>/<episode>/NN.mp3 and records in
<episode>/audio.json: the clip length, the timing of every word (for captions)
and a per-frame mouth-openness curve (for lip-sync). A line is regenerated only
when its text, voice, model or voice settings changed (a hash of all four is
kept as "sig"). Every run prints how many characters it sent (or, with
--dry-run, would send) — ElevenLabs bills per character.
"""
import argparse
import base64
import hashlib
import json
import sys

from content_lib import (CONTENT, PUBLIC, ApiError, ffprobe_seconds, load_json, request,
                         resolve_episode_args, save_json, series)

V3_STABILITY = (0.0, 0.5, 1.0)  # eleven_v3 accepts only these: creative / natural / robust

OPEN = {"a": 1.0, "o": 0.95, "e": 0.75, "i": 0.6, "u": 0.6, "y": 0.5}
CLOSED = set("mbp")


def strip_tags(s):
    import re
    return re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]", " ", s)).strip()


def words_from_alignment(al):
    """Word timings (seconds) from character alignment, skipping [tags]."""
    chars = al["characters"]
    starts = al["character_start_times_seconds"]
    ends = al["character_end_times_seconds"]
    words, cur, in_tag = [], None, False
    for ch, s, e in zip(chars, starts, ends):
        if ch == "[":
            in_tag = True
        if in_tag:
            if ch == "]":
                in_tag = False
            if cur:
                words.append(cur)
                cur = None
            continue
        if ch.isspace():
            if cur:
                words.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {"word": ch, "start": s, "end": e}
        else:
            cur["word"] += ch
            cur["end"] = e
    if cur:
        words.append(cur)
    return [{"word": w["word"], "start": round(w["start"], 3), "end": round(w["end"], 3)}
            for w in words if any(c.isalnum() for c in w["word"])]


def mouth_curve(al, seconds, fps):
    """Mouth openness 0..1 per frame from which letter is sounding."""
    chars = al["characters"]
    starts = al["character_start_times_seconds"]
    ends = al["character_end_times_seconds"]
    n = int(seconds * fps) + 1
    raw = [0.0] * n
    in_tag = False
    for ch, s, e in zip(chars, starts, ends):
        if ch == "[":
            in_tag = True
        if in_tag:
            in_tag = ch != "]"
            continue
        c = ch.lower()
        if not c.isalpha():
            continue
        v = OPEN.get(c, 0.0 if c in CLOSED else 0.35)
        for f in range(int(s * fps), min(n, int(e * fps) + 1)):
            raw[f] = max(raw[f], v)
    # Light smoothing so the mouth does not flicker frame to frame
    out = []
    for i in range(n):
        a = raw[max(0, i - 1)]
        b = raw[i]
        c = raw[min(n - 1, i + 1)]
        out.append(round(0.25 * a + 0.5 * b + 0.25 * c, 2))
    return out


def voice_settings(cast_voice, line, model):
    stability = line.get("stability", cast_voice.get("stability", 0.5))
    if model == "eleven_v3":
        stability = min(V3_STABILITY, key=lambda v: abs(v - stability))
    s = {
        "stability": stability,
        "similarity_boost": cast_voice.get("similarity", 0.8),
        "style": cast_voice.get("style", 0.0),
        "use_speaker_boost": True,
    }
    if "speed" in cast_voice:
        s["speed"] = cast_voice["speed"]
    return s


def synthesize(voice_id, text, model, settings):
    body = {"text": text, "model_id": model, "voice_settings": settings}
    path = f"/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128"
    try:
        return request("POST", path, body)
    except ApiError as e:
        # Some models reject some settings (e.g. speed); retry with the basics
        if e.status in (400, 422) and "speed" in settings:
            settings = {k: v for k, v in settings.items() if k != "speed"}
            body["voice_settings"] = settings
            return request("POST", path, body)
        raise


def signature(tts, voice_id, model, settings):
    """Cache key: regenerate only when what is sent to ElevenLabs changes."""
    raw = json.dumps([tts, voice_id, model, settings], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def run_episode(series_id, ep_dir, only, force, dry_run, usage):
    s = series(series_id)
    ep = load_json(CONTENT / series_id / ep_dir / "episode.json")
    fps = s.get("format", {}).get("fps", 30)
    cast = {c["id"]: c for c in s["cast"]}
    tts_cfg = s.get("tts", {})
    model = tts_cfg.get("model", "eleven_v3")
    fallback = tts_cfg.get("fallbackModel")

    audio_path = CONTENT / series_id / ep_dir / "audio.json"
    audio = load_json(audio_path) if audio_path.exists() else {"lines": {}}
    audio.setdefault("lines", {})

    print(f"\n== {series_id}/{ep_dir}  (model {model})")
    for i, line in enumerate(ep["lines"], start=1):
        if "say" not in line:
            continue
        if only and i not in only:
            continue
        who = cast[line["say"]]
        voice = who.get("voice") or {}
        if not voice.get("id"):
            print(f"  line {i}: {who['id']} has no voice id in series.json — skipped")
            continue
        tts = line.get("tts") or line["text"]
        file_rel = f"audio/{series_id}/{ep_dir}/{i:02d}.mp3"
        prev = audio["lines"].get(str(i))
        use_model = model
        spoken = tts if use_model == "eleven_v3" else strip_tags(tts)
        settings = voice_settings(voice, line, use_model)
        sig = signature(tts, voice["id"], model, settings)
        if prev and "sig" in prev:
            unchanged = prev["sig"] == sig
        else:  # clips made before "sig" existed
            unchanged = prev and prev.get("tts") == tts and prev.get("voice") == voice["id"] and prev.get("model") in (model, fallback)
        if unchanged and (PUBLIC / prev["file"]).exists() and not force:
            print(f"  line {i:2d}: unchanged")
            continue

        print(f"  line {i:2d} [{who['id']} · {voice.get('name', voice['id'])}]: {spoken}")
        usage["chars"] += len(spoken)
        usage["lines"] += 1
        if dry_run:
            continue
        try:
            res = synthesize(voice["id"], spoken, use_model, settings)
        except ApiError as e:
            if fallback and e.status in (400, 403, 422):
                print(f"    {use_model} failed ({e.status}); trying {fallback}")
                use_model = fallback
                spoken = strip_tags(tts)
                res = synthesize(voice["id"], spoken, use_model, voice_settings(voice, line, use_model))
            else:
                sys.exit(f"    ElevenLabs error on line {i}: {e}")

        out = PUBLIC / file_rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(base64.b64decode(res["audio_base64"]))
        al = res.get("alignment") or res.get("normalized_alignment")
        seconds = ffprobe_seconds(out)
        if seconds is None:
            seconds = (al["character_end_times_seconds"][-1] + 0.15) if al else 2.0
        if seconds < 0.3:
            print(f"    ! line {i}: clip is only {seconds:.2f}s — empty or truncated? (kept; re-run with --only {i} --force)")
        entry = {"file": file_rel, "tts": tts, "voice": voice["id"], "model": use_model, "sig": sig, "seconds": round(seconds, 3)}
        if al:
            entry["words"] = words_from_alignment(al)
            entry["mouth"] = mouth_curve(al, seconds, fps)
        audio["lines"][str(i)] = entry
        save_json(audio_path, audio)  # save as we go so an interruption keeps finished lines
        print(f"    → {file_rel}  {seconds:.2f}s, {len(entry.get('words', []))} words timed")

    # Drop entries for lines that no longer speak
    speaking = {str(i) for i, l in enumerate(ep["lines"], start=1) if "say" in l}
    for k in list(audio["lines"]):
        if k not in speaking:
            del audio["lines"][k]
    if not dry_run:
        save_json(audio_path, audio)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("targets", nargs="*", help="series or series/episode (default: all)")
    p.add_argument("--only", help="comma-separated line numbers")
    p.add_argument("--force", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()
    only = {int(x) for x in a.only.split(",")} if a.only else None
    usage = {"chars": 0, "lines": 0}
    for s, e in resolve_episode_args(a.targets):
        run_episode(s, e, only, a.force, a.dry_run, usage)
    verb = "would send" if a.dry_run else "sent"
    print(f"\nElevenLabs: {verb} {usage['chars']} characters for {usage['lines']} line(s).")


if __name__ == "__main__":
    main()
