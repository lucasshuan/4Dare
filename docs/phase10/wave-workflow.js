// Workflow script for one wave of Phase 10 (run with the Workflow tool, `scriptPath`
// pointing here, and args like {"wave": 2, "wps": ["WP3", "WP5", "WP9a"], "e2e": true}).
// Each package: an engineer builds it, an adversarial reviewer checks it against the
// plan's acceptance criteria, a fixer repairs medium/high defects (up to 3 reviews),
// then one agent runs the full checks on the combined tree. The lead session commits.
export const meta = {
  name: 'phase10-wave',
  description: 'Implement one wave of Phase 10 work packages: build, adversarial review, fix, wave check',
  phases: [
    { title: 'Build', detail: 'one engineer per work package, in parallel' },
    { title: 'Review', detail: 'adversarial review against acceptance criteria, fix up to 2 rounds' },
    { title: 'Wave check', detail: 'full test, typecheck and lint on the combined tree' },
  ],
}

const P = 'docs/phase10'
const PROTO = P + '/prototype'
const WAVE = args.wave
const WPS = args.wps
const EXTRA = args.extra || {}

const RULES = (wp) => `
Rules:
- Edit only the files your work package owns in the plan (plus files the plan explicitly allows it to touch). Other packages (${WPS.filter((w) => w !== wp).join(', ') || 'none'}) run at the same time in the same working tree and own other files: never edit, revert or reformat their files; if a check fails only because of their in-progress files, note it in your report and carry on.
- Never run git checkout, reset, stash, clean, commit or push. Do not commit (the lead commits).
- Read the relevant guide in node_modules/next/dist/docs before writing Next-specific code. Match the repo's style (read neighbouring files: naming, comment density, idioms). Every player name shown has its avatar beside it (PlayerName / useWithNames).
- The approved prototype in ${PROTO}/ is the look to match (layout, sizes, colours, timings, eases), ported to React + motion/react.
- Migrations: one file at a time with the Supabase MCP apply_migration (project zooqjsrhjupqghuuipon). Never pnpm seed, never pnpm setup:supabase, never change library rows except inserts the plan allows. Never read data/*.json.
- If you start a dev or e2e server, stop it when done; restore tsconfig.json by hand if next dev rewrote it (never git checkout). Screenshots go outside test-results/ (every e2e run empties it).`

const build = (wp) => agent(`You are the engineer for ${wp} (wave ${WAVE}) of Phase 10 in the 4Dare repo (the current directory).
Read ${P}/HANDOFF.md first. The final plan is ${P}/plan.md. Read: the header ground rules; the parts of section 1 your package relies on; section 2 (timing); the section 3 rows for your package; the section 4 strings for your package; your entry in section 5 (goal, owned files, acceptance, verification); section 6 for your tests; section 7 risks. Read the reports of earlier packages in ${P}/reports/ (they record deviations you must build on). Read the spec files the plan cites (${P}/spec-a.md, spec-b.md, spec-c.md, engine.md, server-data.md, ui-flow.md, ui-turn-lobby-style.md) and the prototype source where your package builds a scene.
${EXTRA[wp] ? 'Extra instructions from the lead: ' + EXTRA[wp] : ''}
${RULES(wp)}
Finish the package completely (no stubs except the ones the plan assigns to a later package). Run its verification. Write a report to ${P}/reports/${wp}.md: files changed/created; what was built; every deviation from the plan with the reason; verification commands and results (decisive lines only); screenshot paths; requests for WP12 (shared files you could not edit); notes for Jean. Return a 10-line summary.`,
  { label: `build:${wp}`, phase: 'Build' })

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
        required: ['severity', 'file', 'problem', 'fix'],
      },
    },
  },
  required: ['passed', 'defects'],
}

const review = (wp, round) => agent(`You are an adversarial reviewer of ${wp} (wave ${WAVE}) of Phase 10 in the 4Dare repo (the current directory). Review round ${round + 1}.
Read ${P}/HANDOFF.md, the plan ${P}/plan.md (header ground rules, your package's entry in section 5 and the sections it relies on), the engineer's report ${P}/reports/${wp}.md, and the actual changes: git diff plus new untracked files among the package's owned files (ignore changes that belong to other packages ${WPS.filter((w) => w !== wp).join(', ')}).
Check every acceptance criterion one by one against the code AND by running the package's verification (unit tests, typecheck, lint; e2e or screenshots where the package requires them; look at screenshots you take). Hunt for real defects: logic errors, races, server-clock sync, reconnect/reload mid-scene, secrecy leaks (a player must never learn their own character), missing i18n keys or languages, phone layout at 390x844, dark theme, reduced motion, names without avatars, deviations from the approved prototype look in ${PROTO}/, and anything that breaks behaviour that works today. Do not edit files. Report only defects with evidence; no style nits. passed = no high or medium defects. Write your findings to ${P}/reports/${wp}-review-${round + 1}.md too.`,
  { label: `review:${wp}#${round + 1}`, phase: 'Review', schema: REVIEW_SCHEMA })

const fix = (wp, defects) => agent(`You are the engineer for ${wp} (wave ${WAVE}) of Phase 10 in the 4Dare repo (the current directory). A reviewer found these defects:
${JSON.stringify(defects, null, 1)}
Verify each against the code; fix every real one (high and medium first, low when cheap). Read ${P}/plan.md and ${P}/reports/${wp}.md for context.
${RULES(wp)}
Re-run the package's verification. Append a "Fixes" section to ${P}/reports/${wp}.md (each defect: fixed / not a defect + why). Return a 6-line summary.`,
  { label: `fix:${wp}`, phase: 'Review' })

const results = await pipeline(
  WPS,
  (wp) => build(wp),
  async (summary, wp) => {
    let last = null
    for (let round = 0; round < 3; round++) {
      last = await review(wp, round)
      if (!last) break
      const serious = last.defects.filter((d) => d.severity !== 'low')
      if (!serious.length || round === 2) break
      await fix(wp, last.defects)
    }
    return { wp, summary, review: last }
  },
)

phase('Wave check')
const check = await agent(`Wave ${WAVE} of Phase 10 (${WPS.join(', ')}) is built in the 4Dare repo (the current directory). Reports are in ${P}/reports/. Run the full checks on the combined tree: pnpm test, pnpm typecheck, pnpm lint${args.e2e ? ', and pnpm test:e2e (stop any server already on port 3100 first)' : ''}. Fix any failure caused by the interaction of this wave's packages, editing only files those packages own (see ${P}/plan.md section 5). Never run git checkout/reset/stash/commit. Write ${P}/reports/wave${WAVE}-check.md with the commands and results, and return: for each command pass/fail with the decisive lines, and the list of files changed by this wave (git status --short, marking which belong to which package).`,
  { label: `wave${WAVE}:check`, phase: 'Wave check' })

return { results: results.map((r) => r && { wp: r.wp, passed: r.review?.passed, open: r.review?.defects }), check }
