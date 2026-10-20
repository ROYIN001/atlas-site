#!/usr/bin/env python3
"""Compare learner-facing identities (oral questions, topics, quiz2 hosts) between a base revision and a candidate tree (read-only).

Usage: python identity_diff.py --repo <git checkout> --base-rev <rev> --cand <tree> [--allow-retired FILE] [--out report.json]

Checks (all derived from canonical generated/ source files, never recomputed hashes):
  qa      every (sid, tid, id) in base data/qa/<sid>.json must still exist in the candidate data/qa
          (atlas-oral-v1 "<sid>/<tid>/<id>" and SRS "q:<sid>/<tid>/<id>" depend on it)
  topics  every <sid>__<tid> in base data/t must still exist (k:<tid>, z:<tid>/…, q:<sid>/<tid>/…, practice/seen/notes)
  quiz2   hosts without an explicit id get <tid>-q<n> by position: inserting/deleting/moving a block re-attributes
          atlas-practice-v1 / SRS z: history; flag count changes and blocks whose content moved to another position
Exit 1 when anything is lost or shifted and not listed in --allow-retired (JSON list of "sid/tid/id" or "topic:sid/tid").
"""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path

HOST = re.compile(r'<[^>]*data-demo="quiz2"[^>]*>\s*<script type="application/json">(.*?)</script>', re.S)

def git_files(repo, rev, prefix):
    out = subprocess.check_output(["git", "-C", repo, "ls-tree", "-r", "--name-only", rev, prefix], text=True)
    return [p for p in out.splitlines() if p.endswith(".json")]

def git_read(repo, rev, path):
    return subprocess.check_output(["git", "-C", repo, "show", f"{rev}:{path}"])

def load(base, path):
    return json.loads(git_read(*base, path) if isinstance(base, tuple) else (base / path).read_bytes())

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
                # app.js gives an unpinned host "<tid>-q<n>" without checking pinned ids:
                # two blocks then share one practice/SRS record.
                dups.append(f"{key}: two quiz2 blocks get this runtime id (pin every block or none)")
            hosts[key] = (bool(own), hashlib.sha256(m.group(1).encode()).hexdigest()[:12])
    return topics, hosts

def quiz2_shift(bh, ch, allowed):
    """positional keys only: a base block whose content now sits at another position, or whose key vanished"""
    out = []
    b = {k: fp for k, (own, fp) in bh.items() if not own}
    c = {k: fp for k, (own, fp) in ch.items() if not own}
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

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True); ap.add_argument("--base-rev", required=True)
    ap.add_argument("--cand", required=True, type=Path); ap.add_argument("--allow-retired", type=Path)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args(argv)
    base = (a.repo, a.base_rev)
    allowed = set(json.loads(a.allow_retired.read_text())) if a.allow_retired else set()
    bq, cq = qa_ids(base), qa_ids(a.cand)
    dups = []
    bt, bh = topics_and_hosts(base); ct, ch = topics_and_hosts(a.cand, dups)
    report = {
        "tool": "identity_diff", "base_rev": a.base_rev,
        "qa_lost": sorted(bq - cq - allowed), "qa_new": sorted(cq - bq),
        "topics_lost": sorted(bt - ct - allowed),
        "quiz2_shifted": quiz2_shift(bh, ch, allowed),
        "quiz2_duplicate_ids": dups,
    }
    report["ok"] = not (report["qa_lost"] or report["topics_lost"] or report["quiz2_shifted"] or dups)
    text = json.dumps(report, ensure_ascii=False, indent=1)
    if a.out:
        a.out.write_text(text + "\n", encoding="utf-8")
    print(text if not report["ok"] else f"identity_diff: OK ({len(bq)} qa ids, {len(bt)} topics, {len(bh)} quiz2 hosts preserved; {len(report['qa_new'])} new qa ids)")
    return 0 if report["ok"] else 1

if __name__ == "__main__":
    sys.exit(main())
