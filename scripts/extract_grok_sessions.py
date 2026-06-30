#!/usr/bin/env python3
"""Extract AFP/EOT/codex sessions from grok origin thread for DB + skill sync."""
import json
import re
from pathlib import Path

SRC = Path(r"D:\wallpapers\afs-platform\data\grok-37560952\conversation-structured.json")
OUT_DIR = Path(r"D:\wallpapers\afs-platform\data\grok-37560952")
SKILL_REFS = Path(r"C:\Users\Madhur\.grok\skills\aspect-forge-system\references")

CONV_ID = "37560952-5989-4407-a50e-cfb153c0fdaf"
CONV_URL = f"https://grok.com/c/{CONV_ID}"


def first_line(text: str, n: int = 120) -> str:
    line = text.strip().split("\n", 1)[0]
    return line[:n]


def extract_goal(text: str) -> str | None:
    for pat in [
        r"Run AFP on (.+?)(?:\n|$)",
        r"AFP Run\s*\nGoal:\s*(.+?)(?:\n|$)",
        r"Goal:\s*(.+?)(?:\n|$)",
        r"Do Eot on (.+?)(?:\n|$)",
        r"Do EOT on (.+?)(?:\n|$)",
        r"Emotional Ore Transmutation applied to (.+?)(?:\n|$)",
    ]:
        m = re.search(pat, text, re.I)
        if m:
            return m.group(1).strip()[:200]
    return None


def classify_session(user_text: str, assistant_text: str) -> tuple[str, str]:
    blob = f"{user_text}\n{assistant_text}"
    if re.search(r"Run AFP|Aspect Forge Protocol \(AFP\)", blob, re.I):
        goal = extract_goal(blob) or first_line(user_text or assistant_text)
        return "AFP", goal or "Aspect Forge Protocol run"
    if re.search(r"Do Eot|Do EOT|Emotional Ore Transmutation applied to", blob, re.I):
        goal = extract_goal(blob) or first_line(user_text or assistant_text)
        return "EOT", goal or "Emotional Ore Transmutation"
    if re.search(r"Base Layer|⚓.*🔥|Anchor of Stability|Aspect Mastery", blob, re.I):
        return "codex", first_line(user_text or assistant_text, 80)
    if re.search(r"Fallen [Vv]alkyrie", user_text, re.I):
        return "origin", "Fallen Valkyrie, Redemption"
    if re.search(r"Aspect Forge Protocol\n\n\(Short code: AFP\)", assistant_text, re.I):
        return "codex", "AFP named — Aspect Forge Protocol"
    if re.search(r"Mind Guardian Set", blob, re.I):
        return "codex", "Mind Guardian Set (Save2 integration)"
    return "other", first_line(user_text or assistant_text, 80)


def pair_turns(turns: list[dict]) -> list[dict]:
    pairs = []
    i = 0
    while i < len(turns):
        t = turns[i]
        if t["role"] == "user":
            user = t["text"]
            assistant = ""
            if i + 1 < len(turns) and turns[i + 1]["role"] == "assistant":
                assistant = turns[i + 1]["text"]
                i += 2
            else:
                i += 1
            pairs.append({"user": user, "assistant": assistant})
        else:
            pairs.append({"user": "", "assistant": t["text"]})
            i += 1
    return pairs


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    turns = data["turns"]
    pairs = pair_turns(turns)

    sessions = []
    for idx, p in enumerate(pairs):
        if not (p["user"] or p["assistant"]):
            continue
        stype, title = classify_session(p["user"], p["assistant"])
        if stype == "other" and len(p["user"] + p["assistant"]) < 200:
            continue
        sessions.append({
            "index": idx,
            "type": stype,
            "title": title,
            "user_preview": p["user"][:400],
            "assistant_preview": p["assistant"][:600],
            "user_chars": len(p["user"]),
            "assistant_chars": len(p["assistant"]),
            "user_text": p["user"],
            "assistant_text": p["assistant"],
        })

    by_type = {}
    for s in sessions:
        by_type.setdefault(s["type"], []).append(s)

    # Strip full text from index (keep in sessions-full.json)
    index = {
        "conversation_id": CONV_ID,
        "url": CONV_URL,
        "title": data.get("title", "AFS origin thread"),
        "turn_count": data.get("turn_count"),
        "char_count": data.get("char_count"),
        "session_count": len(sessions),
        "counts": {k: len(v) for k, v in by_type.items()},
        "milestones": [
            {"label": "Fallen Valkyrie poem", "type": "origin"},
            {"label": "Symbolic journaling → Stability/Anchor", "type": "codex"},
            {"label": "Five core symbols ⚓🔥🌱🌪️🚂", "type": "codex"},
            {"label": "Aspect Mastery named", "type": "codex"},
            {"label": "Aspect Forge Protocol (AFP) named", "type": "codex"},
            {"label": "Base Layer formalized", "type": "codex"},
            {"label": "EOT cluster (Tanjiro→Buddha Save2 era)", "type": "EOT"},
            {"label": "Mind Guardian Set", "type": "codex"},
            {"label": "Red Leaf EOT (Akahitoha)", "type": "EOT"},
            {"label": "X identity / @madhur328 arc", "type": "codex"},
        ],
        "afp_runs": [
            {"index": s["index"], "title": s["title"]}
            for s in sessions if s["type"] == "AFP"
        ],
        "eot_runs": [
            {"index": s["index"], "title": s["title"]}
            for s in sessions if s["type"] == "EOT"
        ],
        "codex_entries": [
            {"index": s["index"], "title": s["title"]}
            for s in sessions if s["type"] in ("codex", "origin")
        ],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "sessions-index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "sessions-full.json").write_text(
        json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Skill reference: compact origin doc
    origin = {
        "conversation_id": CONV_ID,
        "url": CONV_URL,
        "title": "AFS Genesis Thread (grok.com)",
        "extracted_at": "2026-06-18",
        "stats": index["counts"],
        "milestones": index["milestones"],
        "afp_count": len(index["afp_runs"]),
        "eot_count": len(index["eot_runs"]),
        "afp_runs": index["afp_runs"][:50],
        "eot_runs": index["eot_runs"][:80],
        "origin_narrative": (
            "Thread begins with Fallen Valkyrie redemption poem, evolves through symbolic "
            "journaling (Stability/ship/lake/anchor), five core symbols, Aspect Mastery, "
            "then AFP formalization. EOT cluster forges Mind Guardian Set from Tanjiro, Nash, "
            "Turing, Wiener, Einstein, Newton, Goku, Superman, Buddha. Base Layer and Red Leaf "
            "arc continue through ENTHEA and @madhur328 identity work."
        ),
    }
    SKILL_REFS.mkdir(parents=True, exist_ok=True)
    (SKILL_REFS / "grok-origin.json").write_text(
        json.dumps(origin, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    shutil_copy = OUT_DIR / "grok-origin-skill.json"
    shutil_copy.write_text(json.dumps(origin, indent=2, ensure_ascii=False), encoding="utf-8")

    # Markdown codex extracts (curated, not full 3.6M)
    codex_md = ["# AFS Genesis — Grok Origin Thread Extracts\n"]
    codex_md.append(f"Source: [{CONV_URL}]({CONV_URL})\n")
    for label, stype in [
        ("origin", "origin"),
        ("codex", "codex"),
    ]:
        items = [s for s in sessions if s["type"] == stype][:8]
        if not items:
            continue
        codex_md.append(f"\n## {label.title()} excerpts\n")
        for s in items:
            codex_md.append(f"\n### {s['title']}\n")
            if s["user_text"]:
                codex_md.append(f"**User:** {s['user_text'][:2000]}\n")
            if s["assistant_text"]:
                codex_md.append(f"**Grok:** {s['assistant_text'][:3000]}\n")

    afp_sample = [s for s in sessions if s["type"] == "AFP"][:3]
    if afp_sample:
        codex_md.append("\n## AFP sample runs\n")
        for s in afp_sample:
            codex_md.append(f"\n### {s['title']}\n")
            codex_md.append(s["assistant_text"][:4000] + "\n")

    eot_sample = [s for s in sessions if s["type"] == "EOT"][:5]
    if eot_sample:
        codex_md.append("\n## EOT sample runs\n")
        for s in eot_sample:
            codex_md.append(f"\n### {s['title']}\n")
            codex_md.append(s["assistant_text"][:3500] + "\n")

    (SKILL_REFS / "grok-codex-extracts.md").write_text(
        "\n".join(codex_md), encoding="utf-8"
    )

    print(f"sessions: {len(sessions)}")
    print(f"  AFP: {len(by_type.get('AFP', []))}")
    print(f"  EOT: {len(by_type.get('EOT', []))}")
    print(f"  codex: {len(by_type.get('codex', []))}")
    print(f"  origin: {len(by_type.get('origin', []))}")
    print(f"wrote {OUT_DIR / 'sessions-index.json'}")
    print(f"synced skill refs in {SKILL_REFS}")


if __name__ == "__main__":
    main()