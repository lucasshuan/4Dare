// The theme list, split into sets. The host picks which sets a vote draws from.
// Each theme in the whoami_themes table names its set (`theme_set`); the names people
// read live in messages/<lang>/common.json (themeSets).

export const THEME_SETS = [
  {
    key: "screen",
    emoji: "🎬",
    glyphs: ["🎬", "🍿", "🎥", "⭐", "🎞️", "🍿", "🎬"],
  },
  {
    key: "cartoons",
    emoji: "🧸",
    glyphs: ["🧸", "🎈", "🪀", "🧸", "🎨", "🎈", "🪁"],
  },
  {
    key: "anime",
    emoji: "🍥",
    glyphs: ["🍥", "⛩️", "🌸", "🍜", "🗡️", "🌸", "🍥"],
  },
  {
    key: "games",
    emoji: "🎮",
    glyphs: ["🎮", "👾", "🕹️", "⭐", "🍄", "👾", "🎮"],
  },
  {
    key: "books",
    emoji: "📚",
    glyphs: ["📚", "📖", "✒️", "🐉", "📜", "📖", "📚"],
  },
  {
    key: "heroes",
    emoji: "🦸",
    glyphs: ["🦸", "⚡", "🛡️", "🦸‍♀️", "💥", "⚡", "🦹"],
  },
  {
    key: "powers",
    emoji: "⚡",
    glyphs: ["⚡", "✨", "🔮", "🌀", "🪄", "✨", "⚡"],
  },
  {
    key: "myths",
    emoji: "🐉",
    glyphs: ["🐉", "🦄", "🧜‍♀️", "🔱", "🧚", "🐉", "👻"],
  },
  {
    key: "scifi",
    emoji: "🚀",
    glyphs: ["🚀", "👽", "🤖", "🛸", "🪐", "🚀", "🌌"],
  },
  {
    key: "warriors",
    emoji: "⚔️",
    glyphs: ["⚔️", "🏴‍☠️", "🥷", "🛡️", "🗡️", "⚔️", "🏹"],
  },
  {
    key: "animals",
    emoji: "🐾",
    glyphs: ["🐾", "🦁", "🐶", "🐱", "🐸", "🐾", "🦊"],
  },
  {
    key: "music",
    emoji: "🎤",
    glyphs: ["🎤", "🎸", "🎵", "🥁", "🎧", "🎶", "🎤"],
  },
  {
    key: "celebs",
    emoji: "⭐",
    glyphs: ["⭐", "🌟", "🎬", "📸", "🎤", "⭐", "💫"],
  },
  {
    key: "sports",
    emoji: "⚽",
    glyphs: ["⚽", "🏀", "🏆", "🎾", "🏈", "⚽", "🥇"],
  },
  {
    key: "history",
    emoji: "🏛️",
    glyphs: ["🏛️", "👑", "📜", "🗿", "⚱️", "🏛️", "🎨"],
  },
  {
    key: "world",
    emoji: "🌎",
    glyphs: ["🌎", "🗺️", "✈️", "🗼", "🏝️", "🌍", "🧭"],
  },
  {
    key: "jobs",
    emoji: "💼",
    glyphs: ["💼", "🩺", "🔍", "🧑‍🍳", "👮", "💼", "🧑‍🏫"],
  },
  {
    key: "family",
    emoji: "👪",
    glyphs: ["👪", "💞", "👶", "👵", "👫", "👪", "🎂"],
  },
  {
    key: "quirks",
    emoji: "🎭",
    glyphs: ["🎭", "💬", "🤪", "🎭", "😎", "🗯️", "🤓"],
  },
  {
    key: "looks",
    emoji: "🕶️",
    glyphs: ["🕶️", "👗", "💇", "👒", "💄", "🕶️", "👟"],
  },
] as const;

export type ThemeSet = (typeof THEME_SETS)[number]["key"];

/** Every set, in the order the screens show them. */
export const THEME_SET_KEYS: readonly ThemeSet[] = THEME_SETS.map((s) => s.key);

export const themeSetEmoji = (key: ThemeSet | null | undefined) =>
  THEME_SETS.find((s) => s.key === key)?.emoji ?? null;

/** A theme the host typed has no set: its backdrop alternates a pen and "?". */
export const TYPED_GLYPHS = ["✍️", "?", "✍️", "?", "✍️", "?", "✍️"] as const;

/** The 7 symbols bobbing behind a theme's steps (the stage backdrop), in spot order. */
export const themeGlyphs = (
  key: ThemeSet | null | undefined,
): readonly string[] =>
  THEME_SETS.find((s) => s.key === key)?.glyphs ?? TYPED_GLYPHS;
