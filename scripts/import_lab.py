#!/usr/bin/env python3
"""Import only the ES-module dependency closure needed by M3CH4's construction lab.
No production campaign, UI shell, AI, battle maps, save system, or audio entry points.
"""
from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlsplit

if len(sys.argv) != 3:
    raise SystemExit("Usage: python scripts/import_lab.py SOURCE_REPO_DIR TARGET_REPO_DIR")
src = Path(sys.argv[1]).resolve()
dst = Path(sys.argv[2]).resolve()
if not (src / "constructionLab.js").exists():
    raise SystemExit("Source branch missing constructionLab.js")
entrypoints = ["constructionLab.js", "constructionLabCore.js", "tests/constructionLab.test.mjs"]
# Parse relative ES-module imports, including multi-line import declarations,
# side-effect imports, re-exports, and literal import(...) expressions.
static_re = re.compile(
    r"""(?:^|\n)\s*(?:import|export)\s+(?:(?:[^;]*?)\s+from\s+)?["']([^"']+)["']""",
    re.MULTILINE,
)
dynamic_re = re.compile(r"""\bimport\s*\(\s*["']([^"']+)["']""")
css_import_re = re.compile(r"""@import\s+(?:url\()?["']([^"']+)["']""")
seen = set()
missing = []
queue = list(entrypoints)

def local_path(owner: str, spec: str) -> str | None:
    if not spec.startswith("."):
        return None
    clean = urlsplit(spec).path
    candidate = os.path.normpath(os.path.join(os.path.dirname(owner), clean))
    if candidate.startswith("../") or os.path.isabs(candidate):
        raise RuntimeError(f"Dependency escaped source: {owner} -> {spec}")
    if not (src / candidate).exists():
        missing.append((owner, spec, candidate))
        return None
    return candidate

while queue:
    name = queue.pop()
    if name in seen:
        continue
    path = src / name
    if not path.is_file():
        missing.append(("<entry>", name, name))
        continue
    seen.add(name)
    if path.suffix not in (".js", ".mjs", ".css"):
        continue
    body = path.read_text(encoding="utf-8")
    deps = static_re.findall(body) + dynamic_re.findall(body)
    if path.suffix == ".css":
        deps += css_import_re.findall(body)
    for spec in deps:
        local = local_path(name, spec)
        if local and local not in seen:
            queue.append(local)

if missing:
    raise SystemExit("Unresolved source imports:\n" + "\n".join(
        f"{owner}: {spec} -> {resolved}" for owner, spec, resolved in missing
    ))

for name in sorted(seen):
    dest = dst / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src / name, dest)

html = (src / "construction-lab.html").read_text(encoding="utf-8")
html = html.replace(
    '<a href="./index.html" title="Leave laboratory">Main game ↗</a>',
    '<a href="https://lowlevelwizards.github.io/M3CH4/" title="Open the production game">LIVE M3CH4 ↗</a>',
)
if 'src="./constructionLab.js"' not in html:
    raise SystemExit("Missing laboratory entry module in HTML")
(dst / "index.html").write_text(html, encoding="utf-8")
shutil.copyfile(src / "constructionLab.css", dst / "constructionLab.css")
(dst / "package.json").write_text(
    '{\n  "name": "m3ch4-experimental-construction-lab",\n'
    '  "private": true,\n  "type": "module",\n'
    '  "scripts": {"test": "node --test tests/*.test.mjs"}\n}\n',
    encoding="utf-8",
)
(dst / ".nojekyll").touch()
manifest = dst / "IMPORTED_COMPONENTS.md"
manifest.write_text(
    "# Construction lab dependency manifest\n\n"
    "This independent project was bootstrapped from the M3CH4 "
    "\`experiment/universal-construction\` branch.\n\n"
    "It copies only the local ES modules transitively imported from "
    "\`constructionLab.js\`, \`constructionLabCore.js\`, and the matching "
    "lab test file, plus the page and stylesheet. Some visual kits import "
    "more than one renderer at module load time, so their dependencies are "
    "intentionally included even when no specific model is currently displayed.\n\n"
    "## Imported source files\n\n"
    + "\n".join(f"- \`{name}\`" for name in sorted(seen))
    + "\n",
    encoding="utf-8",
)
print(f"Imported {len(seen)} source files; verified all relative imports resolve.")
for name in sorted(seen):
    print(name)
