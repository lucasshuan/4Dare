#!/usr/bin/env bash
# Vercel's Ignored Build Step (vercel.json "ignoreCommand"): exit 0 skips the
# deploy, 1 builds. A deploy is skipped only when nothing the app is built
# from changed since the last one: docs, unit and e2e tests, CI, scripts,
# migrations, the old data snapshot and the test and lint configs. When in
# doubt (no previous deploy, history too shallow), it builds.
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "$base^{commit}" 2>/dev/null || exit 1
git diff --quiet "$base" HEAD -- . \
  ':!*.md' ':!*.test.ts' ':!e2e' ':!.github' ':!scripts' ':!supabase' \
  ':!data' ':!biome.json' ':!knip.json' ':!vitest.config.mts' \
  ':!playwright.config.ts' && exit 0
exit 1
