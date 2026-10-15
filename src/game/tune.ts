// Values the control panel can change without a deploy (tunables.ts lists
// them). The code keeps every default in its usual constant; wrapping that
// constant with `tunable()` makes each of its leaves read the panel's value
// first. Two layers decide what a read sees:
// - the site's current values (`setSiteTunes`): the server loads them with
//   the config, the browser gets them from /api/config;
// - a match's own copy (`withTunes` on the server around the engine,
//   `setRoomTunes` in the browser while a room is open), frozen when the match
//   started, so a change in the panel never reaches a match being played.

/** A tunable leaf's value: a number (ms, seconds, points), a switch or a choice. */
export type TuneValue = number | boolean | string;

/** Values by key ("show.title.first"), only those that differ from the code. */
export type Tunes = Readonly<Record<string, TuneValue>>;

let site: Tunes = {};
let room: Tunes | null = null;
let scoped: Tunes | null = null;

const active = (): Tunes => scoped ?? room ?? site;

/** The site's current values (the server after loading the config, the browser from /api/config). */
export function setSiteTunes(tunes: Tunes | null | undefined) {
  site = tunes ?? {};
}

/** The browser, while a room is open: its match's copy; null when it closes. */
export function setRoomTunes(tunes: Tunes | null | undefined) {
  room = tunes ?? null;
}

/**
 * Runs `fn` with a match's copy of the values (the engine, the match record).
 * Synchronous only: the copy is in force for exactly this call.
 */
export function withTunes<T>(tunes: Tunes | null | undefined, fn: () => T): T {
  const before = scoped;
  scoped = tunes ?? {};
  try {
    return fn();
  } finally {
    scoped = before;
  }
}

const isLeaf = (v: unknown): v is TuneValue =>
  typeof v === "number" || typeof v === "boolean" || typeof v === "string";

const proxies = new WeakMap<object, Map<string, object>>();

function wrap<T extends object>(prefix: string, obj: T): T {
  let byPrefix = proxies.get(obj);
  if (!byPrefix) {
    byPrefix = new Map();
    proxies.set(obj, byPrefix);
  }
  const known = byPrefix.get(prefix);
  if (known) return known as T;
  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string") return v;
      const key = `${prefix}.${prop}`;
      if (isLeaf(v)) {
        const o = active()[key];
        return typeof o === typeof v ? o : v;
      }
      if (v && typeof v === "object" && !Array.isArray(v)) return wrap(key, v);
      return v;
    },
  });
  byPrefix.set(prefix, proxy);
  return proxy;
}

/**
 * A constant whose leaves the panel can change: `tunable("show", { title:
 * { first: 9000 } })` reads `show.title.first` from the values in force, and
 * 9000 when there is none (or it has another type). Reads are live: keep the
 * object, never copy a leaf into another constant at load.
 */
export function tunable<T extends object>(prefix: string, obj: T): T {
  return wrap(prefix, obj);
}

/** The code's own value of a tunable leaf, whatever is in force. */
export function defaultOf(root: object, path: string[]): unknown {
  return withTunes({}, () =>
    path.reduce<unknown>(
      (o, k) => (o && typeof o === "object" ? (o as never)[k] : undefined),
      root,
    ),
  );
}
