# Fonts for the share images

Bricolage Grotesque, Figtree and Zen Maru Gothic, from Google Fonts, under the SIL Open Font License 1.1 (https://openfontlicense.org). The share images need ttf files, so they live here instead of coming from `next/font`.

`ZenMaruGothic-Bold-og.ttf` is Zen Maru Gothic cut down to the characters the Japanese images draw (3.8 MB → 86 KB). `pnpm og:font` makes it from the full font in `scripts/fonts`; run it when the coverage test in `src/server/og/fonts.test.ts` asks.
