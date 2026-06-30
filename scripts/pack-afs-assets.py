#!/usr/bin/env python3
"""Pack AFS media vault, lore corpus, and addons into the canonical assets zip."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VAULT = ROOT / "videos" / "afs"
IMAGES = VAULT / "images"
ENTHEA_EXE = ROOT / "enthea-rs.exe"
RELEASE = ROOT / "release"
DATA = ROOT / "data"
LORE_CORPUS = DATA / "lore-corpus.json"
LORE_STORIES = DATA / "lore-stories"
LORE_IMAGES = DATA / "lore-images"
AFS_DB = DATA / "afs.db"

VIDEO_EXT = {".mp4", ".webm", ".mov", ".mkv"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
TEXT_EXT = {".txt", ".json"}
SKIP_NAMES = {".gitkeep", "thumbs.db", ".ds_store"}

# Reuse existing release zip — do not create a new dated filename by default.
CANONICAL_ZIP_NAMES = (
    "afs-assets-20260620.zip",
    "afs-assets.zip",
)


def sha256_file(path: Path, chunk: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            block = f.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def resolve_output_zip() -> Path:
    """Return the zip path to update in place (never a new dated name unless none exists)."""
    env = os.environ.get("AFS_ASSETS_ZIP", "").strip()
    if env:
        p = Path(env)
        return p if p.is_absolute() else ROOT / p

    RELEASE.mkdir(parents=True, exist_ok=True)
    for name in CANONICAL_ZIP_NAMES:
        candidate = RELEASE / name
        if candidate.is_file():
            return candidate

    matches = sorted(RELEASE.glob("afs-assets*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    if matches:
        return matches[0]

    return RELEASE / CANONICAL_ZIP_NAMES[0]


def collect_addons() -> list[tuple[Path, str]]:
    addons: list[tuple[Path, str]] = []
    if ENTHEA_EXE.is_file():
        addons.append((ENTHEA_EXE, "addons/enthea-rs.exe"))
    return addons


def collect_lore() -> list[tuple[Path, str]]:
    """Lore corpus, long-form myths, prayer/myth images, seeded DB."""
    lore: list[tuple[Path, str]] = []
    if LORE_CORPUS.is_file():
        lore.append((LORE_CORPUS, "data/lore-corpus.json"))
    if AFS_DB.is_file():
        lore.append((AFS_DB, "data/afs.db"))
    if LORE_STORIES.is_dir():
        for entry in sorted(LORE_STORIES.iterdir()):
            if entry.is_file() and entry.suffix.lower() in TEXT_EXT:
                if entry.name.lower() not in SKIP_NAMES:
                    lore.append((entry, f"data/lore-stories/{entry.name}"))
    if LORE_IMAGES.is_dir():
        for entry in sorted(LORE_IMAGES.iterdir()):
            if entry.is_file() and entry.suffix.lower() in IMAGE_EXT:
                if entry.name.lower() not in SKIP_NAMES:
                    lore.append((entry, f"data/lore-images/{entry.name}"))
    return lore


def collect_files() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    if VAULT.is_dir():
        for entry in sorted(VAULT.iterdir()):
            if entry.is_file() and entry.suffix.lower() in VIDEO_EXT:
                if entry.name.lower() not in SKIP_NAMES:
                    files.append((entry, f"afs/{entry.name}"))
    if IMAGES.is_dir():
        for entry in sorted(IMAGES.iterdir()):
            if entry.is_file() and entry.suffix.lower() in IMAGE_EXT:
                if entry.name.lower() not in SKIP_NAMES:
                    files.append((entry, f"afs/images/{entry.name}"))
    return files


def install_hint(entry: str, kind: str) -> str | None:
    if kind == "addon":
        return "platform root → enthea-rs.exe"
    if entry.startswith("data/lore-stories/"):
        return "data/lore-stories/"
    if entry.startswith("data/lore-images/"):
        return "data/lore-images/"
    if entry == "data/lore-corpus.json":
        return "data/lore-corpus.json"
    if entry == "data/afs.db":
        return "data/afs.db (merge/replace after npm run seed-lore if needed)"
    if entry.startswith("afs/images/"):
        return "videos/afs/images/"
    if entry.startswith("afs/"):
        return "videos/afs/"
    return None


def main() -> int:
    media = collect_files()
    lore = collect_lore()
    addons = collect_addons()
    bundle = (
        [(src, entry, "media") for src, entry in media]
        + [(src, entry, "lore") for src, entry in lore]
        + [(src, entry, "addon") for src, entry in addons]
    )

    if not bundle:
        print("No assets found under videos/afs, data/lore*, or addons", file=sys.stderr)
        return 1

    out_path = resolve_output_zip()
    existed = out_path.is_file()
    RELEASE.mkdir(parents=True, exist_ok=True)

    manifest_entries = []
    total_raw = 0

    action = "Updating" if existed else "Creating"
    print(f"{action} {out_path}")
    print(f"Packing {len(media)} media + {len(lore)} lore + {len(addons)} addon(s)")
    print("Compression: ZIP DEFLATE level 9")

    with zipfile.ZipFile(
        out_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as zf:
        for i, (src, entry, kind) in enumerate(bundle, 1):
            size = src.stat().st_size
            total_raw += size
            digest = sha256_file(src)
            zf.write(src, entry, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
            manifest_entries.append(
                {
                    "path": entry,
                    "kind": kind,
                    "source": str(src.relative_to(ROOT)).replace("\\", "/"),
                    "bytes": size,
                    "sha256": digest,
                    "install_to": install_hint(entry, kind),
                }
            )
            if i % 10 == 0 or i == len(bundle):
                print(f"  [{i}/{len(bundle)}] {entry}")

        manifest = {
            "name": "AFS Platform Media Vault + Lore + Addons",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "vault_root": "afs/",
            "lore_root": "data/",
            "addons_root": "addons/",
            "file_count": len(manifest_entries),
            "total_bytes_uncompressed": total_raw,
            "compression": "zip-deflate-9",
            "install_notes": {
                "media": "Extract afs/ into videos/afs/ (merge images/ subfolder).",
                "lore": "Extract data/lore-corpus.json, data/lore-stories/, data/lore-images/ into data/. Run npm run seed-lore to refresh DB from corpus.",
                "database": "data/afs.db is optional — copy to data/ or re-seed after extracting lore files.",
                "enthea": "Copy addons/enthea-rs.exe to platform root as enthea-rs.exe for Visuals → ENTHEA Live.",
            },
            "files": manifest_entries,
        }
        zf.writestr(
            "afs/manifest.json",
            json.dumps(manifest, indent=2),
            compress_type=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        )

    zip_size = out_path.stat().st_size
    ratio = (1 - zip_size / total_raw) * 100 if total_raw else 0

    print()
    print(f"Output: {out_path}")
    print(f"Uncompressed: {total_raw / (1024 * 1024):.2f} MB")
    print(f"Zip size:     {zip_size / (1024 * 1024):.2f} MB")
    print(f"Saved:        {ratio:.1f}% (pre-compressed media compresses lightly)")
    print()
    print("Next: upload to Google Drive and update data/assets-download.json (see README).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())