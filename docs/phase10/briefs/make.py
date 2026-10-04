#!/usr/bin/env python3
"""Cuts one work package's brief out of plan.md, the specs and the reports.

Every excerpt is copied verbatim under a heading that names its source, so a
package's engineer reads only what the package relies on and loses nothing;
the rest stays one pointer away. Run it when the package starts, so the
reports of the packages before it are in:

    python3 docs/phase10/briefs/make.py WP9a WP4   # writes briefs/WP9a.md, briefs/WP4.md
"""
import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent  # docs/phase10

# Per package: packages it builds on (their plan rows, §5 entries and reports),
# plan §1 subsections, whether it needs the timing table (§2), spec sections
# (file, heading prefix) and prototype pointers.
PACKAGES = {
    "WP9a": dict(
        deps=["WP2"],
        plan=["1.5", "1.11"],
        timing=False,
        specs=[
            ("spec-b.md", "## 0."), ("spec-b.md", "### 1.4"), ("spec-b.md", "### 1.6"),
            ("spec-b.md", "### 4.1"), ("spec-b.md", "### 4.2"), ("spec-b.md", "### 5.2"),
            ("spec-b.md", "## 6."), ("spec-b.md", "### 7.3"), ("spec-b.md", "### 8.1"),
            ("spec-b.md", "### 8.3"), ("spec-b.md", "### 8.6"),
            ("ui-flow.md", "### PickScreen"),
        ],
        proto=[
            "prototype/scenes-b.js: scenes 7 (pick) and 8 (new name + timeout): the card, its field, the preview, the seal, the picture tray",
            "prototype/stage.css: the `.s-card*`, `.s-field*`, `.s-seal*`, `.s-tray*` classes (grep `s-card`)",
        ],
    ),
    "WP4": dict(
        deps=["WP1", "WP2", "WP3"],
        plan=["1.2", "1.7", "1.8", "1.9", "1.10", "1.11"],
        timing=True,
        specs=[
            ("spec-a.md", "### 2.2"), ("spec-a.md", "### 2.3"), ("spec-a.md", "### 2.4"),
            ("spec-c.md", "## 4."), ("spec-c.md", "### 5.2"), ("spec-c.md", "### 5.5"),
            ("ui-flow.md", "## 2."), ("ui-flow.md", "## 10."), ("ui-flow.md", "## 11."),
            ("ui-flow.md", "## 12."),
            ("ui-turn-lobby-style.md", "### `GameFrame`"), ("ui-turn-lobby-style.md", "### `TurnScreen` layout"),
            ("ui-turn-lobby-style.md", "### History today"), ("ui-turn-lobby-style.md", "## 3."),
        ],
        proto=[
            "prototype/shell.js: the match header (`head`, history button, theme tag), `History(ctx)`, the lobby hand-off (`ctx.lobby`), washes",
            "prototype/stage.css: `.s-head*`, `.s-hist*` (grep them)",
        ],
    ),
    "WP6": dict(
        deps=["WP1", "WP5"],
        plan=["1.1", "1.7"],
        timing=True,
        specs=[
            ("server-data.md", "### 1.3"), ("server-data.md", "### 1.6"), ("server-data.md", "### 1.8"),
            ("server-data.md", "## 2."), ("server-data.md", "## 6."),
            ("spec-c.md", "### 3.7"), ("spec-c.md", "### 3.11"),
        ],
        proto=["prototype/shell.js: `c.sys(...)` calls in the scenes list the system lines (grep `\\.sys(` in scenes-*.js)"],
    ),
    "WP7": dict(
        deps=["WP1", "WP2", "WP3", "WP4", "WP5:Requests"],
        plan=["1.1", "1.2", "1.3", "1.4", "1.6", "1.9", "1.10"],
        timing=True,
        specs=[
            ("spec-a.md", "## 0."), ("spec-a.md", "## 1."), ("spec-a.md", "### 2.2"),
            ("spec-a.md", "### 2.5"), ("spec-a.md", "### 2.6"), ("spec-a.md", "### Scene 2"),
            ("spec-a.md", "### Scene 3"), ("spec-a.md", "### Scene 4"), ("spec-a.md", "## 6."),
            ("spec-a.md", "## 7."),
            ("ui-flow.md", "### VoteScreen"), ("ui-flow.md", "### ThemeScreen"),
        ],
        proto=["prototype/scenes-a.js: scenes 2 (cold open), 3 (vote), 4 (theme + rule)", "prototype/kit.js: `K.mini`, `K.portrait`, `K.av`"],
    ),
    "WP8": dict(
        deps=["WP1", "WP2", "WP3", "WP4"],
        plan=["1.1", "1.2", "1.3", "1.4", "1.9"],
        timing=True,
        specs=[
            ("spec-b.md", "## 0."), ("spec-b.md", "### 1.1"), ("spec-b.md", "### 1.2"),
            ("spec-b.md", "### 1.3"), ("spec-b.md", "### 1.6"), ("spec-b.md", "## 2."),
            ("spec-b.md", "## 3."), ("spec-b.md", "### 7.1"), ("spec-b.md", "### 7.2"),
            ("spec-b.md", "### 7.4"), ("spec-b.md", "### 8.4"),
        ],
        proto=["prototype/scenes-b.js: scenes 5 (draw) and 6 (for whom), `c.slipLand`", "prototype/kit.js: `K.mark`, `K.critter`, `K.av`"],
    ),
    "WP9b": dict(
        deps=["WP1", "WP2", "WP3", "WP4", "WP5", "WP9a"],
        plan=["1.2", "1.3", "1.5", "1.6", "1.9", "1.11", "1.12"],
        timing=True,
        specs=[
            ("spec-b.md", "## 0."), ("spec-b.md", "### 1.4"), ("spec-b.md", "### 1.5"),
            ("spec-b.md", "### 1.6"), ("spec-b.md", "## 4."), ("spec-b.md", "## 5."),
            ("spec-b.md", "## 6."), ("spec-b.md", "### 7.3"), ("spec-b.md", "### 8.1"),
            ("spec-b.md", "### 8.2"), ("spec-b.md", "### 8.3"),
        ],
        proto=["prototype/scenes-b.js: scenes 7 (pick table, hand, actions, confirm) and 8 (timeout stamp)"],
    ),
    "WP10": dict(
        deps=["WP1", "WP2", "WP3", "WP4"],
        plan=["1.1", "1.2", "1.3", "1.4", "1.9", "1.10"],
        timing=True,
        specs=[
            ("spec-c.md", "## 0."), ("spec-c.md", "## 1."), ("spec-c.md", "## 2."),
            ("ui-flow.md", "### TurnScreen and friends"), ("ui-turn-lobby-style.md", "### `TurnScreen` layout"),
        ],
        proto=["prototype/scenes-c.js: scenes 9 (your character) and 10 (turn order), `tableRow`, `gameScreen`"],
    ),
    "WP11": dict(
        deps=["WP2", "WP4", "WP6"],
        plan=["1.7", "1.11", "1.12"],
        timing=False,
        specs=[("spec-a.md", "### 2.7"), ("spec-c.md", "## 3.")],
        proto=["prototype/shell.js: `Chat(ctx)`, `finishChat`", "prototype/stage.css: `.s-chat*`"],
    ),
}

REPORT_KEEP = ("Files", "What was built", "Deviations", "Requests", "Fixes", "Re-review fixes")
# a dep written "WP5:Requests" brings only those report sections


def demote(lines, by=2):
    """Pushes an excerpt's headings under the brief's own `##` source heading."""
    return [("#" * by + l) if re.match(r"^#+ ", l) else l for l in lines]


def read(name):
    return (DIR / name).read_text(encoding="utf-8").splitlines()


def section(lines, prefix):
    """The block from the heading starting with `prefix` to the next heading of its level or higher."""
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            level = len(line) - len(line.lstrip("#"))
            end = len(lines)
            for j in range(i + 1, len(lines)):
                m = re.match(r"^(#+) ", lines[j])
                if m and len(m.group(1)) <= level:
                    end = j
                    break
            return lines[i:end]
    raise SystemExit(f"heading not found: {prefix!r}")


def plan_rows(lines, ids):
    """Table rows of plan §3 whose WP column names one of `ids` (plus the table heads)."""
    nums = [i[2:] for i in ids]
    out = []
    for line in lines:
        cells = [c.strip() for c in line.split("|")]
        if not line.startswith("|") or len(cells) < 4:
            out.append(line)
            continue
        if cells[1] in ("Path", "File") or set(cells[1]) <= set("-"):
            out.append(line)
            continue
        if any(re.search(rf"(?<![\w.]){re.escape(n)}(?![\w.])", cells[2]) for n in nums):
            out.append(line)
    return out


def strings(lines, wp):
    """Plan §4: the rules paragraph and the blocks (namespace tables) that name this package."""
    blocks, cur = [], []
    for line in lines:
        if line.startswith(("Rules:", "New namespace", "Unused after")) and cur:
            blocks.append(cur)
            cur = []
        cur.append(line)
    blocks.append(cur)
    keep = [b for b in blocks if b[0].startswith("Rules:") or re.search(rf"\b{wp}\b", b[0])]
    return [l for b in keep for l in b]


def tagged(lines, ids):
    """Bullets of plan §6.1/6.2 that name one of `ids`."""
    return [l for l in lines if any(re.search(rf"\b{i}\b", l) for i in ids)]


def report(dep):
    wp, _, only = dep.partition(":")
    keep = tuple(only.split(",")) if only else REPORT_KEEP
    path = DIR / "reports" / f"{wp}.md"
    if not path.exists():
        return [f"(no report yet: {path.name})"]
    lines = path.read_text(encoding="utf-8").splitlines()
    out = [lines[0]]
    for i, line in enumerate(lines):
        if line.startswith("## ") and line[3:].startswith(keep):
            out += [""] + section(lines, line)
    return demote(out)


def brief(wp):
    cfg = PACKAGES[wp]
    plan = read("plan.md")
    deps = [d.partition(":")[0] for d in cfg["deps"]]
    ids = [wp] + deps
    out = [
        f"# {wp} brief",
        "",
        "Generated by `docs/phase10/briefs/make.py` from `plan.md`, the specs and the earlier reports. "
        "Every block below is copied verbatim; its heading names the source. It is everything this package relies on. "
        "Open a source only to follow a pointer or settle a doubt. Where a spec and the plan disagree, the plan wins "
        "(the specs predate it), and where the plan and an earlier report disagree, the report says what was really built. "
        "How much to verify is set by the lead's prompt: the plan's screenshot matrices are run once, by WP12.",
        "",
        "## Your package (plan §5)",
        "",
        *demote(section(plan, f"### {wp} —")[1:]),
        "",
        "## Ground rules (plan header)",
        "",
        *plan[plan.index(next(l for l in plan if l.startswith("Ground rules"))):plan.index("---")],
        "",
        "## Waves, shared files, screenshot matrix (plan §5 intro)",
        "",
        *plan[plan.index("## 5. Work packages") + 1:plan.index(next(l for l in plan if l.startswith("### WP1 —")))],
    ]
    # a package's report says what it really built; its plan entry only fills in before the report exists
    planned = [d for d in deps if not (DIR / "reports" / f"{d}.md").exists()]
    if planned:
        out += ["## Packages you build on, not reported yet (plan §5 entries)", ""]
        for d in planned:
            out += section(plan, f"### {d} —") + [""]
    for s in cfg["plan"]:
        out += [f"## Plan §{s}", "", *demote(section(plan, f"### {s} ")[1:]), ""]
    if cfg["timing"]:
        out += ["## Plan §2", "", *section(plan, "## 2. ")[1:], ""]
    out += ["## Plan §3 rows for you and the packages you build on", "", *plan_rows(section(plan, "## 3. ")[1:], ids), ""]
    out += ["## Plan §4 (rules and your strings)", "", *strings(section(plan, "## 4. ")[1:], wp), ""]
    tests = tagged(section(plan, "### 6.1")[1:] + section(plan, "### 6.2")[1:], ids)
    out += ["## Plan §6 (tests that name you or your dependencies, then all of 6.3)", "", *tests, "", *section(plan, "### 6.3")]
    out += ["", "## Plan §7", "", *section(plan, "## 7. ")[1:], "## Plan §8", "", *section(plan, "## 8. ")[1:]]
    for name, prefix in cfg["specs"]:
        out += ["", f"## {name}: {prefix.lstrip('#').strip()}", "", *demote(section(read(name), prefix))]
    for d in cfg["deps"]:
        out += ["", f"## Report of {d.partition(':')[0]}", "", *report(d)]
    out += ["", "## Prototype (the look to match; port to React + motion/react)", ""]
    out += [f"- `docs/phase10/{p.split(':', 1)[0]}`:{p.split(':', 1)[1]}" for p in cfg["proto"]]
    out += [
        "",
        "## Pointers",
        "",
        "- Full plan: `docs/phase10/plan.md` (critique log at the end). Specs: `spec-a.md` (scenes 1-4, shell), `spec-b.md` (5-8), `spec-c.md` (9-10, chat, history, backdrops).",
        "- Maps of the code before Phase 10: `engine.md`, `server-data.md`, `ui-flow.md`, `ui-turn-lobby-style.md` (WP1-WP5 changed some of it: trust the code and the reports).",
        "- Open the prototype in a browser: `docs/phase10/prototype/flow.html`.",
    ]
    return "\n".join(out).replace("\n\n\n", "\n\n") + "\n"


if __name__ == "__main__":
    for wp in sys.argv[1:] or PACKAGES:
        text = brief(wp)
        (DIR / "briefs" / f"{wp}.md").write_text(text, encoding="utf-8")
        print(f"{wp}: {len(text.splitlines())} lines, {len(text) // 1000} KB")
