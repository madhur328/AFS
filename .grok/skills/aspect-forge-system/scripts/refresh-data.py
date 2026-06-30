#!/usr/bin/env python3
"""Refresh AFS corpus extracts and sync skill references."""

import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
REFS = SKILL / "references"
WALLPAPERS = Path(r"D:\wallpapers")

EXTRACTS = [
    (WALLPAPERS / "twitter-data" / "extract_afs.py", "Twitter AFS extract"),
    (WALLPAPERS / "extract_afs_system_wide.py", "System-wide AFS extract"),
]

GROK_SCRIPTS = [
    (WALLPAPERS / "afs-platform" / "scripts" / "extract_grok_sessions.py", "Grok origin session extract"),
]

SYNC_FILES = [
    (WALLPAPERS / "afs-system-wide" / "aspects-index.json", REFS / "aspects-index.json"),
    (WALLPAPERS / "afs-platform" / "data" / "grok-37560952" / "grok-origin-skill.json", REFS / "grok-origin.json"),
    (WALLPAPERS / "afs-platform" / "data" / "grok-37560952" / "sessions-index.json", REFS / "grok-sessions-index.json"),
]

INGEST_GROK = WALLPAPERS / "afs-platform" / "server" / "ingest-grok.js"


def main():
    for script, label in EXTRACTS:
        if not script.exists():
            print(f"SKIP {label}: {script} not found")
            continue
        print(f"Running {label}...")
        subprocess.run([sys.executable, str(script)], check=True)

    for script, label in GROK_SCRIPTS:
        if not script.exists():
            print(f"SKIP {label}: {script} not found")
            continue
        print(f"Running {label}...")
        subprocess.run([sys.executable, str(script)], check=True)

    if INGEST_GROK.exists():
        print("Ingesting grok origin into AFS platform DB...")
        subprocess.run(["node", str(INGEST_GROK)], check=True, cwd=str(WALLPAPERS / "afs-platform"))
    else:
        print(f"SKIP grok ingest: {INGEST_GROK} not found")

    REFS.mkdir(exist_ok=True)
    for src, dst in SYNC_FILES:
        if src.exists():
            shutil.copy2(src, dst)
            print(f"Synced {dst.name}")
        else:
            print(f"SKIP sync: {src} not found")

    print("Done. Skill references updated.")


if __name__ == "__main__":
    main()