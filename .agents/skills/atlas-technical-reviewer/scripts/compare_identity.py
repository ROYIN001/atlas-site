#!/usr/bin/env python3
"""Compare learner-facing identities between a base revision and a candidate tree (read-only).

Usage:
  python compare_identity.py --repo <git checkout> --base-rev <rev> --cand <tree>
                             [--allow-retired FILE] [--out report.json] [--skip-terms]

Attach the JSON report to the handoff's identity gate. Every check reads the
canonical generated/source files of the two trees; nothing recomputes the app's
hashes except termKey, which runs app.js's own stableId/termKey in Node.

  qa      every (sid, tid, id) in base data/qa/<sid>.json must still exist in the
          candidate data/qa. atlas-oral-v1 "<sid>/<tid>/<id>" and SRS
          "q:<sid>/<tid>/<id>" depend on it. An oral question without an explicit
          id gets "qa-" + stableId(its text), so editing that text changes the id.
  topics  every <sid>__<tid> in base data/t must still exist (k:<tid>, z:<tid>/...,
          q:<sid>/<tid>/..., practice/seen/notes records).
  quiz2   hosts without an explicit id get "<tid>-q<n>" by position: inserting,
          deleting or moving a block re-attributes atlas-practice-v1 / SRS z:
          history (atlas-quiz-v1 is keyed by position even when ids are pinned).
          Pinning only some blocks lets two blocks share one runtime id.
  terms   every termKey ("g:<group>-<stableId(ru)>[-n]") of the base MODULES must
          still exist; editing a term's Russian text orphans its "remembered" mark,
          bookmark and SRS record.

Exit 0 when nothing is lost, shifted or duplicated (entries listed in
--allow-retired, a JSON list of "sid/tid/id", "topic:sid/tid", quiz2 keys or
termKeys, are accepted as deliberate retirements). Exit 1 otherwise. Exit 2 when
a check cannot run (for example Node is missing and --skip-terms was not given).
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOST = re.compile(r'<[^>]*data-demo="quiz2"[^>]*>\s*<script type="application/json">(.*?)</script>', re.S)
APP_MARKER = "/* ================= APP ================= */"
# Runs the declarations before the APP marker (MODULES) plus app.js's own
# stableId/termKey, the same way src/registry.cjs reads the registries.
TERMS_JS = r"""
const fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync(process.argv[1], 'utf8');
const marker = process.argv[2];
const cut = src.indexOf(marker);
const a = src.indexOf('function stableId('), b = src.indexOf('function termKeyMap(');
if (cut < 0 || a < 0 || b < a) { console.error('cannot locate MODULES/termKey in app.js'); process.exit(2); }
const ctx = vm.createContext({ window: { matchMedia: () => ({ matches: false }) } },
  { codeGeneration: { strings: false, wasm: false } });
const keys = vm.runInContext(src.slice(0, cut) + '\n' + src.slice(a, b) +
  '\nMODULES.flatMap(m => m.terms.map((t, i) => termKey(m, t, i)))', ctx, { timeout: 5000 });
process.stdout.write(JSON.stringify(Array.from(keys)));
"""


def git_files(repo, rev, prefix):
    out = subprocess.check_output(["git", "-C", repo, "ls-tree", "-r", "--name-only", rev, prefix], text=True)
    return [p for p in out.splitlines() if p.endswith(".json")]


def git_read(repo, rev, path):
    return subprocess.check_output(["git", "-C", repo, "show", f"{rev}:{path}"])


def read_bytes(src, path):
    return git_read(*src, path) if isinstance(src, tuple) else (src / path).read_bytes()


def load(src, path):
    return json.loads(read_bytes(src, path))


def listing(src, prefix):
    if isinstance(src, tuple):
        return git_files(src[0], src[1], prefix)
    return [p.relative_to(src).as_posix() for p in sorted((src / prefix).glob("*.json"))]


def qa_ids(src):
    ids = set()
    for p in listing(src, "data/qa"):
        if p.endswith("_index.json"):
            continue
        sid = Path(p).stem
        ids |= {f"{sid}/{x['tid']}/{x['id']}" for x in load(src, p)}
    return ids


def topics_and_hosts(src, dups=None):
    topics, hosts = set(), {}
    for p in listing(src, "data/t"):
        sid, tid = Path(p).stem.split("__", 1)
        topics.add(f"topic:{sid}/{tid}")
        html = load(src, p)["html"]
        n = 0
        for m in HOST.finditer(html):
            n += 1
            tag = m.group(0)[:m.group(0).find(">") + 1]
            own = re.search(r'\bid="([^"]+)"', tag)
            key = f"{sid}/{tid}/" + (own.group(1) if own else f"{tid}-q{n}")
            if key in hosts and dups is not None:
                # app.js numbers an unpinned host "<tid>-q<n>" without checking
                # pinned ids, so two blocks would share one practice/SRS record.
                dups.append(f"{key}: two quiz2 blocks get this runtime id (pin every block of the topic or none)")
            hosts[key] = (bool(own), hashlib.sha256(m.group(1).encode()).hexdigest()[:12])
    return topics, hosts


def quiz2_shift(bh, ch, allowed):
    """Base blocks with a positional key: report one whose content now sits under
    another key, or whose key no longer exists. Candidate blocks count whether
    pinned or not, so pinning a block to its current "<tid>-q<n>" is safe; an
    edit inside a block that keeps its key is not an identity change."""
    out = []
    b = {k: fp for k, (own, fp) in bh.items() if not own}
    c = {k: fp for k, (own, fp) in ch.items()}
    for k, fp in sorted(b.items()):
        if k in allowed or c.get(k) == fp:
            continue
        t = k.rsplit("/", 1)[0]
        moved = [x for x, f in c.items() if f == fp and x.rsplit("/", 1)[0] == t and x != k]
        if moved:
            out.append(f"{k}: its quiz moved to {moved[0]} (history keyed {k} now describes another block)")
        elif k not in c:
            out.append(f"{k}: position no longer exists (history orphaned)")
    return out


def term_keys(src, node):
    """termKey of every MODULES entry, computed by app.js's own functions."""
    with tempfile.TemporaryDirectory() as tmp:
        app = Path(tmp) / "app.js"
        app.write_bytes(read_bytes(src, "app.js"))
        out = subprocess.run([node, "-e", TERMS_JS, str(app), APP_MARKER],
                             capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError("termKey extraction failed: " + out.stderr.strip()[-400:])
    keys = json.loads(out.stdout)
    return set(keys), len(keys)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", required=True, help="git checkout that contains --base-rev")
    ap.add_argument("--base-rev", required=True, help="revision the run started from")
    ap.add_argument("--cand", required=True, type=Path, help="candidate tree (usually the same checkout)")
    ap.add_argument("--allow-retired", type=Path, help="JSON list of deliberately retired identities")
    ap.add_argument("--out", type=Path, help="write the JSON report here (attach it to the identity gate)")
    ap.add_argument("--skip-terms", action="store_true",
                    help="skip the termKey check (recorded in the report; use only when MODULES is untouched)")
    a = ap.parse_args(argv)
    base = (a.repo, a.base_rev)
    allowed = set(json.loads(a.allow_retired.read_text(encoding="utf-8"))) if a.allow_retired else set()
    try:
        bq, cq = qa_ids(base), qa_ids(a.cand)
        dups = []
        bt, bh = topics_and_hosts(base)
        ct, ch = topics_and_hosts(a.cand, dups)
        terms = {"checked": False, "lost": [], "reason": "--skip-terms"}
        if not a.skip_terms:
            node = shutil.which("node")
            if not node:
                print("compare_identity: Node is required for the termKey check (or pass --skip-terms)", file=sys.stderr)
                return 2
            (bk, _), (ck, n) = term_keys(base, node), term_keys(a.cand, node)
            terms = {"checked": True, "count": n, "lost": sorted(bk - ck - allowed), "new": len(ck - bk)}
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"compare_identity: cannot compare: {exc}", file=sys.stderr)
        return 2
    report = {
        "tool": "compare_identity", "base_rev": a.base_rev, "cand": str(a.cand),
        "qa_lost": sorted(bq - cq - allowed), "qa_new": sorted(cq - bq),
        "topics_lost": sorted(bt - ct - allowed),
        "quiz2_shifted": quiz2_shift(bh, ch, allowed),
        "quiz2_duplicate_ids": dups,
        "terms": terms,
    }
    report["ok"] = not (report["qa_lost"] or report["topics_lost"] or report["quiz2_shifted"]
                        or dups or terms["lost"])
    text = json.dumps(report, ensure_ascii=False, indent=1)
    if a.out:
        a.out.write_text(text + "\n", encoding="utf-8")
    if report["ok"]:
        print(f"compare_identity: OK ({len(bq)} qa ids, {len(bt)} topics, {len(bh)} quiz2 hosts, "
              + (f"{terms['count']} term keys" if terms["checked"] else "term keys NOT checked")
              + f" preserved; {len(report['qa_new'])} new qa ids)")
    else:
        print(text)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
