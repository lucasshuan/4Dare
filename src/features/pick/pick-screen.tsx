"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ImageIcon, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/ui/character-card";
import { ImageDrop } from "@/components/ui/image-drop";
import { Portrait } from "@/components/ui/portrait";
import { TextField } from "@/components/ui/text-field";
import { useRoomContext } from "@/features/data/room-context";
import { GameFrame } from "@/features/room/game-header";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { dur, ease, riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import {
  confirmPick,
  createCharacter,
  replaceCharacterImage,
} from "@/server/actions";
import type { CharacterDTO, CharacterSearchResponse } from "@/server/contract";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

const toCard = (c: CharacterDTO) => ({
  characterId: c.id,
  name: c.name,
  origin: c.origin,
  imageUrl: c.imageUrl,
});

type Mode = "search" | "chosen" | "create" | "image";

export function PickScreen() {
  const t = useTranslations("room.pick");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const { view, code, refresh, playerById } = useRoomContext();
  const pick = view.pick;
  const target = playerById(pick?.targetId);
  const { run, pending } = useAction();
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<CharacterDTO | null>(null);
  const [newName, setNewName] = useState("");
  const [origin, setOrigin] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const q = useDebounced(query.trim(), 150);

  const search = useQuery({
    queryKey: ["characters", lang, q],
    queryFn: async () => {
      const res = await fetch(
        `/api/characters?lang=${lang}&q=${encodeURIComponent(q)}`,
      );
      return ((await res.json()) as CharacterSearchResponse).results;
    },
    enabled: !pick?.confirmed,
    staleTime: 60_000,
  });

  if (!pick || !target) return null;
  const targetName = name(target);
  const waiting = view.players.filter((p) => !pick.confirmedIds.includes(p.id));

  const choose = (c: CharacterDTO) => {
    setChosen(c);
    setMode("chosen");
  };
  const confirm = async () => {
    if (chosen && (await run(() => confirmPick(code, chosen.id))).ok)
      await refresh();
  };
  const create = async () => {
    const form = new FormData();
    form.set("name", newName.trim());
    form.set("origin", origin.trim());
    form.set("lang", lang);
    if (image) form.set("image", image, "picture.webp");
    const r = await run(() => createCharacter(form));
    if (r.ok) choose(r.data);
  };
  const changeImage = async (blob: Blob) => {
    if (!chosen) return;
    const form = new FormData();
    form.set("id", chosen.id);
    form.set("image", blob, "picture.webp");
    const r = await run(() => replaceCharacterImage(form));
    if (r.ok) choose(r.data);
  };

  return (
    <GameFrame>
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: dur.reveal, ease: ease.soft },
            }}
            className="flex flex-col gap-2 rounded-xl bg-butter p-8 text-on-butter"
          >
            <span className="font-semibold text-sm uppercase tracking-[0.06em]">
              {t("theme")}
            </span>
            <h1 className="text-balance font-display font-extrabold text-[clamp(48px,7vw,96px)] leading-none tracking-[-0.03em]">
              {view.theme?.[lang]}
            </h1>
          </motion.div>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold text-xl">
              {pick.confirmed
                ? t("doneTitle", { name: targetName })
                : t("title", { name: targetName })}
            </h2>
            <p className="max-w-120 text-ink-muted">
              {t("subtitle", { name: targetName })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="-space-x-1.5 flex">
              {view.players
                .filter((p) => pick.confirmedIds.includes(p.id))
                .map((p) => (
                  <Avatar
                    key={p.id}
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={28}
                    className="ring-2 ring-canvas"
                  />
                ))}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {t("progress", {
                  done: pick.confirmedIds.length,
                  total: pick.total,
                })}
              </span>
              {waiting.length ? (
                <span className="font-medium text-[13px] text-ink-muted">
                  {t("waitingFor", {
                    names: waiting.map((p) => name(p, p.isYou)).join(", "),
                  })}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="flex w-full flex-col gap-3 lg:max-w-120 lg:flex-[1_1_400px]">
          <AnimatePresence mode="wait">
            {pick.confirmed && pick.character ? (
              <motion.div key="done" {...riseIn} className="max-w-90">
                <CharacterCard
                  card={pick.character}
                  label={t("cardLabel", { name: targetName })}
                  layoutId="pick-card"
                />
              </motion.div>
            ) : mode === "chosen" && chosen ? (
              <motion.div
                key="chosen"
                {...riseIn}
                className="flex flex-col gap-4"
              >
                <div className="max-w-90">
                  <CharacterCard
                    card={toCard(chosen)}
                    label={t("cardLabel", { name: targetName })}
                    layoutId="pick-card"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={pending}
                    onClick={confirm}
                  >
                    <Check strokeWidth={2} />
                    {t("confirm")}
                  </Button>
                  <Button disabled={pending} onClick={() => setMode("search")}>
                    {t("change")}
                  </Button>
                  <Button disabled={pending} onClick={() => setMode("image")}>
                    <ImageIcon strokeWidth={1.75} />
                    {t("changeImage")}
                  </Button>
                </div>
                <p className="max-w-110 font-medium text-[13px] text-ink-muted">
                  {t("imageHint", { name: chosen.name })}
                </p>
              </motion.div>
            ) : mode === "image" && chosen ? (
              <motion.div
                key="image"
                {...riseIn}
                className="flex flex-col gap-4"
              >
                <h3 className="font-semibold text-xl">
                  {t("changeImageTitle", { name: chosen.name })}
                </h3>
                <ImageDrop onDone={changeImage} busy={pending} />
                <Button
                  variant="ghost"
                  className="self-start"
                  onClick={() => setMode("chosen")}
                >
                  {t("back")}
                </Button>
              </motion.div>
            ) : mode === "create" ? (
              <motion.form
                key="create"
                {...riseIn}
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <h3 className="font-bold font-display text-3xl">
                  {t("createTitle")}
                </h3>
                <TextField
                  label={t("newName")}
                  value={newName}
                  max={60}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <TextField
                  label={t("newOrigin")}
                  value={origin}
                  max={60}
                  onChange={(e) => setOrigin(e.target.value)}
                />
                <span className="font-semibold text-sm">{t("newImage")}</span>
                <ImageDrop onChange={setImage} />
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={pending || !newName.trim()}
                  >
                    {t("save")}
                  </Button>
                  <Button variant="ghost" onClick={() => setMode("search")}>
                    {t("back")}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="search"
                {...riseIn}
                className="flex flex-col gap-2"
              >
                <label htmlFor="pick-search" className="font-semibold text-sm">
                  {t("searchLabel", { name: targetName })}
                </label>
                <input
                  id="pick-search"
                  value={query}
                  autoComplete="off"
                  maxLength={60}
                  placeholder={t("searchPlaceholder")}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-13 w-full rounded-md border-[1.5px] border-line-strong bg-surface px-4 text-base focus-visible:border-sky"
                />
                <ul className="mt-2 flex flex-col gap-0.5 rounded-lg bg-surface p-2 shadow-pop">
                  <AnimatePresence initial={false}>
                    {(search.data ?? []).map((c) => (
                      <motion.li
                        key={c.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <button
                          type="button"
                          onClick={() => choose(c)}
                          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sky-soft focus-visible:bg-sky-soft"
                        >
                          <Portrait
                            src={c.imageUrl}
                            className="w-12 shrink-0 rounded-sm"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-lg">
                              {c.name}
                            </span>
                            {c.origin ? (
                              <span className="truncate font-medium text-[13px] text-ink-muted">
                                {c.origin}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  <li
                    className={cn(
                      (search.data?.length ?? 0) > 0 &&
                        "mt-1 border-line border-t pt-1",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(query.trim());
                        setMode("create");
                      }}
                      className="flex w-full items-center gap-3 rounded-md p-3 text-left font-semibold text-sky transition-colors hover:bg-sky-soft"
                    >
                      <Plus className="size-5" strokeWidth={1.75} />
                      {query.trim()
                        ? t("createNamed", { name: query.trim() })
                        : t("createNew")}
                    </button>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </GameFrame>
  );
}
