// One shared channel per topic, its join state, and when it goes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Status = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

class FakeChannel {
  ping?: (message: { payload?: unknown }) => void;
  status?: (status: Status) => void;
  on(_type: string, _filter: unknown, ping: FakeChannel["ping"]) {
    this.ping = ping;
    return this;
  }
  subscribe(status: FakeChannel["status"]) {
    this.status = status;
    return this;
  }
}

const opened: FakeChannel[] = [];
const removed: FakeChannel[] = [];

vi.mock("@/config", () => ({ BACKEND: "supabase" }));
vi.mock("./supabase-browser", () => ({
  browserClient: () => ({
    channel: () => {
      const channel = new FakeChannel();
      opened.push(channel);
      return channel;
    },
    removeChannel: async (channel: FakeChannel) => {
      removed.push(channel);
      channel.status?.("CLOSED");
      return "ok";
    },
  }),
}));

let realtime: typeof import("./realtime");

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.resetModules();
  opened.length = 0;
  removed.length = 0;
  realtime = await import("./realtime");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("realtime topics", () => {
  it("shares one channel between the listeners of a topic", () => {
    const a = vi.fn();
    const b = vi.fn();
    realtime.subscribeRoom("ABCD", a);
    realtime.subscribeRoom("ABCD", b);
    realtime.subscribeRoom("WXYZ", vi.fn());
    expect(opened).toHaveLength(2);
    opened[0].ping?.({ payload: { version: 3 } });
    expect(a).toHaveBeenCalledWith({ version: 3 });
    expect(b).toHaveBeenCalledWith({ version: 3 });
  });

  it("tells whether pings can arrive, on join, drop and rejoin", () => {
    const early = vi.fn();
    realtime.subscribeRoom("ABCD", vi.fn(), early);
    const channel = opened[0];
    expect(early).not.toHaveBeenCalled();
    channel.status?.("SUBSCRIBED");
    channel.status?.("CHANNEL_ERROR");
    channel.status?.("SUBSCRIBED");
    expect(early.mock.calls).toEqual([[true], [false], [true]]);
    // joining an already joined channel says so at once
    const late = vi.fn();
    realtime.subscribeRoom("ABCD", vi.fn(), late);
    expect(late.mock.calls).toEqual([[true]]);
  });

  it("keeps the channel a moment after the last listener, then removes it", () => {
    const stop = realtime.subscribeRoom("ABCD", vi.fn());
    stop();
    vi.advanceTimersByTime(1000);
    // back before it went: the same channel
    const again = realtime.subscribeRoom("ABCD", vi.fn());
    vi.advanceTimersByTime(10_000);
    expect(opened).toHaveLength(1);
    expect(removed).toHaveLength(0);
    again();
    vi.advanceTimersByTime(10_000);
    expect(removed).toEqual([opened[0]]);
    // after that, a new one
    realtime.subscribeLobby(vi.fn());
    realtime.subscribeRoom("ABCD", vi.fn());
    expect(opened).toHaveLength(3);
  });

  it("opens a new channel after the server closed the old one", () => {
    const status = vi.fn();
    realtime.subscribeRoom("ABCD", vi.fn(), status);
    opened[0].status?.("SUBSCRIBED");
    opened[0].status?.("CLOSED");
    expect(status).toHaveBeenLastCalledWith(false);
    realtime.subscribeRoom("ABCD", vi.fn());
    expect(opened).toHaveLength(2);
  });
});
