"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Ref } from "react";
import { cleanChatText, MAX_CHAT } from "@/game/chat";

/**
 * The message field: a 46 px pill with the send button. Enter sends, the
 * field empties and keeps the focus; the button waits for some text.
 */
export function ChatCompose({
  text,
  onText,
  onSend,
  hint,
  ref,
}: {
  /** In place of the usual placeholder: a word for whoever writes (the presenter's "don't tell"). */
  hint?: string | null;
  text: string;
  onText: (text: string) => void;
  /** False when the text can't go (empty or too long): it stays. */
  onSend: (text: string) => boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const t = useTranslations("chat");
  const empty = cleanChatText(text) === null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (onSend(text)) onText("");
        // the send button took the focus: give it back to the field
        const field = e.currentTarget.elements.namedItem("message");
        if (field instanceof HTMLInputElement) field.focus();
      }}
      className="shrink-0 border-line border-t px-3 pt-2.5 pb-3"
    >
      <div className="flex h-[46px] items-center gap-2 rounded-pill border-[1.5px] border-line-strong pr-1.5 pl-4 transition-colors focus-within:border-sky">
        <input
          ref={ref}
          name="message"
          value={text}
          onChange={(e) => onText(e.target.value)}
          maxLength={MAX_CHAT}
          aria-label={t("inputLabel")}
          placeholder={hint ?? t("placeholder")}
          enterKeyHint="send"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent font-medium text-[14.5px] text-ink placeholder:text-ink-muted focus-visible:outline-none!"
        />
        <button
          type="submit"
          disabled={empty}
          aria-label={t("send")}
          className="grid size-[34px] shrink-0 place-items-center rounded-pill bg-ink text-on-ink transition-opacity disabled:opacity-35"
        >
          <ArrowUp aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
}
