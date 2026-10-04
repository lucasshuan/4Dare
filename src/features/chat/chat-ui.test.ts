import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/game/chat";
import {
  countLabel,
  isEmojiOnly,
  lastTextLine,
  newestId,
  unreadSenders,
} from "./chat-ui";

const person = (id: string) => ({
  id,
  isGuest: false,
  name: id,
  guestNumber: 1,
  avatar: { kind: "critter" as const, seed: id, color: "#fff" },
});

const say = (id: number, by: string, text = "hi"): ChatMessage => ({
  id,
  at: id * 1000,
  showAt: id * 1000,
  by,
  author: person(by),
  text,
  system: null,
});

const sys = (id: number): ChatMessage => ({
  id,
  at: id * 1000,
  showAt: id * 1000,
  by: null,
  author: null,
  text: null,
  system: { type: "started" },
});

describe("chat tab rules", () => {
  it("caps the count at 99+", () => {
    expect(countLabel(1)).toBe("1");
    expect(countLabel(99)).toBe("99");
    expect(countLabel(100)).toBe("99+");
  });

  it("finds the newest saved id, ignoring lines on their way", () => {
    expect(newestId([])).toBe(0);
    expect(newestId([say(3, "a"), say(-1, "me"), sys(5)])).toBe(5);
  });

  it("shows the last three distinct unread senders, newest first", () => {
    const lines = [
      say(1, "a"),
      say(2, "b"),
      say(3, "me"),
      sys(4),
      say(5, "c"),
      say(6, "b"),
      say(7, "d"),
    ];
    expect(unreadSenders(lines, 1, "me").map((m) => m.by)).toEqual([
      "d",
      "b",
      "c",
    ]);
    expect(unreadSenders(lines, 7, "me")).toEqual([]);
  });

  it("the phone line follows every player's message, yours included", () => {
    expect(lastTextLine([say(1, "a"), say(2, "me"), sys(3)])?.id).toBe(2);
    expect(lastTextLine([sys(1)])).toBeNull();
  });

  it("draws emoji-only messages big", () => {
    for (const t of ["😂", "👍🏽🎉", " ❤️ ", "🇧🇷", "👨‍👩‍👧"])
      expect(isEmojiOnly(t)).toBe(true);
    for (const t of ["ok 😂", "123", "#", "", "hi", "😂".repeat(30)])
      expect(isEmojiOnly(t)).toBe(false);
  });
});
