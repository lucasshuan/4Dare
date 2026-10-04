// Workflow script for Phase 10 packages (Workflow tool, `scriptPath` pointing here).
//
//   build:  {"mode": "build", "wps": ["WP4"], "others": ["WP6", "WP9a"], "env": "...", "extra": {"WP4": "..."}}
//   fix:    {"mode": "fix", "wps": ["WP9a"], "defects": {"WP9a": [...]}, "others": [...], "env": "..."}
//   review: {"mode": "review", "wps": ["WP3", "WP5"], "commits": {"WP3": "a80883c", "WP5": "712de86"}, "env": "..."}
//
// Before a build, the lead writes each package's brief (`python3 docs/phase10/briefs/make.py WP4`)
// and starts one dev server on 3100 with the e2e env, which every agent shares.
// A build is one engineer per package. A run gets only (CPUs - 2) agent slots, so the
// lead starts one run per package to build a wave in parallel. When an engineer returns,
// the lead runs the checks and commits the package; one review per package then runs in
// the background while the next packages build, and the lead fixes what it confirms.
// The whole unit suite and the e2e run once, at the end of Phase 10 (WP12).
export const meta = {
  name: 'phase10-packages',
  description: 'Build Phase 10 work packages from their briefs, or review committed packages once',
  phases: [
    { title: 'Build', detail: 'one engineer per package, from its brief' },
    { title: 'Review', detail: 'one adversarial review per committed package' },
  ],
}

const P = 'docs/phase10'
const WPS = args.wps
const OTHERS = (wp) => [...WPS.filter((w) => w !== wp), ...(args.others || [])].join(', ') || 'none'
const EXTRA = args.extra || {}
// notes on the machine (cloud session: node path, browser for e2e, known flaky tests)
const ENV = args.env ? `\nEnvironment: ${args.env}` : ''
// Jean's caveman-pt skill, level full, for the agents' own words (not for what they write in the repo)
const STYLE = `
Style (caveman full): in your messages and your final return, no articles, filler, hedging, politeness or narration; fragments are fine; one idea per short sentence; no text between tool calls unless it clarifies a risk or an ambiguity. Keep exact: code, paths, commands, numbers, negations. Code, comments, docs, reports and commits stay normal English prose, by the repo's rules.`

const RULES = (wp) => `
Rules:
- Edit only the files your package owns (brief, "Your package"), plus files it explicitly allows. Other packages (${OTHERS(wp)}) run at the same time in this working tree: never edit, revert or reformat their files; if a check fails only because of their files, say so in your report and carry on.
- Never run git add, rm, mv, restore, checkout, reset, stash, clean, commit or push: the lead stages and commits. Delete a file with plain rm.
- Work in few, large steps: every tool call re-reads your whole context, so fewer calls are faster and cheaper. Write whole files with Write rather than many small edits; no task list (TaskCreate/TaskUpdate); pipe command output through tail or grep so only the decisive lines come back.
- Next 16: read the guide in node_modules/next/dist/docs for any Next-specific API you touch.
- A dev server is already running at http://localhost:3100 with the e2e env (the lead started it; it picks up your edits). Use it for the lab (/en/dev/stage) and screenshots. Never start, stop or restart a server; if it is down, say so in your report and skip the screenshots.
- Screenshots go under .data/shots/${wp}/ (gitignored, never emptied by e2e).${ENV}${STYLE}`

const build = (wp) => agent(`You are the engineer for ${wp} of Phase 10 in the 4Dare repo (the current directory).
Your spec is ${P}/briefs/${wp}.md: everything this package relies on, cut verbatim from the plan, the specs and the earlier packages' reports. Read it first and whole; open another doc only through its pointers or to settle a doubt. The prototype files it names are the look to match (port to React + motion/react).
${EXTRA[wp] ? 'From the lead: ' + EXTRA[wp] : ''}
${RULES(wp)}
Build the whole package (no stubs except those the plan gives to a later package). Then verify, and only this: your package's own test files (\`pnpm exec vitest run <files>\`, never the whole suite); \`pnpm typecheck\`; \`pnpm exec biome check <your files>\`; for a package with UI, a few screenshots of the moments its acceptance names (desktop 1280x800 and phone 390x844 in light, one dark, one names=long), and look at each. Never run e2e or the whole unit suite: they run once, at the end of Phase 10 (WP12), with the full screenshot matrix.
Write ${P}/reports/${wp}.md in at most about 80 lines, with these sections: Files; What was built (the API later packages use); Deviations from the plan (each with its reason); Requests (shared files you could not edit, and what later packages must know); Verification (decisive lines only); Notes for Jean (only if any). Return a 5-line summary.`,
  { label: `build:${wp}`, phase: 'Build', effort: 'high' })

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          file: { type: 'string' }, line: { type: 'number' },
          problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
        },
        required: ['severity', 'file', 'problem', 'evidence', 'fix'],
      },
    },
  },
  required: ['passed', 'defects'],
}

const review = (wp) => agent(`You review ${wp} of Phase 10 in the 4Dare repo (the current directory), committed as ${args.commits[wp]} (\`git show ${args.commits[wp]}\`; other packages may be building in the working tree, ignore their uncommitted files).
Read ${P}/briefs/${wp}.md (the acceptance is under "Your package") and the engineer's report ${P}/reports/${wp}.md, then the code. Check each acceptance criterion against the code; run only the package's own test files and \`pnpm typecheck\` (never e2e or the whole suite). Hunt for real defects: logic errors, races, server-clock sync, reload mid-scene, secrecy (a player must never learn their own character), missing i18n keys or languages, phone layout at 390x844, dark theme, reduced motion, names without avatars, the prototype's look, and anything that breaks what works today. Take screenshots only for a visual criterion you can't judge from the code (at most 4, through the dev server at http://localhost:3100; never start or stop a server).
Do not edit files. Report only defects with evidence; lows only when they are real and cheap to fix; no style nits. passed = no high or medium defect. Also write the findings to ${P}/reports/${wp}-review.md.${ENV}${STYLE}`,
  { label: `review:${wp}`, phase: 'Review', effort: 'high', schema: REVIEW_SCHEMA })

const fix = (wp) => agent(`You fix review findings in ${wp} of Phase 10 in the 4Dare repo (the current directory). The package is committed; its brief is ${P}/briefs/${wp}.md and its report ${P}/reports/${wp}.md. Findings:
${JSON.stringify(args.defects[wp], null, 1)}
Check each against the code and fix every real one, the high and medium first. Verify only this: the package's own test files, \`pnpm typecheck\`, \`pnpm exec biome check <changed files>\`, and a quick check in the dev server where a finding is visual or interactive. Append a short "Review fixes" section to ${P}/reports/${wp}.md (each finding: fixed, or not a defect and why). Return a 5-line summary.
${RULES(wp)}`,
  { label: `fix:${wp}`, phase: 'Review', effort: 'high' })

if (args.mode === 'fix') {
  return await parallel(WPS.map((wp) => () => fix(wp).then((summary) => ({ wp, summary }))))
}
if (args.mode === 'review') {
  const results = await parallel(WPS.map((wp) => () => review(wp).then((r) => r && { wp, ...r })))
  return results.filter(Boolean)
}
const results = await parallel(WPS.map((wp) => () => build(wp).then((summary) => ({ wp, summary }))))
return results
