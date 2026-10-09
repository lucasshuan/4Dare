"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { AnimatePresence, m, useAnimationControls } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { ImageDrop, type ImageDropHandle } from "@/components/ui/image-drop";
import { Portrait } from "@/components/ui/portrait";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import { useSignIn } from "@/features/home/use-sign-in";
import { normalizeName } from "@/game/match";
import { TASTE_KEYS, type Taste } from "@/game/tastes";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { ease } from "@/lib/motion";
import { characterPath } from "@/lib/routes";
import type { LibraryCard } from "@/server/community-contract";
import { newCharacter } from "@/server/library-actions";
import { TasteChip, tasteEmoji, tasteStyle, useTasteName } from "./taste";
import { useLookAlikes, useRefreshCharacter } from "./use-library";

const NAME_MAX = 48;

/**
 * The "new character" form over the list: the name first, with the
 * library's look-alikes under it (the costly mistake is the same character
 * twice), then where they are from, a taste, nicknames and a picture. The
 * card on the left builds itself as it is filled. Guests are asked to sign
 * in first: a new character keeps its author's name.
 */
export function NewCharacter({
  prefill,
  onClose,
  onMade,
}: {
  /** The name to start with; null keeps it closed. */
  prefill: string | null;
  onClose: () => void;
  onMade: (card: LibraryCard) => void;
}) {
  const t = useTranslations("library.create");
  const tCommon = useTranslations("common");
  const { me } = useMe();
  const open = prefill !== null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-300 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-28px)] flex-col overflow-hidden rounded-t-[28px] bg-surface text-ink shadow-pop outline-none transition-[translate,opacity,scale] duration-[440ms] ease-soft data-ending-style:translate-y-full data-starting-style:translate-y-full sm:inset-0 sm:m-auto sm:grid sm:h-[min(640px,calc(100dvh-32px))] sm:w-[min(900px,calc(100vw-32px))] sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:rounded-[28px] sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-y-0 sm:data-ending-style:scale-[0.98] sm:data-starting-style:scale-[0.98] sm:data-ending-style:opacity-0 sm:data-starting-style:opacity-0">
          {me && !me.isGuest && open ? (
            <Form prefill={prefill ?? ""} onClose={onClose} onMade={onMade} />
          ) : (
            <>
              <div className="relative hidden place-items-center bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--line-strong)_35%,transparent)_1px,transparent_1.5px)] bg-[length:18px_18px] bg-sunken sm:grid">
                <PreviewCard name="" origin="" taste={null} picture={null} />
              </div>
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <Dialog.Title className="font-display font-extrabold text-[26px] leading-[1.1] tracking-[-0.015em]">
                    {t("signInTitle")}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label={tCommon("close")}
                    className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken transition-transform duration-150 active:scale-[0.92]"
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </Dialog.Close>
                </div>
                <p className="max-w-[46ch] text-ink-muted">{t("signInHint")}</p>
                <SignInButtons />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SignInButtons() {
  const { signIn, pending } = useSignIn();
  return (
    <div className="flex flex-col gap-2 sm:max-w-xs">
      <AuthButton
        wide
        provider="discord"
        disabled={pending}
        onClick={() => signIn("discord")}
      />
      <AuthButton
        wide
        provider="google"
        disabled={pending}
        onClick={() => signIn("google")}
      />
    </div>
  );
}

const fold = (s: string) => normalizeName(s);

function Form({
  prefill,
  onClose,
  onMade,
}: {
  prefill: string;
  onClose: () => void;
  onMade: (card: LibraryCard) => void;
}) {
  const t = useTranslations("library.create");
  const tCommon = useTranslations("common");
  const lang = useLocale();
  const toast = useToast();
  const router = useRouter();
  const refresh = useRefreshCharacter();
  const { me } = useMe();
  const { run, pending } = useAction();
  const [name, setName] = useState(prefill);
  const [origin, setOrigin] = useState("");
  const [taste, setTaste] = useState<Taste | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [picture, setPicture] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const drop = useRef<ImageDropHandle>(null);
  const nudge = useAnimationControls();
  const alikes = useLookAlikes(name);
  const exact = (alikes.data ?? []).find(
    (c) => fold(c.name) === fold(name) && fold(name).length > 0,
  );

  useEffect(
    () => () => {
      if (picture) URL.revokeObjectURL(picture);
    },
    [picture],
  );
  const wiggle = () =>
    void nudge.start({
      rotate: [-2, 1, -2],
      y: [0, -6, 0],
      transition: { duration: 0.46, ease: ease.soft },
    });

  const addTag = () => {
    const v = tag.replace(/\s+/g, " ").trim();
    if (v.length > 1 && !tags.some((x) => fold(x) === fold(v)))
      setTags((all) => [...all, v].slice(0, 8));
    setTag("");
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tag && tags.length) {
      setTags((all) => all.slice(0, -1));
    }
  };

  const submit = async () => {
    const clean = name.replace(/\s+/g, " ").trim();
    if (clean.length < 2) return setError(t("needName"));
    if (exact) return setError(t("taken"));
    if (!taste) return setError(t("needTaste"));
    setError("");
    const pendingTag = tag.trim();
    const aliases = pendingTag.length > 1 ? [...tags, pendingTag] : tags;
    setSending(true);
    try {
      const made = await run(() =>
        newCharacter({ name: clean, origin, taste, aliases }),
      );
      if (!made.ok) {
        if (made.error === "conflict") setError(t("taken"));
        return;
      }
      const id = made.data;
      let imageUrl: string | null = null;
      const blob = await drop.current?.exportCrop();
      if (blob) {
        const form = new FormData();
        form.set("image", blob, "picture.webp");
        const res = await fetch(
          `/api/characters/${encodeURIComponent(id)}/pictures?lang=${lang}`,
          { method: "POST", body: form },
        ).catch(() => null);
        if (res?.ok) {
          const body = (await res.json()) as {
            picture: { url: string; pending: boolean };
          };
          if (!body.picture.pending) imageUrl = body.picture.url;
        } else toast(t("pictureFailed"));
      }
      refresh(id);
      onMade({
        id,
        name: clean,
        origin: origin.trim() || null,
        imageUrl,
        taste,
        pictures: imageUrl ? 1 : 0,
        by:
          me && !me.isGuest && me.handle
            ? {
                id: me.id,
                handle: me.handle,
                name: me.name ?? me.guestName,
                avatar: me.avatar,
              }
            : null,
      });
      onClose();
      toast(t("made", { name: clean }), {
        action: {
          label: t("openSheet"),
          run: () => router.push(characterPath(id), { scroll: false }),
        },
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="relative flex h-[200px] shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--line-strong)_35%,transparent)_1px,transparent_1.5px)] bg-[length:18px_18px] bg-sunken sm:h-auto sm:p-7">
        <span className="absolute top-4 left-[18px] font-semibold text-[12px] text-ink-muted uppercase tracking-[0.08em]">
          {t("preview")}
        </span>
        <m.div animate={nudge} className="max-sm:scale-[0.52]">
          <PreviewCard
            name={name.trim()}
            origin={origin.trim()}
            taste={taste}
            picture={picture}
          />
        </m.div>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 items-start gap-3 py-5 pr-5 pl-5 sm:pl-7">
          <div>
            <Dialog.Title className="font-display font-extrabold text-[26px] leading-[1.1] tracking-[-0.015em]">
              {t("title")}
            </Dialog.Title>
            <Dialog.Description className="mt-1 max-w-[46ch] text-[14px] text-ink-muted">
              {t("lead")}
            </Dialog.Description>
          </div>
          <Dialog.Close
            aria-label={tCommon("close")}
            className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken transition-transform duration-150 active:scale-[0.92]"
          >
            <X className="size-5" strokeWidth={1.75} />
          </Dialog.Close>
        </div>
        <ScrollArea
          className="flex-1"
          contentClassName="grid auto-rows-max content-start gap-[18px] px-5 pt-1 pb-5 sm:px-7"
        >
          <Field label={t("name")}>
            <input
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePh")}
              autoComplete="off"
              // biome-ignore lint/a11y/noAutofocus: the form opens to be typed in
              autoFocus
              className={INPUT}
            />
          </Field>
          <AnimatePresence initial={false}>
            {alikes.data?.length && name.trim().length >= 2 ? (
              <m.div
                key="alikes"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: ease.soft }}
                className="overflow-hidden"
                aria-live="polite"
              >
                <div
                  className={cn(
                    "grid gap-1.5 rounded-[18px] p-3",
                    exact ? "bg-no-soft" : "bg-sunken",
                  )}
                >
                  <b className="text-[13px]">
                    {exact ? t("exists", { name: exact.name }) : t("similar")}
                  </b>
                  {alikes.data.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 text-[14px]"
                    >
                      <span className="w-[30px] shrink-0 overflow-hidden rounded-[8px]">
                        <Portrait src={c.imageUrl} className="rounded-none" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {c.name}
                        {c.origin ? (
                          <small className="text-ink-muted">
                            {" "}
                            · {c.origin}
                          </small>
                        ) : null}
                      </span>
                      <Link
                        href={characterPath(c.id)}
                        scroll={false}
                        onClick={onClose}
                        className="inline-flex h-9 items-center rounded-pill border border-line-strong bg-surface px-3.5 font-semibold text-[14px] transition-colors hover:bg-sunken"
                      >
                        {t("open")}
                      </Link>
                    </div>
                  ))}
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
          <Field label={t("origin")}>
            <input
              value={origin}
              maxLength={NAME_MAX}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={t("originPh")}
              autoComplete="off"
              className={INPUT}
            />
          </Field>
          <div className="grid gap-2">
            <span className="font-semibold text-[14px]">{t("taste")}</span>
            <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
              <legend className="sr-only">{t("taste")}</legend>
              {TASTE_KEYS.map((k) => (
                <TasteChip
                  key={k}
                  taste={k}
                  on={taste === k}
                  onClick={() => {
                    setTaste(k);
                    wiggle();
                  }}
                />
              ))}
            </fieldset>
          </div>
          <div className="grid gap-2">
            <span className="font-semibold text-[14px]">{t("aliases")}</span>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a click anywhere goes to the input */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: the input itself takes the keys */}
            <div
              onClick={(e) =>
                (
                  e.currentTarget.querySelector("input") as HTMLInputElement
                )?.focus()
              }
              className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-[16px] border border-line-strong bg-surface px-2.5 py-1.5 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]"
            >
              <AnimatePresence initial={false}>
                {tags.map((x, i) => (
                  <m.span
                    key={x}
                    layout
                    initial={{ opacity: 0, scale: 0.86, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.32, ease: ease.soft }}
                    className="inline-flex h-[30px] items-center gap-0.5 rounded-pill bg-sky-soft pl-2.5 font-semibold text-[13px]"
                  >
                    {x}
                    <button
                      type="button"
                      aria-label={t("removeAlias", { name: x })}
                      onClick={() =>
                        setTags((all) => all.filter((_, j) => j !== i))
                      }
                      className="flex size-7 items-center justify-center rounded-pill text-ink-muted hover:text-ink"
                    >
                      <X className="size-3.5" strokeWidth={2} />
                    </button>
                  </m.span>
                ))}
              </AnimatePresence>
              <input
                value={tag}
                maxLength={40}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={onTagKey}
                onBlur={addTag}
                placeholder={t("aliasesPh")}
                aria-label={t("aliases")}
                className="h-8 min-w-[120px] flex-1 bg-transparent outline-none focus-visible:outline-none"
              />
            </div>
            <span className="text-[13px] text-ink-muted">
              {t("aliasesHint")}
            </span>
          </div>
          <div className="grid gap-2">
            <span className="font-semibold text-[14px]">{t("picture")}</span>
            <ImageDrop
              ref={drop}
              onChange={(blob) => {
                setPicture(blob ? URL.createObjectURL(blob) : null);
                if (blob) wiggle();
              }}
            />
            <span className="text-[13px] text-ink-muted">
              {t("pictureHint")}
            </span>
          </div>
          <AnimatePresence>
            {error ? (
              <m.p
                key={error}
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-[13px] text-no"
              >
                {error}
              </m.p>
            ) : null}
          </AnimatePresence>
        </ScrollArea>
        <div className="flex shrink-0 items-center gap-2.5 border-line border-t px-5 py-3.5 sm:pl-7">
          <span className="mr-auto text-[13px] text-ink-muted max-sm:hidden">
            {t("author")}
          </span>
          <Dialog.Close
            render={<Button variant="ghost">{t("cancel")}</Button>}
          />
          <Button type="submit" variant="primary" disabled={pending || sending}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </>
  );
}

const INPUT =
  "h-[46px] w-full rounded-[16px] border border-line-strong bg-surface px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-sky focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)] focus-visible:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the child
    <label className="grid gap-2">
      <span className="font-semibold text-[14px]">{label}</span>
      {children}
    </label>
  );
}

/** The card as it will look: rotated a little, building itself as the form fills. */
function PreviewCard({
  name,
  origin,
  taste,
  picture,
}: {
  name: string;
  origin: string;
  taste: Taste | null;
  picture: string | null;
}) {
  const t = useTranslations("library.create");
  const tasteName = useTasteName();
  return (
    <div className="grid w-[232px] max-w-full -rotate-2 gap-2.5 rounded-[32px] bg-surface p-3 shadow-card">
      <span
        style={tasteStyle(taste)}
        className="block overflow-hidden rounded-[24px] bg-(--taste)"
      >
        <Portrait src={picture} className="rounded-none bg-transparent" />
      </span>
      <span className="grid gap-0.5 px-1.5 pb-1.5">
        <b
          className={cn(
            "font-display font-extrabold text-[22px] leading-[1.1] tracking-[-0.01em] [overflow-wrap:anywhere]",
            !name && "text-ink-muted opacity-70",
          )}
        >
          {name || t("namePreview")}
        </b>
        <small
          className={cn("text-[13px] text-ink-muted", !origin && "opacity-70")}
        >
          {origin || t("originPreview")}
        </small>
        <span
          style={tasteStyle(taste)}
          className={cn(
            "mt-1.5 inline-flex h-6 items-center justify-self-start rounded-pill px-2.5 font-bold text-[12px] transition-colors duration-200",
            taste ? "bg-(--taste) text-on-avatar" : "bg-sunken",
          )}
        >
          {taste
            ? `${tasteEmoji(taste)} ${tasteName(taste)}`
            : t("tastePreview")}
        </span>
      </span>
    </div>
  );
}
