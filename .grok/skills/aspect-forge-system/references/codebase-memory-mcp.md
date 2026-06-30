# Codebase Memory MCP — AFS Integration

High-performance code intelligence for the AFS platform. Indexes `G:\AFS` into a persistent knowledge graph; answers structural queries in sub-ms. Repo: [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp).

## Local install (Madhur)

| What | Path |
|------|------|
| Binary | `G:\codebase-memory-mcp\codebase-memory-mcp.exe` (v0.8.1) |
| Installer script | `G:\install-cbm.ps1` |
| Re-index helper | `G:\codebase-memory-mcp\index-afs.py` |
| Index args | `G:\codebase-memory-mcp\index-args.json` → `{"repo_path": "G:/AFS"}` |
| Global MCP config | `C:\Users\Madhur\.grok\config.toml` |
| Project MCP config | `G:\AFS\.grok\config.toml` |

**Indexed project name:** `G-AFS` (root `G:/AFS`). Check with `list_projects`.

## When to use (agent rules)

1. **Prefer MCP over grep/glob** for code structure: definitions, callers, routes, impact, architecture.
2. **Always pass `project: "G-AFS"`** on every tool call.
3. **Read tool schemas first** from `C:\Users\Madhur\mcps\codebase-memory-mcp\tools\` before calling.
4. **Search flow:** `search_graph` → get `qualified_name` → `get_code_snippet`.
5. **Lore/codex/aspect corpus** still lives in `data/` and skill `references/` — CBM is for **code**, not tweet extracts.

## 14 MCP tools — quick pick

| Task | Tool | Notes |
|------|------|-------|
| List indexed repos | `list_projects` | Confirm `G-AFS` exists |
| Re-index after big changes | `index_repository` | `repo_path: "G:/AFS"`, mode `full` default |
| Index health | `index_status` | `project: "G-AFS"` |
| Find symbol / concept | `search_graph` | `query` (BM25), `name_pattern`, or `semantic_query` (array!) |
| Read implementation | `get_code_snippet` | Needs `qualified_name` from search |
| Architecture map | `get_architecture` | packages, routes, hotspots, clusters |
| Callers / callees | `trace_path` | modes: `calls`, `data_flow`, `cross_service` |
| Complex graph query | `query_graph` | Cypher-like; 100k row ceiling |
| Text + graph rank | `search_code` | grep enriched with graph; default limit 10 |
| Git impact | `detect_changes` | uncommitted / since ref |
| Persist decisions | `manage_adr` | ADRs across sessions |
| Graph schema | `get_graph_schema` | node labels, edge types |
| Runtime traces | `ingest_traces` | optional enhancement |
| Delete index | `delete_project` | rare |

## search_graph modes

- **`query`** — natural language / keywords; BM25; camelCase split; best default.
- **`name_pattern`** — regex on symbol names.
- **`semantic_query`** — MUST be array `["send","publish"]`; results in `semantic_results`.
- **Pagination:** check `has_more`; re-call with `offset += limit`.

## G-AFS architecture snapshot (indexed)

- **Stack:** React (Vite) + Express + sql.js SQLite · Electron optional
- **Nodes/edges:** ~3592 / ~7841
- **Languages:** JS (122), TS (85), HTML (4), Python (2)
- **Hotspots:** `server/db.prepare`, `journal-attachments.push`, `db.all/run/get`
- **Clusters:** `client` (pages, lib), `server` (services, grok-extract), `scripts`
- **Key routes:** `/aspects`, `/codex`, `/lore`, `/journal`, `/proficiency-tracks`, …
- **Entry:** `client/src/App.tsx`, `server/index.js`

## Re-index commands

```powershell
# Via helper script
python G:\codebase-memory-mcp\index-afs.py

# Or CLI direct
G:\codebase-memory-mcp\codebase-memory-mcp.exe cli index_repository '{"repo_path": "G:/AFS"}'

# Or MCP tool index_repository with repo_path G:/AFS
```

## Graph UI (optional)

```powershell
G:\codebase-memory-mcp\codebase-memory-mcp.exe --ui=true --port=9749
# → http://localhost:9749
```

## AFS code ↔ corpus mapping

| Domain | Code path | Data / lore |
|--------|-----------|-------------|
| Aspects directory | `client/src/pages/Aspects.tsx`, `server/services/` | `data/aspects-index.json`, `data/afs.db` |
| Synthesis / EOT | `client/src/pages/Forge.tsx` | `data/save8-synthesis-hierarchy.json` |
| Red Leaf kernel | `client/src/pages/RedLeafKernel.tsx`, `client/src/lib/red-leaf-kernel.ts` | `data/red-leaf-kernel-snapshot.json` |
| Codex | `client/src/pages/Codex.tsx` | `data/afs-insights-codex.json` |
| Spiral engine | `client/src/pages/SpiralEngine.tsx`, `client/public/afs-recursive-spiral-engine.html` | embedded in static build |
| Grok origin | `client/src/pages/GrokOrigin.tsx`, `server/services/grok-extract` | `data/grok-37560952/` (if present) |
| Journal | `client/src/pages/Journal.tsx` | Discord sync + `data/static-export.json` |
| Base layer | `client/src/lib/base-layer.ts` | `data/base-layer.json` |
| Static offline | `scripts/bundle-static-html/` | `afs-platform-static.html`, `afs-platform-static-mobile.html` |

## Token discipline

One `get_architecture` or targeted `search_graph` replaces dozens of file reads (~120× fewer tokens vs naive exploration per CBM benchmarks). Narrow with `file_pattern`, `label`, `path_filter` before paginating.