#!/usr/bin/env python3
"""Compare learner-facing identities between a base revision and a candidate tree (read-only).

Usage:
  python compare_identity.py --repo <git checkout> --base-rev <rev> --cand <tree>
                             [--candidate-digest <handoff digest>] [--out report.json]
                             [--allow-retired FILE] [--skip-terms]

For the handoff's identity gate run it with --candidate-digest and --out: the
report's first line is then "candidate_digest: <digest>" (the evidence rule of
check_handoff.py) followed by the JSON report, which records the resolved base
commit. Every check reads the canonical generated/source files of the two trees;
nothing recomputes the app's hashes except termKey, which runs app.js's own
stableId/termKey in Node.

  qa      every (sid, tid, id) in base data/qa/<sid>.json must still exist in the
          candidate data/qa. atlas-oral-v1 "<sid>/<tid>/<id>" and SRS
          "q:<sid>/<tid>/<id>" depend on it. An oral question without an explicit
          id gets "qa-" + stableId(its text), so editing that text changes the id.
          The candidate's data/qa must be fresh: it is regenerated with the
          candidate's own src/build_steps/qa.py and compared (exit 2 when stale).
  topics  every <sid>__<tid> in base data/t must still exist (k:<tid>, z:<tid>/...,
          q:<sid>/<tid>/..., practice/seen/notes records). A topic that changed
          subject is listed as moved (tid-keyed records survive, q:/oral do not),
          and one tid in two subjects is a collision.
  quiz2   runtime id = the host's id attribute, else "<tid>-q<n>" by position
          (data-id alone does not pin: atlas-practice-v1 keys host.id). Records
          are keyed "<tid>/<id>". Inserting, deleting or moving an unpinned block
          re-attributes atlas-practice-v1 / SRS z: history; a pinned id that is
          renamed or removed orphans it; pinning only some blocks lets two blocks
          share one runtime id. Blocks are matched by their question stems, so
          reordering answer options (rebalance.py) is not a move. The legacy
          atlas-quiz-v1 side-rail card is keyed by order even when ids are
          pinned: an order change is listed under notes (not a failure).
  terms   every termKey ("g:<group>-<stableId(ru)>[-n]") of the base MODULES must
          still exist; editing a term's Russian text orphans its "remembered" mark,
          bookmark and SRS record. --skip-terms is refused when the code that
          defines them (app.js before the APP marker, stableId..termKeyMap) differs.

Exit 0 when nothing is lost, shifted or duplicated (entries listed in
--allow-retired, a JSON list of "sid/tid/id", "topic:sid/tid", quiz2 keys
"tid/id" or termKeys, are accepted as deliberate retirements). Exit 1 otherwise.
Exit 2 when a check cannot run or the input is wrong (bad revision, missing
data/t or data/qa, stale data/qa, Node missing without --skip-terms).
"""
import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOST = re.compile(r'<[^>]*data-demo="quiz2"[^>]*>\s*<script type="application/json">(.*?)</script>', re.S)
# Any element the runtime would select with [data-demo="quiz2"], however written.
ANY_HOST = re.compile(r"""<[^>]*?(?<![\w-])data-demo\s*=\s*(["']?)quiz2\1(?=[\s/>])""")
OWN_ID = re.compile(r'''(?<![\w-])id\s*=\s*(["'])(.*?)\1''')
REVISION = re.compile(r"^[0-9A-Za-z][0-9A-Za-z._/@{}^~-]{0,199}$")
DIGEST = re.compile(r"^[0-9a-f]{64}$")
APP_MARKER = "/* ================= APP ================= */"
TERMS_FROM, TERMS_TO = "function stableId(", "function termKeyMap("
# Reads app.js from stdin; runs the declarations before the APP marker (MODULES)
# plus app.js's own stableId/termKey, the way src/registry.cjs reads registries.
TERMS_JS = r"""
const fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync(0, 'utf8');
const marker = process.argv[1];
const cut = src.indexOf(marker);
const a = src.indexOf('function stableId('), b = src.indexOf('function termKeyMap(');
if (cut < 0 || a < 0 || b < a) { console.error('cannot locate MODULES/termKey in app.js'); process.exit(2); }
const ctx = vm.createContext({ window: { matchMedia: () => ({ matches: false }) } },
  { codeGeneration: { strings: false, wasm: false } });
const keys = vm.runInContext(src.slice(0, cut) + '\n' + src.slice(a, b) +
  '\nMODULES.flatMap(m => m.terms.map((t, i) => termKey(m, t, i)))', ctx, { timeout: 5000 });
process.stdout.write(JSON.stringify(Array.from(keys)));
"""


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], stderr=subprocess.PIPE)


def git_files(repo, rev, prefix):
    out = git(repo, "ls-tree", "-r", "-z", "--name-only", rev, "--", prefix)
    return [p for p in out.decode("utf-8", "surrogateescape").split("\0") if p.endswith(".json")]


def read_bytes(src, path):
    return git(src[0], "show", f"{src[1]}:{path}") if isinstance(src, tuple) else (src / path).read_bytes()


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


def fingerprint(raw):
    """Identity of a quiz2 block = its question stems; option order and wording
    of explanations are not identity (rebalance.py reorders options)."""
    try:
        q = json.loads(raw)
        items = q if isinstance(q, list) else q.get("qs", []) if isinstance(q, dict) else []
        stems = [re.sub(r"\s+", " ", str(x.get("q", ""))).strip() for x in items if isinstance(x, dict)]
        body = json.dumps(stems if any(stems) else q, ensure_ascii=False, sort_keys=True)
    except (ValueError, AttributeError):
        body = raw
    return hashlib.sha256(body.encode("utf-8")).hexdigest()[:12]


def topics_and_hosts(src, dups=None):
    """topics: {"topic:sid/tid"}; hosts: {"tid/id": (pinned, fingerprint)};
    order: {tid: [fingerprints in page order]}; subject: {tid: [sids]}."""
    topics, hosts, order, subject = set(), {}, {}, {}
    for p in listing(src, "data/t"):
        sid, tid = Path(p).stem.split("__", 1)
        topics.add(f"topic:{sid}/{tid}")
        subject.setdefault(tid, []).append(sid)
        html = load(src, p)["html"]
        found = list(HOST.finditer(html))
        if len(found) != len(ANY_HOST.findall(html)):
            raise ValueError(f"{p}: a quiz2 host is not written as '<… data-demo=\"quiz2\" …>"
                             "<script type=\"application/json\">'; the runtime still numbers it, "
                             "so positions cannot be compared")
        for n, m in enumerate(found, 1):
            tag = m.group(0)[:m.group(0).find(">") + 1]
            own = OWN_ID.search(tag)
            key = f"{tid}/" + (own.group(2) if own else f"{tid}-q{n}")
            if key in hosts and dups is not None:
                # app.js numbers an unpinned host "<tid>-q<n>" without checking
                # pinned ids, so two blocks would share one practice/SRS record.
                dups.append(f"{key}: two quiz2 blocks get this runtime id (pin every block of the topic or none)")
            fp = fingerprint(m.group(1))
            hosts[key] = (bool(own), fp)
            order.setdefault(tid, []).append(fp)
    return topics, hosts, order, subject


def quiz2_shift(bh, ch, allowed):
    """Every base block key must still describe the same block. Candidate blocks
    count whether pinned or not, so pinning a block to its current "<tid>-q<n>"
    is safe; an edit inside a block that keeps its key is not an identity change
    unless the topic's block count also changed (then it cannot be told apart
    from an insertion or deletion)."""
    out = []
    c = {k: fp for k, (own, fp) in ch.items()}
    count = lambda h, t: sum(1 for x in h if x.split("/", 1)[0] == t)
    for k, (pinned, fp) in sorted(bh.items()):
        if k in allowed or c.get(k) == fp:
            continue
        t = k.split("/", 1)[0]
        moved = [x for x, f in c.items() if f == fp and x.split("/", 1)[0] == t and x != k]
        if moved:
            out.append(f"{k}: pinned id renamed to {moved[0]} (history orphaned)" if pinned else
                       f"{k}: its quiz moved to {moved[0]} (history keyed {k} now describes another block)")
        elif k not in c:
            out.append(f"{k}: {'pinned id' if pinned else 'position'} no longer exists (history orphaned)")
        elif not pinned and count(bh, t) != count(ch, t):
            out.append(f"{k}: content changed and the topic's quiz2 count changed; cannot tell whether the "
                       "block kept its position (pin every block of the topic, or retire the key)")
    return out


def code_slice(app):
    """The part of app.js that defines termKeys, CRLF-normalized."""
    text = app.replace(b"\r\n", b"\n").decode("utf-8", "replace")
    cut, a, b = text.find(APP_MARKER), text.find(TERMS_FROM), text.find(TERMS_TO)
    if cut < 0 or a < 0 or b < a:
        raise ValueError("cannot locate MODULES/termKey in app.js")
    return text[:cut] + text[a:b]


def term_keys(app, node):
    """termKey of every MODULES entry, computed by app.js's own functions."""
    out = subprocess.run([node, "-e", TERMS_JS, APP_MARKER], input=app,
                         capture_output=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError("termKey extraction failed: " + out.stderr.decode("utf-8", "replace").strip()[-400:])
    keys = json.loads(out.stdout)
    return set(keys), len(keys)


def qa_fresh(cand):
    """Regenerate data/qa with the candidate's own src/build_steps/qa.py and compare
    with its data/qa. True = fresh, False = stale, str = could not check (why)."""
    step, lib = cand / "src" / "build_steps" / "qa.py", cand / "src"
    if not step.is_file():
        return "src/build_steps/qa.py not found"
    topics = {}
    for p in sorted((cand / "data" / "t").glob("*.json")):
        sid, tid = p.stem.split("__", 1)
        topics.setdefault(sid, []).append((tid, json.loads(p.read_bytes())["html"]))
    saved = list(sys.path)
    try:
        sys.path.insert(0, str(lib))
        spec = importlib.util.spec_from_file_location("atlas_qa_step", step)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory(prefix="atlas-qa-") as tmp:
            mod.run({"root": cand, "data": Path(tmp), "topics": topics, "manifest": {}})
            fresh = {f.name: json.loads(f.read_bytes()) for f in (Path(tmp) / "qa").glob("*.json")}
    except Exception as exc:  # the repository's own builder failed: report, do not guess
        return f"qa.py could not run: {exc!r}"[:300]
    finally:
        sys.path[:] = saved
        sys.modules.pop("buildlib", None)
    have = {f.name: json.loads(f.read_bytes()) for f in (cand / "data" / "qa").glob("*.json")}
    return fresh == have


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", required=True, type=Path, help="git checkout that contains --base-rev")
    ap.add_argument("--base-rev", required=True, help="revision the run started from (handoff base_revision)")
    ap.add_argument("--cand", required=True, type=Path, help="candidate tree (usually the same checkout)")
    ap.add_argument("--candidate-digest", help="handoff candidate.digest this report is evidence for; "
                                               "written as the report's first line")
    ap.add_argument("--allow-retired", type=Path, help="JSON list of deliberately retired identities")
    ap.add_argument("--out", type=Path, help="write the report here (attach it to the identity gate)")
    ap.add_argument("--skip-terms", action="store_true",
                    help="skip the termKey check (refused when the code defining termKeys changed)")
    a = ap.parse_args(argv)

    def stop(message):
        print(f"compare_identity: {message}", file=sys.stderr)
        return 2

    if not REVISION.fullmatch(a.base_rev) or a.base_rev.startswith("-"):
        return stop(f"--base-rev {a.base_rev!r} is not a revision")
    digest = (a.candidate_digest or "").strip().lower() or None
    if digest is not None and not DIGEST.fullmatch(digest):
        return stop("--candidate-digest must be the 64-character candidate digest")
    try:
        base_commit = git(a.repo, "rev-parse", "--verify", "--quiet", a.base_rev + "^{commit}").decode().strip()
        allowed = set()
        if a.allow_retired:
            value = json.loads(a.allow_retired.read_text(encoding="utf-8-sig"))
            if not isinstance(value, list) or not all(isinstance(x, str) for x in value):
                return stop("--allow-retired must be a JSON list of strings")
            allowed = set(value)
        for sub in ("data/t", "data/qa"):
            if not (a.cand / sub).is_dir():
                return stop(f"{a.cand} has no {sub} (is --cand the repository root?)")
        fresh = qa_fresh(a.cand)
        if fresh is False:
            return stop("candidate data/qa is stale relative to data/t: run python src/build_data.py first")
        base = (a.repo, base_commit)
        bq, cq = qa_ids(base), qa_ids(a.cand)
        dups = []
        bt, bh, border, _ = topics_and_hosts(base)
        ct, ch, corder, csub = topics_and_hosts(a.cand, dups)
        base_app, cand_app = read_bytes(base, "app.js"), (a.cand / "app.js").read_bytes()
        if a.skip_terms:
            if code_slice(base_app) != code_slice(cand_app):
                return stop("app.js changed where MODULES/termKey are defined; --skip-terms is not allowed")
            terms = {"checked": False, "lost": [], "reason": "--skip-terms (MODULES/termKey code unchanged)"}
        else:
            node = shutil.which("node")
            if not node:
                return stop("Node is required for the termKey check (or pass --skip-terms)")
            (bk, _), (ck, n) = term_keys(base_app, node), term_keys(cand_app, node)
            terms = {"checked": True, "count": n, "lost": sorted(bk - ck - allowed), "new": len(ck - bk)}
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or b"").decode("utf-8", "replace").strip()[-300:]
        return stop(f"git failed ({' '.join(map(str, exc.cmd[3:5]))}): {detail or 'unknown revision?'}")
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:
        return stop(f"cannot compare: {exc}")

    lost_topics = sorted(bt - ct - allowed)
    tid_of = lambda t: t.split("/", 1)[1]
    cand_tids = {tid_of(t) for t in ct}
    moved = [t for t in lost_topics if tid_of(t) in cand_tids]
    collisions = sorted(f"{tid}: in subjects {', '.join(sorted(s))}" for tid, s in csub.items() if len(s) > 1)
    notes = [] if fresh is True else [f"data/qa freshness not checked: {fresh}"]
    for tid, seq in sorted(border.items()):
        if tid in corder and corder[tid][:len(seq)] != seq:
            notes.append(f"{tid}: quiz2 block order changed; the side-rail card (atlas-quiz-v1) is keyed by "
                         "order and will show another block's old result there")
    report = {
        "candidate_digest": digest,
        "tool": "compare_identity", "base_rev": a.base_rev, "base_commit": base_commit, "cand": str(a.cand),
        "data_qa_fresh": fresh,
        "qa_lost": sorted(bq - cq - allowed), "qa_new": sorted(cq - bq),
        "topics_lost": [t for t in lost_topics if t not in moved],
        "topics_moved": moved,
        "tid_collisions": collisions,
        "quiz2_shifted": quiz2_shift(bh, ch, allowed),
        "quiz2_duplicate_ids": dups,
        "terms": terms,
        "notes": notes,
    }
    report["ok"] = not (report["qa_lost"] or report["topics_lost"] or report["quiz2_shifted"]
                        or collisions or dups or terms["lost"])
    text = json.dumps(report, ensure_ascii=False, indent=1)
    if a.out:
        try:
            a.out.write_text((f"candidate_digest: {digest}\n" if digest else "") + text + "\n", encoding="utf-8")
        except OSError as exc:
            return stop(f"cannot write {a.out}: {exc}")
    if report["ok"]:
        print(f"compare_identity: OK ({len(bq)} qa ids, {len(bt)} topics, {len(bh)} quiz2 hosts, "
              + (f"{terms['count']} term keys" if terms["checked"] else "term keys NOT checked")
              + f" preserved; {len(report['qa_new'])} new qa ids"
              + (f"; {len(moved)} topic(s) moved" if moved else "")
              + (f"; {len(notes)} note(s)" if notes else "") + ")")
        for note in notes:
            print(f"NOTE: {note}")
    else:
        print(text)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(errors="backslashreplace")
    except (AttributeError, ValueError):
        pass
    sys.exit(main())
