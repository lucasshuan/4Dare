// The theme list, split into sets. The host picks which sets a vote draws from.
// Each theme in data/themes.json names its set; the names people read live in
// messages/<lang>/common.json (themeSets), and `about` tells the AI what fits.

export const THEME_SETS = [
  {
    key: "screen",
    emoji: "🎬",
    glyphs: ["🎬", "🍿", "🎥", "⭐", "🎞️", "🍿", "🎬"],
    about:
      "movies, TV series and big franchises like Disney, Marvel or Harry Potter",
  },
  {
    key: "cartoons",
    emoji: "🧸",
    glyphs: ["🧸", "🎈", "🪀", "🧸", "🎨", "🎈", "🪁"],
    about:
      "cartoons, kids' shows, toys, puppets, talking objects and cute characters",
  },
  {
    key: "anime",
    emoji: "🍥",
    glyphs: ["🍥", "⛩️", "🌸", "🍜", "🗡️", "🌸", "🍥"],
    about: "anime, manga and tokusatsu",
  },
  {
    key: "games",
    emoji: "🎮",
    glyphs: ["🎮", "👾", "🕹️", "⭐", "🍄", "👾", "🎮"],
    about: "video games and their characters",
  },
  {
    key: "books",
    emoji: "📚",
    glyphs: ["📚", "📖", "✒️", "🐉", "📜", "📖", "📚"],
    about: "books, comics, fairy tales and the people who write them",
  },
  {
    key: "heroes",
    emoji: "🦸",
    glyphs: ["🦸", "⚡", "🛡️", "🦸‍♀️", "💥", "⚡", "🦹"],
    about: "heroes, villains, sidekicks, mentors and rivals",
  },
  {
    key: "powers",
    emoji: "⚡",
    glyphs: ["⚡", "✨", "🔮", "🌀", "🪄", "✨", "⚡"],
    about:
      "superpowers, magic, curses and twists like time travel or coming back from the dead",
  },
  {
    key: "myths",
    emoji: "🐉",
    glyphs: ["🐉", "🦄", "🧜‍♀️", "🔱", "🧚", "🐉", "👻"],
    about: "myths, religion, monsters and fantasy creatures",
  },
  {
    key: "scifi",
    emoji: "🚀",
    glyphs: ["🚀", "👽", "🤖", "🛸", "🪐", "🚀", "🌌"],
    about: "science fiction: robots, aliens, space",
  },
  {
    key: "warriors",
    emoji: "⚔️",
    glyphs: ["⚔️", "🏴‍☠️", "🥷", "🛡️", "🗡️", "⚔️", "🏹"],
    about: "warriors, pirates, ninjas, knights, thieves and outlaws",
  },
  {
    key: "animals",
    emoji: "🐾",
    glyphs: ["🐾", "🦁", "🐶", "🐱", "🐸", "🐾", "🦊"],
    about: "animals, real or fictional",
  },
  {
    key: "music",
    emoji: "🎤",
    glyphs: ["🎤", "🎸", "🎵", "🥁", "🎧", "🎶", "🎤"],
    about: "singers, bands and music",
  },
  {
    key: "celebs",
    emoji: "⭐",
    glyphs: ["⭐", "🌟", "🎬", "📸", "🎤", "⭐", "💫"],
    about:
      "real celebrities: actors, comedians, TV hosts, internet stars, the famous of a decade",
  },
  {
    key: "sports",
    emoji: "⚽",
    glyphs: ["⚽", "🏀", "🏆", "🎾", "🏈", "⚽", "🥇"],
    about: "athletes and sports, real or fictional",
  },
  {
    key: "history",
    emoji: "🏛️",
    glyphs: ["🏛️", "👑", "📜", "🗿", "⚱️", "🏛️", "🎨"],
    about: "real people from history, politics, science and art",
  },
  {
    key: "world",
    emoji: "🌎",
    glyphs: ["🌎", "🗺️", "✈️", "🗼", "🏝️", "🌍", "🧭"],
    about: "places and countries: where characters live or come from",
  },
  {
    key: "jobs",
    emoji: "💼",
    glyphs: ["💼", "🩺", "🔍", "🧑‍🍳", "👮", "💼", "🧑‍🏫"],
    about: "jobs and roles: doctors, detectives, spies, cooks, teachers",
  },
  {
    key: "family",
    emoji: "👪",
    glyphs: ["👪", "💞", "👶", "👵", "👫", "👪", "🎂"],
    about: "families, ages, couples, duos, trios and groups of friends",
  },
  {
    key: "quirks",
    emoji: "🎭",
    glyphs: ["🎭", "💬", "🤪", "🎭", "😎", "🗯️", "🤓"],
    about: "personality, habits, catchphrases and names",
  },
  {
    key: "looks",
    emoji: "🕶️",
    glyphs: ["🕶️", "👗", "💇", "👒", "💄", "🕶️", "👟"],
    about: "looks: clothes, hair, faces, shapes and colors",
  },
] as const;

export type ThemeSet = (typeof THEME_SETS)[number]["key"];

/** Every set, in the order the screens show them. */
export const THEME_SET_KEYS: readonly ThemeSet[] = THEME_SETS.map((s) => s.key);

export const isThemeSet = (key: unknown): key is ThemeSet =>
  (THEME_SET_KEYS as readonly unknown[]).includes(key);

export const themeSetEmoji = (key: ThemeSet | null | undefined) =>
  THEME_SETS.find((s) => s.key === key)?.emoji ?? null;

/** A theme the host typed has no set: its backdrop alternates a pen and "?". */
export const TYPED_GLYPHS = ["✍️", "?", "✍️", "?", "✍️", "?", "✍️"] as const;

/** The 7 symbols bobbing behind a theme's steps (the stage backdrop), in spot order. */
export const themeGlyphs = (
  key: ThemeSet | null | undefined,
): readonly string[] =>
  THEME_SETS.find((s) => s.key === key)?.glyphs ?? TYPED_GLYPHS;
